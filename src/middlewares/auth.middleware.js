import { BAD_REQUEST, UNAUTHORIZED } from "../constants.js";
import { Thekedar } from "../models/thekedar.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const authenticate = asyncHandler(async(req, res, next)=>{
    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];
    if(!token){
        return next(new ApiError(UNAUTHORIZED, "Please login to access this resources"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const thekedar = await Thekedar.findById(decoded._id).select("-password");
    if(!thekedar){
        return next(new ApiError(BAD_REQUEST, "Invalid token provided"));
    }
    req.thekedar = thekedar;
    next();
});