import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if user already liked the video
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id,
    });

    if (!existingLike) {
        // Add like
        await Like.create({
            video: videoId,
            likedBy: req.user._id,
        });

        // Get updated likes count
        const likesCount = await Like.countDocuments({ video: videoId });

        return res.status(201).json(
            new ApiResponse(
                201,
                { liked: true, likesCount },
                "Like toggled successfully"
            )
        );
    }

    // Remove like (unlike)
    await Like.deleteOne({ _id: existingLike._id });

    // Get updated likes count
    const likesCount = await Like.countDocuments({ video: videoId });

    return res.status(200).json(
        new ApiResponse(
            200,
            { liked: false, likesCount },
            "Like toggled successfully"
        )
    );
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    });

    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id });

        return res.status(200).json(
            new ApiResponse(200, { liked: false }, "Comment unliked")
        );
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, { liked: true }, "Comment liked")
    );
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    });

    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id });

        return res.status(200).json(
            new ApiResponse(200, { liked: false }, "Tweet unliked")
        );
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, { liked: true }, "Tweet liked")
    );
})

const getLikedVideos = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video"
            }
        },
        { $unwind: "$video" },

        // 🔥 Populate owner inside video
        {
            $lookup: {
                from: "users",
                localField: "video.owner",
                foreignField: "_id",
                as: "video.owner"
            }
        },
        { $unwind: "$video.owner" },

        // ✅ Replace root with video object
        {
            $replaceRoot: { newRoot: "$video" }
        },

        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    avatar: 1
                }
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}