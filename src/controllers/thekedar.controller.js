import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { Thekedar } from "../models/thekedar.model.js";
import { sendEmail, sendToken } from "../utils/utility.js";
import { 
    BAD_REQUEST, 
    CREATED, 
    INTERNAL_SERVER_ERROR, 
    NOT_FOUND, 
    OK, 
    UNAUTHORIZED
} from "../constants.js";
import {cookieOptions} from "../utils/utility.js";

export const register = asyncHandler(async(req, res, next) => {
    const {name, email, password, contactNumber, address, companyName} = req.body;
    
    if([name, email, password, companyName].some(field => field?.trim() === "" || field === undefined || field === null)){
        return next(new ApiError(BAD_REQUEST, "Feels like some fields are missing"));
    }

    let thekedar = await Thekedar.findOne({email});
    if(thekedar){
        return next(new ApiError(BAD_REQUEST, "This email is already taken"));
    }

    thekedar = await Thekedar.create({
        name,
        email,
        password,
        companyName,
        contactNumber,
        address
    });

    const createdThekedar = await Thekedar.findById(thekedar._id).select("-password");
    if(!createdThekedar){
        return next(new ApiError(INTERNAL_SERVER_ERROR, "Something went wrong while registering"));
    }
    sendToken(createdThekedar, CREATED, res, "Account created successfully");
});

export const login = asyncHandler(async (req, res, next) => {
    const {email, password} = req.body;
    if([email, password].some(field => field?.trim() === "" || field === undefined || field === null)){
        return next(new ApiError(BAD_REQUEST, "Feels like some fields are missing"));
    }
    const thekedar = await Thekedar.findOne({email});
    if(!thekedar){
        return next(new ApiError(UNAUTHORIZED, "Invalid email or password"));
    }

    const isPasswordCorrect = await thekedar.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        return next(new ApiError(UNAUTHORIZED, "Your password is incorrect"));
    }

    sendToken(thekedar, OK, res, `Welcome back ${thekedar.name}`);
});

export const logout = asyncHandler(async(req, res, next) => {
    res
        .status(OK)
        .cookie("token", "", {
            ...cookieOptions(),
            expires: new Date(Date.now()),
        })
        .json(new ApiResponse(OK, "Logout success"));
});

export const updateProfile = asyncHandler(async (req, res, next) => {
    const {name, email, contactNumber, address, companyName} = req.body;
    const thekedar = await Thekedar.findById(req.thekedar._id).select("-password");

    if(name){
        thekedar.name = name;
    }
    if(email && email !== thekedar.email){
        const temp = await Thekedar.findOne({email}).select("-password");
        if(temp){
            return next(new ApiError(BAD_REQUEST, "This email is already taken"));
        }
        thekedar.email = email;
    }
    if(contactNumber){
        thekedar.contactNumber = contactNumber;
    }
    if(address){
        thekedar.address = address;
    }
    if(companyName){
        thekedar.companyName = companyName;
    }

    await thekedar.save();
    res.status(OK).json(new ApiResponse(OK, "Your profile has been updated"));
});

export const changePassword = asyncHandler(async (req, res, next) => {
    const {oldPassword, newPassword} = req.body;

    if([oldPassword, newPassword].some(field => field?.trim() === "" || field === undefined || field === null)){
        return next(new ApiError(BAD_REQUEST, "old and new password is required"));
    }
    const thekedar = await Thekedar.findById(req.thekedar._id);
    const isOldPasswordCorrect = await thekedar.isPasswordCorrect(oldPassword);

    if(!isOldPasswordCorrect){
        return next(new ApiError(UNAUTHORIZED, "Your old password is incorrect"));
    }

    thekedar.password = newPassword;

    await thekedar.save();
    res.status(OK).json(new ApiResponse(OK, "Your password has been changed"))
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
    const {email} = req.body;
    const thekedar = await Thekedar.findOne({email});
    if(!thekedar){
        return next(new ApiError(NOT_FOUND, "No user found with this email"));
    }
    const otp = Math.floor(Math.random() * (999999-100000)+100000);
    const otpExpire = 15*60*100;
    thekedar.otp = otp;
    thekedar.otp_expire = new Date(Date.now() + otpExpire);
    await thekedar.save();

    try {
        await sendEmail({
            toEmail:email,
            subject:`${process.env.APP_NAME} Password Recovery Mail`,
            otp,
            heading:"Password Recovery",
            description:"Use the following otp to reset your password"
        });
    } catch (error) {
        thekedar.otp = undefined;
        thekedar.otp_expire - undefined;
        await thekedar.save();
        console.log(error);
        return next(error);
    }
    res.status(OK).json(new ApiResponse(OK, `OTP sent to ${email}`))
});

export const resetPassword = asyncHandler(async(req, res, next) => {
    const {otp, newPassword} = req.body;

    if(newPassword.trim() === "" || newPassword === undefined || newPassword === null){
        return next(new ApiError(BAD_REQUEST, "New password is required to reset your password"));
    }

    const thekedar = await Thekedar.findOne({otp, otp_expire : {$gt : Date.now()}});
    if(!thekedar){
        return next(new ApiError(BAD_REQUEST, "Invalid otp"));
    }

    thekedar.password = newPassword;
    thekedar.otp = undefined;
    thekedar.otp_expire = undefined;

    await thekedar.save();

    res.status(OK).json(new ApiResponse(OK, "Your password is reset, you can login now"));
});

export const loadUser = asyncHandler(async(req, res, next) => {
    res.status(OK).json(new ApiResponse(OK, "Load user success", req.thekedar));
})