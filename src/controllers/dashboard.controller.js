import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const { channelId } = req.params;

    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    // Total videos by channel
    const totalVideos = await Video.countDocuments({ owner: channelId });

    // Total video views (sum)
    const videoViewsAgg = await Video.aggregate([
        {
            $match: {
                owner: mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalViews: {
                    $sum: "$views"
                }
            }
        }
    ]);
    const totalViews = videoViewsAgg[0]?.totalViews || 0;

    // Total subscribers to channel
    const totalSubscribers = await Subscription.countDocuments({ channel: channelId });

    // Total likes on channel videos
    // First get video IDs by channel
    const videos = await Video.find({ owner: channelId }, { _id: 1 });
    const videoIds = videos.map(v => v._id);

    const totalLikes = await Like.countDocuments({ video: { $in: videoIds } });

    const stats = {
        totalVideos,
        totalViews,
        totalSubscribers,
        totalLikes
    };

    return res.status(200).json(
        new ApiResponse(200, stats, "Channel stats fetched successfully")
    );
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const { channelId } = req.params;

    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    const videos = await Video.find({ owner: channelId }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, videos, "Channel videos fetched successfully")
    );
})

export {
    getChannelStats,
    getChannelVideos
}