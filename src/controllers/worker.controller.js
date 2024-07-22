import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Worker } from "../models/worker.model.js";
import { MonthlyRecord } from "../models/monthlyRecord.modal.js";
import {
  BAD_REQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../constants.js";
import { Types } from "mongoose";
import { getCurrentNepaliDate } from "../utils/utility.js";

export const createWorker = asyncHandler(async (req, res, next) => {
  const { name, role, contactNumber, wagesPerDay, address } = req.body;

  if (name.trim() === "" || name === undefined || name === null) {
    return next(new ApiError(BAD_REQUEST, "Name of the worker is required"));
  }

  if (!["mistri", "labour", "general"].includes(role)) {
    return next(new ApiError(BAD_REQUEST, "Invalid role of the worker"));
  }

  if (!wagesPerDay || isNaN(Number(wagesPerDay))) {
    return next(new ApiError(BAD_REQUEST, "Wages is required"));
  }

  const { year, monthIndex, dayDate, numberOfDays } = getCurrentNepaliDate();

  const worker = await Worker.create({
    name,
    role,
    thekedarId: req.thekedar._id,
    contactNumber,
    address,
    wagesPerDay: Number(wagesPerDay),
    joiningDate: { year, monthIndex, dayDate },
    currentRecordId: null,
    previousRecordId: null,
  });

  if (!worker) {
    return next(
      new ApiError(
        INTERNAL_SERVER_ERROR,
        "Something went wrong while creating worker"
      )
    );
  }

  const monthlyRecord = await MonthlyRecord.create({
    workerId: worker._id,
    year,
    monthIndex,
    numberOfDays,
  });

  worker.currentRecordId = monthlyRecord._id;
  await worker.save();

  res
    .status(CREATED)
    .json(new ApiResponse(CREATED, "Worker is created", worker));
});

export const getAllWorkers = asyncHandler(async (req, res, next) => {
  const status = req.query.status.trim();
  if (!(status === "false" || status === "true")) {
    return next(new ApiError(BAD_REQUEST, "Invalid status provided"));
  }

  const {dayDate} = getCurrentNepaliDate();

  const workers = await Worker.aggregate([
    {
      $match: {
        $and: [
          { thekedarId: new Types.ObjectId(req.thekedar._id) },
          { isActive: status === "true" },
        ],
      },
    },
    {
      $lookup: {
        from: "monthlyrecords",
        localField: "currentRecordId",
        foreignField: "_id",
        as: "records",
        pipeline: [
          {
            $project: {
              _id: 0,
              numberOfDays: 1,
              lastSettlementDate: {
                $cond: {
                  if: {
                    $eq: [ { $type: "$lastSettlementDate" }, "missing" ],
                  },
                  then: 0,
                  else: "$lastSettlementDate.dayDate",
                },
              },
              highestDayRecord: {
                $reduce: {
                  input: "$dailyRecords",
                  initialValue: 0,
                  in: {
                    $cond: {
                      if: { $gt: ["$$this.dayDate", "$$value"] },
                      then: "$$this.dayDate",
                      else: "$$value",
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        records: {
          $first: "$records",
        },
      },
    },
    {
      $addFields: {
        readyForSettlement: {
          $cond: {
            if: {
              $eq: [
                {
                  $and: [
                    { $gt: [ "$records.highestDayRecord", "$records.lastSettlementDate" ] },
                    { $lt: [ "$records.lastSettlementDate", dayDate ] },
                  ],
                },
                true,
              ],
            },
            then: true,
            else: false,
          },
        },
        markedToday:{
          $cond:{
            if: { $lt: [ "$records.highestDayRecord", dayDate ] }, 
            then: false, 
            else: true
          }
        }
      },
    },
    {
      $project: {
        name: 1,
        role: 1,
        wagesPerDay: 1,
        readyForSettlement: 1,
        records: 1,
        currentRecordId: 1,
        previousRecordId: 1,
        markedToday: 1
      },
    },
  ]);
  res.status(OK).json(new ApiResponse(OK, "Get worker success", workers));
});

//this is handled by the updateWorker api
export const updateWages = asyncHandler(async (req, res, next) => {
  const { wages, workerId } = req.body;

  if (!wages || isNaN(Number(wages))) {
    return next(new ApiError(BAD_REQUEST, "Wages of the worker is required"));
  }
  if (workerId.trim() === "" || workerId === undefined || workerId === null) {
    return next(new ApiError(BAD_REQUEST, "Invalid worker id"));
  }

  const worker = await Worker.findOne({
    _id: workerId,
    thekedarId: req.thekedar._id,
  });
  if (!worker) {
    return next(new ApiError(NOT_FOUND, "Worker not found"));
  }

  worker.wagesPerDay = Number(wages);
  await worker.save();

  res.status(OK).json(new ApiResponse(OK, "Wages is updated"));
});

//this is handled by the updateWorker api
export const updateRole = asyncHandler(async (req, res, next) => {
  const role = req.body.role.trim();
  const workerId = req.body.workerId.trim();

  if (!["mistri", "general", "labour"].includes(role)) {
    return next(new ApiError(BAD_REQUEST, "Invalid role provided"));
  }

  if (workerId.trim() === "" || workerId === undefined || workerId === null) {
    return next(new ApiError(BAD_REQUEST, "Invalid worker id"));
  }

  const worker = await Worker.findOne({
    _id: workerId,
    thekedarId: req.thekedar._id,
  });
  if (!worker) {
    return next(new ApiError(NOT_FOUND, "Worker not found"));
  }

  worker.role = role;
  await worker.save();

  res.status(OK).json(new ApiResponse(OK, "Role is updated"));
});

export const toggleActiveStatus = asyncHandler(async (req, res, next) => {
  const workerId = req.body.workerId.trim();
  const activeStatus = req.body.activeStatus;

  if (typeof activeStatus !== "boolean") {
    return next(new ApiError(BAD_REQUEST, "Invalid status"));
  }

  if (workerId.trim() === "" || workerId === undefined || workerId === null) {
    return next(new ApiError(BAD_REQUEST, "Invalid worker id"));
  }

  const worker = await Worker.findOne({
    thekedarId: req.thekedar._id,
    _id: workerId,
  });
  if (!worker) {
    return next(new ApiError(NOT_FOUND, "Worker not found "));
  }

  if (worker.isActive === activeStatus) {
    return next(new ApiError(BAD_REQUEST, "Worker is already active"));
  }

  if (worker.currentRecordId) {
    worker.previousRecordId = worker.currentRecordId;
  }

  worker.currentRecordId = null;
  worker.isActive = activeStatus;
  await worker.save();

  res.status(OK).json(new ApiResponse(OK, "Active status is updated"));
});

export const updateWorker = asyncHandler(async (req, res, next) => {
  const { name, contactNumber, address, role, wagesPerDay } = req.body;
  const workerId = req.params?.workerId?.trim();

  const worker = await Worker.findOne({
    _id: workerId,
    thekedarId: req.thekedar._id,
  });

  if (!worker) {
    return next(new ApiError(NOT_FOUND, "Worker not found"));
  }

  if (name) {
    worker.name = name.trim();
  }

  if (contactNumber) {
    worker.contactNumber = contactNumber.trim();
  }

  if (address) {
    worker.address = address.trim();
  }

  if (role) {
    const roleTemp = role.trim();
    if (!["mistri", "labour", "general"].includes(roleTemp)) {
      return next(new ApiError(BAD_REQUEST, "Invalid role or the worker"));
    }
    worker.role = roleTemp;
  }

  if (wagesPerDay) {
    if (isNaN(wagesPerDay)) {
      return next(new ApiError(BAD_REQUEST, "Invalid wages provided"));
    }
    worker.wagesPerDay = Number(wagesPerDay);
  }

  await worker.save();

  res.status(OK).json(new ApiResponse(OK, "Worker is updated"));
});

export const getWokerDetails = asyncHandler(async (req, res, next) => {
  const workerId = req.params?.workerId.trim();

  const worker = await Worker.aggregate([
    {
      $match: {
        $and: [
          {
            _id: new Types.ObjectId(workerId),
          },
          {
            thekedarId: new Types.ObjectId(req.thekedar?._id),
          },
        ],
      },
    },
    {
      $lookup: {
        from: "monthlyrecords",
        localField: "currentRecordId",
        foreignField: "_id",
        as: "monthRecord",
        pipeline: [
          {
            $project: {
              prevWages: 1,
              currentWages: 1,
              prevAdvance: 1,
              currentAdvance: 1,
              lastSettlementDate: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        monthRecord: {
          $first: "$monthRecord",
        },
      },
    },
    {
      $project: {
        thekedarId: 0,
        currentRecordId: 0,
      },
    },
  ]);

  if (worker.length === 0) {
    return next(new ApiError(NOT_FOUND, "Worker not found"));
  }

  res
    .status(OK)
    .json(new ApiResponse(OK, "Get worker details success", worker[0]));
});

const deleteOneWorker = async (workerId, thekedarId) => {
  try {
    const worker = await Worker.findOne({
      _id: workerId,
      thekedarId,
    });

    if (!worker) {
      return Promise.reject("Worker not found for deletion");
    }

    await MonthlyRecord.deleteMany({ workerId: worker._id });
    await worker.deleteOne();
    return {
      message: "deleted",
      workerId,
    };
  } catch (error) {
    let message = error.message;
    if (error.name === "CastError" && error.kind === "ObjectId") {
      message = "Invalid worker id provided for deletion";
    }
    return Promise.reject(message);
  }
};
export const deleteWorkerMultiple = asyncHandler(async (req, res, next) => {
  const workerIds = req.body?.workerIds;
  if (!workerIds || workerIds.length === 0) {
    return next(new ApiError(BAD_REQUEST, "No worker ids provided"));
  }
  const batch = [];
  const temp = [];
  for (let i = 0; i < workerIds.length; i++) {
    temp.push(workerIds[i]);
    if (temp.length === 10 || i === workerIds.length - 1) {
      batch.push([...temp]);
      temp.length = 0;
    }
  }

  const response = [];
  for (let i = 0; i < batch.length; i++) {
    if (batch[i].length > 0) {
      const promises = batch[i].map((workerId) =>
        deleteOneWorker(workerId, req.thekedar._id)
      );
      const results = await Promise.allSettled(promises);
      response.push(...results);
    }
  }

  res
    .status(OK)
    .json(new ApiResponse(OK, "Worker delete operation success", response));
});

//handled by getWorkers
export const getWorkerForAttendance = asyncHandler(async (req, res, next) => {
  const dayDate = getCurrentNepaliDate().dayDate;
  const workers = await Worker.aggregate([
    {
      $match: {
        $and: [
          { thekedarId: new Types.ObjectId(req.thekedar?._id) },
          { isActive: true },
        ],
      },
    },
    {
      $lookup: {
        from: "monthlyrecords",
        localField: "currentRecordId",
        foreignField: "_id",
        as: "records",
        pipeline: [
          {
            $project: {
              dailyRecords: 1,
              _id: 0,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        records: {
          $first: "$records",
        },
      },
    },
    {
      $match: {
        $expr: {
          $eq: [
            {
              $size: {
                $ifNull: [
                  {
                    $filter: {
                      input: "$records.dailyRecords",
                      cond: {
                        $gte: ["$$this.dayDate", dayDate],
                      },
                    },
                  },
                  ["ok"],
                ],
              },
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        records: 0,
        isActive: 0,
        thekedarId: 0,
        joiningDate: 0,
        address: 0,
        contactNumber: 0,
      },
    },
  ]);

  res.status(OK).json(new ApiResponse(OK, "Get worker success", workers));
});
