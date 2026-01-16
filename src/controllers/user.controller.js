import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


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
        .json(new ApiResponse(200,{},"User logged out successfully"))
})

export { registerUser, loginUser, logoutUser }