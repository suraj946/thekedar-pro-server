import { Types } from "mongoose";
import {
  BAD_REQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../constants.js";
import { Payment } from "../models/payment.model.js";
import { Site } from "../models/site.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createSite = asyncHandler(async (req, res, next) => {
  const { siteName, address } = req.body;
  if (!siteName?.trim() || !address?.trim()) {
    return next(new ApiError(BAD_REQUEST, "All fields are required"));
  }

  const site = await Site.create({
    siteName,
    address,
    thekedarId: req.thekedar._id,
  });

  if (!site) {
    return next(
      new ApiError(
        INTERNAL_SERVER_ERROR,
        "Something went wrong while creating site"
      )
    );
  }

  res
    .status(CREATED)
    .json(new ApiResponse(CREATED, "Site created successfully", {
      _id: site._id,
      siteName: site.siteName,
      address: site.address,
    }));
});

export const editSite = asyncHandler(async (req, res, next) => {
  const { siteName, address } = req.body;
  const siteId = req.params?.siteId?.trim();
  if (!siteId) {
    return next(new ApiError(BAD_REQUEST, "Site Id is required"));
  }

  let site = await Site.findOne({ _id: siteId, thekedarId: req.thekedar._id });
  if (!site) {
    return next(new ApiError(NOT_FOUND, "Site not found"));
  }

  if (siteName?.trim()) {
    site.siteName = siteName;
  }
  if (address?.trim()) {
    site.address = address;
  }

  await site.save();
  res.status(OK).json(new ApiResponse(OK, "Site updated successfully", site));
});

export const getSites = asyncHandler(async (req, res, next) => {
  const sites = await Site.find({ thekedarId: req.thekedar._id }).sort({
    createdAt: -1,
  }).select("-createdAt -thekedarId -updateAt");
  res.status(OK).json(new ApiResponse(OK, "Sites fetched successfully", sites));
});

export const getSingleSite = asyncHandler(async (req, res, next) => {
  const siteId = req.params?.siteId?.trim();
  if (!siteId) {
    return next(new ApiError(BAD_REQUEST, "Site Id is required"));
  }

  const response = await Site.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(siteId),
        thekedarId: new Types.ObjectId(req.thekedar._id),
      }
    },
    {
      $lookup: {
        from: "payments", 
        localField: "_id", 
        foreignField: "siteId",
        as: "payments",
        pipeline:[
          {
            $project:{
              // createdAt:0,
              updatedAt:0,
              thekedarId:0,
              siteId:0
            }
          },
          {
            $sort:{createdAt:-1}
          }
        ]
      }
    },
    {
      $addFields: {
        totalPayments: { $sum: "$payments.amount" }
      }
    },
  ]);
  if (response.length === 0) {
    return next(new ApiError(NOT_FOUND, "Site not found"));
  }
  res
    .status(OK)
    .json(new ApiResponse(OK, "Site fetched successfully", response[0]));
});

export const deleteSite = asyncHandler(async (req, res, next) => {
  const siteId = req.params?.siteId?.trim();
  const deletePayments = req.query?.deletePayments?.trim();
  if (!siteId) {
    return next(new ApiError(BAD_REQUEST, "Site Id is required"));
  }

  const site = await Site.findOne({
    _id: siteId,
    thekedarId: req.thekedar._id,
  });
  if (!site) {
    return next(new ApiError(NOT_FOUND, "Site not found"));
  }

  if (deletePayments === "true") {
    await Payment.deleteMany({
      siteId: site._id,
      thekedarId: req.thekedar._id,
    });
  }

  const { deletedCount } = await Site.deleteOne({
    _id: siteId,
    thekedarId: req.thekedar._id,
  });
  if (deletedCount === 0) {
    return next(
      new ApiError(
        INTERNAL_SERVER_ERROR,
        "Something went wrong while deleting site"
      )
    );
  }
  res.status(OK).json(new ApiResponse(OK, "Site deleted successfully"));
});
