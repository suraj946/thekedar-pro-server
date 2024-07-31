import { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from "../constants.js";
import { Payment } from "../models/payment.model.js";
import { Site } from "../models/site.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCurrentNepaliDate } from "../utils/utility.js";

export const createPayment = asyncHandler(async (req, res, next) => {
  const { amount, siteId, description, bitNumber } = req.body;
  let date = req.body.date;
  if (!siteId?.trim()) {
    return next(new ApiError(BAD_REQUEST, "Site Id is required"));
  }
  if (!amount || isNaN(amount)) {
    return next(new ApiError(BAD_REQUEST, "Amount is required or invalid"));
  }
  if (!date?.trim()) {
    return next(new ApiError(BAD_REQUEST, "Date is required"));
  } 
  const {dayIndex} = getCurrentNepaliDate(date);
  date = `${date}-${dayIndex}`;

  const site = await Site.findOne({
    _id: siteId,
    thekedarId: req.thekedar._id,
  });
  if (!site) {
    return next(new ApiError(NOT_FOUND, "Site not found"));
  }
  const data = {
    thekedarId: req.thekedar._id,
    siteId,
    amount: Number(amount),
    date,
    description,
  }
  if(bitNumber) data["bitNumber"] = bitNumber;
  const payment = await Payment.create(data);

  if (!payment) {
    return next(
      new ApiError(
        INTERNAL_SERVER_ERROR,
        "Something went wrong while creating payment"
      )
    );
  }

  res
    .status(CREATED)
    .json(new ApiResponse(CREATED, "Payment created successfully", payment));
});

export const editPayment = asyncHandler(async (req, res, next) => {
  const { amount, description, bitNumber } = req.body;
  let date = req.body.date;
  const paymentId = req.params?.paymentId?.trim();
  if (!paymentId) {
    return next(new ApiError(BAD_REQUEST, "Payment Id is required"));
  }
  const payment = await Payment.findOne({
    _id: paymentId,
    thekedarId: req.thekedar._id,
  });
  if (!payment) {
    return next(new ApiError(NOT_FOUND, "Payment not found"));
  }

  if (amount) {
    if (isNaN(amount)) {
      return next(new ApiError(BAD_REQUEST, "Invalid amount for payment"));
    }
    payment.amount = Number(amount);
  }
  if (bitNumber || bitNumber === 0) {
    if (isNaN(bitNumber)) {
      return next(new ApiError(BAD_REQUEST, "Invalid bit number for payment"));
    }
    payment.bitNumber = Number(bitNumber);
  }
  if (date?.trim()) {
    const {dayIndex} = getCurrentNepaliDate(date);
    date = `${date}-${dayIndex}`;
    payment.date = date;
  }
  if (description?.trim()) {
    payment.description = description;
  }
  await payment.save();
  res
    .status(OK)
    .json(new ApiResponse(OK, "Payment updated successfully", payment));
});

export const deletePayment = asyncHandler(async (req, res, next) => {
  const paymentId = req.params?.paymentId?.trim();
  if (!paymentId) {
    return next(new ApiError(BAD_REQUEST, "Payment Id is required"));
  }
  const response = await Payment.findOneAndDelete({
    _id: paymentId,
    thekedarId: req.thekedar._id,
  });
  if (!response) {
    return next(new ApiError(NOT_FOUND, "Payment not found or already deleted"));
  }
  res.status(OK).json(new ApiResponse(OK, "Payment deleted successfully"));
});
