import { Router } from "express";
import { getChannelStats, getChannelVideos } from "../controllers/channel.controller.js"; // adjust path if needed
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/channels/:channelId/stats", getChannelStats);

router.get("/channels/:channelId/videos", getChannelVideos);

export default router;
