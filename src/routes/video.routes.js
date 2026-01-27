import { Router } from "express";
import { getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus, 
    getPublicVideos} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { searchVideos } from "../controllers/video.controller.js";

const router = Router()



router.get("/users/:userId", verifyJWT, getAllVideos);
router.route("/publishvideos").post(upload.fields([
    {
        name:"videoFile",
        maxCount:1
    },
    {
        name:"thumbnail",
        maxCount:1
    }
]),verifyJWT,publishAVideo);


router.route("/get-video/:videoId").get(getVideoById);
router.route("/update-video/:videoId").patch(
    upload.fields([
        { name: "thumbnail", maxCount: 1 }
    ]),
    verifyJWT,updateVideo
);
router.route("/delete-video/:videoId").post(verifyJWT,deleteVideo);
router.route("/toggle-status/:videoId").post(verifyJWT,togglePublishStatus);
router.route("/videos").get(getPublicVideos);
router.get("/search", searchVideos);

export default router