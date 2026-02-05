import jwt from "jsonwebtoken";  // <---- THIS IS MISSING
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    const token =
      req.cookies?.accessToken ||
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null);


    if (!token) {
      console.log("No token found — guest user");
      return next();
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id).select("-password -refreshToken");

    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    console.log("optionalAuth error:", error.message);
    next();
  }
});
