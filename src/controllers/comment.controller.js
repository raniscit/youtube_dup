import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        {
            $project: {     //$project works cleanly with objects, not arrays, so unwind is used as $lookup return arrray
                content: 1,
                createdAt: 1,
                "owner.username": 1,
                "owner.avatar": 1
            }
        }
    ]);

     return res.status(200).json(
        new ApiResponse(200, comments, "Comments fetched successfully")
    );

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { content } = req.body;
    const {videoId} = req.params;


    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment text is empty");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    });


    return res
        .status(200)
        .json(
            new ApiResponse(200, comment, "Successfully added comment")
        )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { content } = req.body;
    const { commentId } = req.params;


    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment text is empty");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() != req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this comment");

    }

    comment.content = content;
    await comment.save();


    return res
        .status(200)
        .json(
            new ApiResponse(200, comment, "Comment updated successfully")
        )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: req.user._id
    });

    if (!deletedComment) {
        throw new ApiError(404, "Comment not found or unauthorized");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Comment deleted successfully")
    );
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}