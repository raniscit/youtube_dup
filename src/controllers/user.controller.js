import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import { deleteFromCloudinary } from "../utils/deleteFileOnCloud.js";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found while generating tokens");
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation-not empty  ( extra email format checking)
    //check if user already existed:from username,email
    //check for images,check for avatar
    //upload on cloudinary: get response nd then reponse url
    //create user object-create entry in db
    //remove password and refresh token field from response
    //check user is created or not
    //return res

    const { username, fullname, email, password } = req.body;
    // console.log("Req body ",req.body);

    console.log(email);

    if (fullname === "") {
        throw new ApiError(400, "fullname is required")
    }
    if (username === "") {
        throw new ApiError(400, "usernamme is required")
    }
    if (email === "") {
        throw new ApiError(400, "email is required")
    }
    if (password === "") {
        throw new ApiError(400, "password is required")
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already existed")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    // console.log("Req files ", req.files);



    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatarResponse = await uploadOnCloudinary(avatarLocalPath)

    if (!avatarResponse) {
        throw new ApiError(400, "Avatar file is required for db")
    }

    let coverResponse = null;
    if (coverImageLocalPath) {
        coverResponse = await uploadOnCloudinary(coverImageLocalPath);
    }

    let createdUser = await User.create({
        fullname,
        avatar: avatarResponse.url,
        coverImage: coverResponse?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const finalUser = await User.findById(createdUser._id).select(
        "-password -refreshToken"
    );

    if (!finalUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, finalUser, "User registered successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    //req body - data
    //username or email
    //find user - email id validation
    //password validation
    //acess and refresh token generate

    const { email, username, password } = req.body;


    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    if (!password) {
        throw new ApiError(400, "Password is required")
    }



    const findUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!findUser) {
        throw new ApiError(404, "User is not registered")
    }

    const isPasValid = await findUser.isPasswordCorrect(password)

    if (!isPasValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(findUser._id)

    const logedinUser = await User.findById(findUser._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: logedinUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})



const logoutUser = asyncHandler(async (req, res) => {    //if res not used then _ can be used instead of that
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const userRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    console.log("Refresh Token Received:", userRefreshToken);

    if (!userRefreshToken) {
        throw new ApiError(401, "Unauthorised acces");
    }

    try {
        const decodedRefreshToken = jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedRefreshToken._id);
        if (!user) {
            throw new ApiError(401, "Invalid refreshToken");
        }

        if (userRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used by another");
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }

        const {
            accessToken: newaccessToken,
            refreshToken: newrefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", newaccessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new ApiResponse(200, { accessToken: newaccessToken, refreshToken: newrefreshToken }, "Access token is refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confPassword } = req.body;

    const user = await User.findById(req.user?._id)
    const isPasValid = await user.isPasswordCorrect(oldPassword)
    if (!isPasValid) {
        throw new ApiError(400, "Password is incorrect")
    }
    if (newPassword !== confPassword) {
        throw new ApiError(400, "New password and confirm password do not match")
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed successfully")
        )

})

const getcurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched successfully")
        )

});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body
    if (!fullname && !email) {
        throw new ApiError(400, "Atleast one field is required to update")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname,
                email
            }
        },
        { new: true } 
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "User details updated successfully")
        )

})



const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const cloudAvatar = await uploadOnCloudinary(avatarLocalPath)

    if (!cloudAvatar?.url) {
        throw new ApiError(400, "Error while uploading avatar on cloudinary")
    }

    if (req.user.avatar) {
        const publicId = req.user.avatar
            .split("/")
            .pop()
            .split(".")[0]; // extract public_id

        await deleteFromCloudinary(publicId);
    }

    req.user.avatar = cloudAvatar.url;
    await req.user.save({ validateBeforeSave: false });


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { avatar: req.user.avatar },
                "Avatar updated successfully"
            )
        );
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage file is missing")
    }

    const cloudAvatar = await uploadOnCloudinary(coverImageLocalPath)

    if (!cloudAvatar?.url) {
        throw new ApiError(400, "Error while uploading coverImage on cloudinary")
    }

    if (req.user.coverImage) {
        const publicId = req.user.coverImage
            .split("/")
            .pop()
            .split(".")[0]; // extract public_id

        await deleteFromCloudinary(publicId);
    }

    req.user.coverImage = cloudAvatar.url;
    await req.user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { coverImage: req.user.coverImage },
                "CoverImage updated successfully"
            )
        );
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    console.log(channel);


    if(!channel?.length){
        throw new ApiError(404,"Channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"Fetched Data Successfully")
    )
})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "video",
                localField:"watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully")
    )
})
export {getWatchHistory, getUserChannelProfile, registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getcurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage }