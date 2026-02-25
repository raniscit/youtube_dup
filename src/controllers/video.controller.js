import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Like } from "../models/like.model.js"
import { User } from "../models/user.model.js"
import { deleteFromCloudinary } from "../utils/deleteFileOnCloud.js"

const getPublicVideos = asyncHandler(async (req, res) => {
    const videos = await Video.find({
        isPublished: true
    })
        .populate("owner", "username avatar")
        .sort({ createdAt: -1 }) // or random
        .limit(20);

    return res
        .status(200)
        .json(
            new ApiResponse(200, videos, "Successfully fetched public videos")
        )
});


const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc" } = req.query;
    const { userId } = req.params;

    page = parseInt(page);
    limit = parseInt(limit);
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const matchStage = {};

    if (query) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }

    if (userId) {
        if (!mongoose.isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    // Allowed sorting fields for safety
    const allowedSortFields = ["createdAt", "views", "title"];
    if (!allowedSortFields.includes(sortBy)) {
        sortBy = "createdAt";
    }

    const sortOrder = sortType.toLowerCase() === "asc" ? 1 : -1;

    const aggregationPipeline = [
        { $match: matchStage },
        { $sort: { [sortBy]: sortOrder } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
    ];

    // To get total count ignoring pagination:
    const countPipeline = [{ $match: matchStage }, { $count: "total" }];

    // Run both pipelines in parallel
    const [videos, countResult] = await Promise.all([
        Video.aggregate(aggregationPipeline),
        Video.aggregate(countPipeline),
    ]);

    const totalVideos = countResult[0]?.total || 0;

    return res.status(200).json(
        new ApiResponse(200, {
            total: totalVideos,
            page,
            limit,
            videos,
        }, "Videos fetched successfully")
    );
});

const incrementView = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },  // increment by 1
        { new: true }
    );

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(
        new ApiResponse(200, { views: video.views }, "View incremented")
    );
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    if (!title || !description) {
        throw new ApiError(400, "Title and description both are required");
    }

    const videoFile = req.files?.videoFile?.[0]?.path;

    if (!videoFile) {
        throw new ApiError(400, "Video file is required")
    }

    const videoUpload = await uploadOnCloudinary(videoFile);

    if (!videoUpload) {
        throw new ApiError(500, "Something went wrong while uploading video on cloudinary")
    }


    const thumbnail = req.files?.thumbnail?.[0]?.path;

    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail file is required")
    }

    const thumbnailUpload = await uploadOnCloudinary(thumbnail);

    if (!thumbnailUpload) {
        throw new ApiError(500, "Something went wrong while uploading thumbnail file on cloudinary")
    }

    const video = await Video.create({
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        title,
        description,
        duration: videoUpload.duration,
        isPublished: true,
        owner: req.user._id
    })

    return res.status(201).json(new ApiResponse(201, video, "Video published successfully"));

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId)
        .populate("owner", "_id username avatar");

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // ✅ Add to watch history (ONLY if user is logged in)
    if (req.user) {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $addToSet: { watchHistory: video._id } // prevents duplicates
            }
        );
    }

    // ✅ READ likes from Like collection (SOURCE OF TRUTH)
    const likesCount = await Like.countDocuments({ video: videoId });

    let isLikedByUser = false;

    if (req.user) {
        const liked = await Like.findOne({
            video: videoId,
            likedBy: req.user._id,
        });

        isLikedByUser = !!liked;
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                _id: video._id,
                title: video.title,
                description: video.description,
                videoFile: video.videoFile,
                owner: {
                    _id: video.owner._id,
                    username: video.owner.username,
                    avatar: video.owner.avatar,
                },
                likesCount,
                isLikedByUser,
            },
            "Video fetched successfully"
        )
    );
});


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video");
    }

    if (!title && !description && !req.files?.thumbnail) {
        throw new ApiError(400, "Atleast one field is required")
    }

    const updateFields = {};

    // Update text fields
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;

    // Update thumbnail (optional)
    if (req.files?.thumbnail?.[0]?.path) {
        const thumbnailPath = req.files.thumbnail[0].path;

        const thumbnailUpload = await uploadOnCloudinary(thumbnailPath);
        if (!thumbnailUpload) {
            throw new ApiError(500, "Thumbnail upload failed");
        }

        updateFields.thumbnail = thumbnailUpload.url;
    }


    const updatedData = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updateFields
        },
        { new: true }
    )

    return res.status(200).json(new ApiResponse(200, updatedData, "Video updated successfully"));

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // 🔐 Only owner can delete
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video");
    }

    // 🧹 Delete video file from Cloudinary
    if (video.videoFile) {
        const publicId = video.videoFile
            .split("/")
            .pop()
            .split(".")[0];

        await deleteFromCloudinary(publicId, "video");
    }

    // 🧹 Delete thumbnail if exists
    if (video.thumbnail) {
        const thumbPublicId = video.thumbnail
            .split("/")
            .pop()
            .split(".")[0];

        await deleteFromCloudinary(thumbPublicId);
    }

    // 🧹 Remove video from all users' watchHistory
    await User.updateMany(
        { watchHistory: video._id },
        { $pull: { watchHistory: video._id } }
    );

    // 🧹 Delete related likes
    await Like.deleteMany({ video: video._id });

    // 🧹 Delete video document
    await video.deleteOne();

    return res.status(200).json(
        new ApiResponse(200, {}, "Video deleted successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to change publish status.");
    }

    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });
    return res
        .status(200)
        .json(
            new ApiResponse(200, { isPublished: video.isPublished }, "Publish status successfully toggled")
        )
})


const searchVideos = asyncHandler(async (req, res) => {
    const { q } = req.query;

    // 🔹 Trim and validate query
    const searchQuery = q?.trim();

    if (!searchQuery) {
        return res.status(200).json(
            new ApiResponse(200, [], "No search query provided")
        );
    }

    const videos = await Video.find(
        {
            $text: { $search: searchQuery },
            isPublished: true
        },
        {
            score: { $meta: "textScore" }
        }
    )
        .sort({
            score: { $meta: "textScore" },
            views: -1
        })
        .limit(20)
        .populate({
            path: "owner",
            select: "username avatar"
        })
        .select("title description thumbnail duration views owner");

    return res.status(200).json(
        new ApiResponse(200, videos, "Search results fetched successfully")
    );
});



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getPublicVideos,
    searchVideos,
    incrementView
}