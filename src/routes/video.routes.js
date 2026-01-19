import { Router } from "express";
import { getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router()


router.use(verifyJWT);

router.route("/publishvideos").post(upload.fields([
    {
        name:"videoFile",
        maxCount:1
    },
    {
        name:"thumbnail",
        maxCount:1
    }
]),publishAVideo);


router.route("/get-video/:videoId").get(getVideoById);
router.route("/update-video/:videoId").patch(
    upload.fields([
        { name: "thumbnail", maxCount: 1 }
    ]),
    updateVideo
);
router.route("/delete-video/:videoId").post(verifyJWT,deleteVideo);
router.route("/toggle-status/:videoId").post(verifyJWT,togglePublishStatus);


export default router