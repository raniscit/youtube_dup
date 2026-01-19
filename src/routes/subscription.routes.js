import { Router } from "express";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/toggleSubscription:/channelId").post(verifyJWT,toggleSubscription)
router.route("/get-subscriber:/channelId").get(getUserChannelSubscribers)
router.route("/get-channel").get(verifyJWT,getSubscribedChannels)

export default router