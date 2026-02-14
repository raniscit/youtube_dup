import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription

    const subscriberId = req.user._id;
    if (subscriberId.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    });

    if (existingSubscription) {
        await Subscription.deleteOne({ _id: existingSubscription._id });

        return res.status(200).json(
            new ApiResponse(
                200,
                { subscribed: false },
                "Unsubscribed successfully"
            )
        );
    }

    // Else → subscribe
    const subscription = await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            { subscribed: true },
            "Subscribed successfully"
        )
    );

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    const SubscriberList = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "Subscriber"
            }
        },
        {
            $unwind: "$Subscriber"
        },
        {
            $project: {
                "Subscriber.username": 1,
                "Subscriber.fullname": 1,
                "Subscriber.avatar": 1,
                channel: 1,
                createdAt: 1,
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, SubscriberList, "Subscribers fetched successfully")
        );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId = req.user._id;

    const channelList = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
            },
        },
        {
            $unwind: "$channel",
        },
        {
            $project: {
                "channel._id": 1,
                "channel.username": 1,
                "channel.fullname": 1,
                "channel.avatar": 1,
                createdAt: 1,
            },
        }

    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, channelList, "Channel fetched successfully"));
});

// Get subscriber count of a channel
const getSubscriberCount = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const count = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(200, { subscriberCount: count }, "Subscriber count fetched successfully")
  );
});



export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
    getSubscriberCount
}