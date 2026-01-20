import { Router } from "express";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()


router.use(verifyJWT);

router.route("/create-playlist").post(createPlaylist);
router.route("/get-playlists/:userId").get(getUserPlaylists);
router.route("/get-playlist/:playlistId").get(getPlaylistById);
router.route("/add-video/:playlistId/:videoId").post(addVideoToPlaylist);
router.route("/remove-video/:playlistId/:videoId").post(removeVideoFromPlaylist);
router.route("/delete-playlist/:playlistId").post(deletePlaylist);
router.route("/update-playlist/:playlistId").patch(updatePlaylist);

export default router