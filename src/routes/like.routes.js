import { Router } from "express";
import { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()


router.use(verifyJWT);

router.route("/togglelike-video/:videoId").post(toggleVideoLike);
router.route("/togglelike-comment/:commentId").post(toggleCommentLike);
router.route("/togglelike-tweet/:tweetId").post(toggleTweetLike);
router.route("/likedvideos").get(getLikedVideos);

export default router