import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    console.log("Create playlist hit at:", new Date().toISOString());

    if (!name || !description) {
        throw new ApiError(400, "Name and description both fields are required");
    }

    const playlistData = await Playlist.create({
        name,
        description,
        owner: req.user._id,
        videos: []
    });

    return res.status(201).json(
        new ApiResponse(201, playlistData, "Playlist created successfully")
    );
});


const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const playlists = await Playlist.find({ owner: userId })
        .populate({
            path: "videos",
            select: "thumbnail title"
        })
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, playlists, "Playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.findById(playlistId)
        .populate({
            path: "videos",
            select: "title thumbnail videoUrl duration"
        })
        .populate({
            path: "owner",
            select: "username avatar"
        });

    if (!playlist) {
        throw new ApiError(404, "Playlist does not exist");
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to modify this playlist");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (playlist.videos.some(v => v.toString() === videoId)) {
        throw new ApiError(409, "Video already exists in playlist");
    }

    playlist.videos.push(videoId);
    await playlist.save();

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video added to playlist successfully")
    );

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to modify this playlist");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!playlist.videos.some(v => v.toString() === videoId)) {
        throw new ApiError(409, "Video does not exists in playlist");
    }

    playlist.videos.pull(videoId);
    await playlist.save();

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video deleted from playlist successfully")
    );


})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.findOneAndDelete({
        _id: playlistId,
        owner: req.user._id
    });

    if (!playlist) {
        throw new ApiError(404, "Playlist not found or not authorized");
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist deleted successfully")
    );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    console.log("Playlist ID:", playlistId);
    console.log("Logged in user:", req.user._id);

    const updatedData = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: req.user._id },
        { $set: updateData },
        { new: true }
    );


    if (!updatedData) {
        throw new ApiError(404, "Playlist not found or not authorized");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedData, "Playlist updated successfully")
    );

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}