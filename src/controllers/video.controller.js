import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

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
    const { videoId } = req.params
    //TODO: get video by id

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video fetched successfully")
        )
})

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
    const { videoId } = req.params
    //TODO: delete video

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video");
    }

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(
        new ApiResponse(200, video, "Video deleted successfully")
    );
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video");
    }

    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });
    return res
        .status(200)
        .json(
            new ApiResponse(200,  {isPublished: video.isPublished }, "Publish status successfully toggled")
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}