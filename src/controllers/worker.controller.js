import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {Worker} from "../models/worker.model.js";
import {MonthlyRecord} from "../models/monthlyRecord.modal.js";
import NepaliDate from "nepali-date-converter";
import {
    BAD_REQUEST,
    CREATED,
    INTERNAL_SERVER_ERROR,
    NOT_FOUND,
    OK
} from "../constants.js";

export const createWorker = asyncHandler(async(req, res, next) => {
    const {name, role, contactNumber, wagesPerDay, address, joiningDate} = req.body;

    if(name.trim() === "" || name === undefined || name === null){
        return next(new ApiError(BAD_REQUEST, "Name of the worker is required"));
    }

    if(!(["mistri", "labour", "general"].includes(role))){
        return next(new ApiError(BAD_REQUEST, "Invalid role of the worker"));
    }

    if(!wagesPerDay || isNaN(Number(wagesPerDay))){
        return next(new ApiError(BAD_REQUEST, "Wages is required"));
    }

    const dateGiven = new NepaliDate(joiningDate.year, joiningDate.monthIndex, joiningDate.dayDate);
    const currentDate = new NepaliDate(new Date(Date.now()));

    if((dateGiven.getYear() > currentDate.getYear()) || (dateGiven.getMonth() > currentDate.getMonth()) || (dateGiven.getDate() > currentDate.getDate())){
        return next(new ApiError(BAD_REQUEST, "Invalid date provided"));
    }

    const worker = await Worker.create({
        name,
        role,
        thekedarId:req.thekedar._id,
        contactNumber,
        address,
        wagesPerDay:Number(wagesPerDay),
        joiningDate
    });

    if(!worker){
        return next(new ApiError(INTERNAL_SERVER_ERROR, "Something went wrong while creating worker"));
    }

    res.status(CREATED).json(new ApiResponse(CREATED, "Worker is created", worker));
});

export const getAllWorkers = asyncHandler(async(req, res, next) => {
    const status = req.query.status.trim();
    if(!(status === "false" || status === "true")){
        return next(new ApiError(BAD_REQUEST, "Invalid status provided"));
    }
    const workers = await Worker.find({thekedarId:req.thekedar._id, isActive:status === "true"}).select("name role wagesPerDay");
    res.status(OK).json(new ApiResponse(OK, "Get worker success", workers));
})

export const updateWages = asyncHandler(async(req, res, next) => {
    const {wages, workerId} = req.body;

    if(!wages || isNaN(Number(wages))){
        return next(new ApiError(BAD_REQUEST, "Wages of the worker is required"));
    }
    if(workerId.trim() === "" || workerId === undefined || workerId === null){
        return next(new ApiError(BAD_REQUEST, "Invalid worker id"));
    }

    const worker = await Worker.findOne({_id : workerId, thekedarId : req.thekedar._id});
    if(!worker){
        return next(new ApiError(NOT_FOUND, "Worker not found"))
    }

    worker.wagesPerDay = Number(wages);
    await worker.save();

    res.status(OK).json(new ApiResponse(OK, "Wages is updated"));
});

export const updateRole = asyncHandler(async(req, res, next) => {
    const role = req.body.role.trim();
    const workerId = req.body.workerId.trim();

    if(!["mistri", "general", "labour"].includes(role)){
        return next(new ApiError(BAD_REQUEST, "Invalid role provided"));
    }

    if(workerId.trim() === "" || workerId === undefined || workerId === null){
        return next(new ApiError(BAD_REQUEST, "Invalid worker id"));
    }

    const worker = await Worker.findOne({_id : workerId, thekedarId : req.thekedar._id});
    if(!worker){
        return next(new ApiError(NOT_FOUND, "Worker not found"))
    }

    worker.role = role;
    await worker.save();

    res.status(OK).json(new ApiResponse(OK, "Role is updated"));
});

export const toggleActiveStatus = asyncHandler(async(req, res, next) => {
    const workerId = req.body.workerId.trim();
    const activeStatus = req.body.activeStatus;

    if(typeof activeStatus !== "boolean"){
        return next(new ApiError(BAD_REQUEST, "Invalid status"));
    }

    if(workerId.trim() === "" || workerId === undefined || workerId === null){
        return next(new ApiError(BAD_REQUEST, "Invalid worker id"));
    }

    const worker = await Worker.findOne({thekedarId:req.thekedar._id, _id:workerId});
    if(!worker){
        return next(new ApiError(NOT_FOUND, "Worker not found "));
    }

    worker.isActive = activeStatus;
    await worker.save();

    res.status(OK).json(new ApiResponse(OK, "Active status is updated"));
});

export const updateWorker = asyncHandler(async(req, res, next) => {
    const {name, contactNumber, address, role, wagesPerDay} = req.body;
    const workerId = req.params?.workerId.trim();

    const worker = await Worker.findOne({_id:workerId, thekedarId:req.thekedar._id});

    if(!worker){
        return next(new ApiError(NOT_FOUND, "Worker not found"));
    }

    if(name){
        worker.name = name.trim();
    }

    if(contactNumber){
        worker.contactNumber = contactNumber.trim();
    }

    if(address){
        worker.address = address.trim();
    }

    if(role){
        const roleTemp = role.trim();
        if(!["mistri", "labour", "general"].includes(roleTemp)){
            return next(new ApiError(BAD_REQUEST, "Invalid role or the worker"))
        }
        worker.role = roleTemp;
    }

    if(wagesPerDay){
        if(isNaN(wagesPerDay)){
            return next(new ApiError(BAD_REQUEST, "Invalid wages provided"))
        }
        worker.wagesPerDay = Number(wagesPerDay);
    }

    await worker.save();

    res.status(OK).json(new ApiResponse(OK, "Worker is updated", worker));
});

export const getWokerDetails = asyncHandler(async(req, res, next) => {
    const workerId = req.params?.workerId.trim();

    const worker = await Worker.findOne({_id:workerId, thekedarId:req.thekedar._id});
    if(!worker){
        return next(new ApiError(NOT_FOUND, "Worker not found"));
    }

    const {year, month} = new NepaliDate(new Date(Date.now())).getBS();
    const currentMonthRecord = await MonthlyRecord.findOne({workerId:worker._id, year, monthIndex:month});

    res.status(OK).json(new ApiResponse(
        OK,
        "Get worker details success",
        {worker, currentMonthRecord}
    ));
});

export const deleteWorker = asyncHandler(async(req, res, next) => {
    const workerId = req.params?.workerId.trim();
    const worker = await Worker.findOne({_id:workerId, thekedarId:req.thekedar._id});

    if(!worker){
        return next(new ApiError(NOT_FOUND, "Worker not found"));
    }

    try {
        await MonthlyRecord.deleteMany({workerId:worker._id});
        await worker.deleteOne();
        return res.status(OK).json(new ApiResponse(OK, "Worker deleted successfully"))
    } catch (error) {
        console.log(error);
        return next(new ApiError(INTERNAL_SERVER_ERROR, "Something went wrong while deleting the worker"));
    }
    // TODO : Test this api after creating monthly record
})
