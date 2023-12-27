import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {MonthlyRecord} from "../models/monthlyRecord.modal.js";
import {Worker} from "../models/worker.model.js";
import { 
    BAD_REQUEST, 
    CREATED, 
    INTERNAL_SERVER_ERROR, 
    NOT_FOUND, 
    OK, 
    DAYS 
} from "../constants.js";
import NepaliDate from "nepali-date-converter";
import { calculateAmounts } from "../utils/utility.js";

export const createMonthlyRecord = asyncHandler(async(req, res, next) => {
    const {
        workerId,
        year,
        monthIndex,
        numberOfDays,
        prevWages,
        prevAdvance
    } = req.body;

    const worker = await Worker.findById(workerId);
    if(!worker){
        return next(new ApiError(NOT_FOUND, "Worker not found for record creation"));
    }

    if([year, monthIndex, numberOfDays].some(field => field === "" || isNaN(field))){
        return next(new ApiError(BAD_REQUEST, "Invalid date or days provided"));
    }

    let monthlyRecord = await MonthlyRecord.findOne({workerId, year, monthIndex});
    if(monthlyRecord){
        return next(new ApiError(BAD_REQUEST, "Monthly record is already created for this month"));
    }

    if(Number(numberOfDays) < 29 && Number(numberOfDays) > 32){
        return next(new ApiError(BAD_REQUEST, "Total days in month can only be in between (29 - 32)"));
    }

    const currDate = new NepaliDate(new Date(Date.now()));

    if(year > currDate.getYear() || monthIndex > currDate.getMonth()){
        return next(new ApiError(BAD_REQUEST, "The given date is invalid"));
    }

    // commented this because i just want to store the date in which there is any activities
    // const dailyRecords = [];
    // for(let i = 1; i <= Number(numberOfDays); i++){
    //     const date = new NepaliDate(year, monthIndex, i);
    //     const dayAndDate = date.format("ddd D").split(" ");
    //     dailyRecords.push({
    //         day:dayAndDate[0].toLowerCase(),
    //         dayDate:Number(dayAndDate[1])
    //     });
    // }

    const records = { workerId, year, monthIndex, numberOfDays };

    if(prevWages){
        if(isNaN(prevWages)){
            return next(new ApiError(BAD_REQUEST, "Invalid previous wages provided"));
        }
        records["prevWages"] = Number(prevWages);
    }

    if(prevAdvance){
        if(isNaN(prevAdvance)){
            return next(new ApiError(BAD_REQUEST, "Invalid previous advance provided"));
        }
        records["prevAdvance"] = Number(prevAdvance);
    }

    monthlyRecord = await MonthlyRecord.create(records);
    if(!monthlyRecord){
        return next(new ApiError(INTERNAL_SERVER_ERROR, "Something went wrong while creating monthly record"));
    }

    res.status(CREATED).json(new ApiResponse(CREATED, "Record is created", monthlyRecord));
});

export const addAttendence = asyncHandler(async(req, res, next) => {
    const {
        dayDate, 
        presence,
        wagesOfDay,
        advanceAmount,
        purposeOfAdvance
    } = req.body;

    const recordId = req.params?.recordId;
    let monthlyRecord = await MonthlyRecord.findById(recordId);
    if(!monthlyRecord){
        return next(new ApiError(NOT_FOUND, "Monthly record not found for attendence"));
    }

    if([dayDate, wagesOfDay].some(field => field === "" || isNaN(field))){
        return next(new ApiError(BAD_REQUEST, "Feels like some fields are invalid"));
    }

    if(!["half", "present", "absent", "one-and-half"].includes(presence.trim())){
        return next(new ApiError(BAD_REQUEST, "Invalid presence provided"));
    }

    //for future checking
    let currDate = new NepaliDate(new Date(Date.now()));
    if(dayDate > currDate.getDate()){
        return next(new ApiError(BAD_REQUEST, "Date cannot be of future date"));
    }

    //check for already done 
    let isExist = monthlyRecord.dailyRecords.findIndex(rec => rec.dayDate === Number(dayDate));
    if(isExist !== -1){
        return next(new ApiError(BAD_REQUEST, "Invalid date fiven for attendence"));
    }

    //for getting exact name of day
    currDate = new NepaliDate(monthlyRecord.year, monthlyRecord.monthIndex, dayDate);
    let record = {
        presence:presence.trim(),
        wagesOfDay:Number(wagesOfDay),
        dayDate:Number(dayDate),
        day:DAYS[currDate.getDay()]
    }

    let advance = {};
    if(advanceAmount){
        if(isNaN(advanceAmount)){
            return next(new ApiError(BAD_REQUEST, "Invalid advance amount provided"));
        }
        advance["amount"] = Number(advanceAmount);
        advance["purpose"] = purposeOfAdvance?.trim() || "General Work";
        monthlyRecord.currentAdvance += Number(advanceAmount);
    }
    record = {...record, advance};

    monthlyRecord.dailyRecords.push(record);
    monthlyRecord.currentWages += Number(wagesOfDay);
    monthlyRecord = await monthlyRecord.save();

    res.status(OK).json(new ApiResponse(OK, "Attendence done successfully", monthlyRecord));
});

export const updateAttendence = asyncHandler(async(req, res, next) => {
    const {
        dayDate,
        presence,
        wagesOfDay,
        advanceAmount,
        advancePurpose
    } = req.body;
    const recordId = req.params?.recordId;
    const monthlyRecord = await MonthlyRecord.findById(recordId);

    if(!monthlyRecord){
        return next(new ApiError(NOT_FOUND, "Record not found for updation"));
    }

    const record = monthlyRecord.dailyRecords.find(rec => rec.dayDate === Number(dayDate));
    if(!record){
        return next(new ApiError(NOT_FOUND, `Attendence not found for ${monthlyRecord.year}-${monthlyRecord.monthIndex+1}-${dayDate}`));
    }

    if(presence){
        if(!["half", "present", "absent", "one-and-half"].includes(presence.trim())){
            return next(new ApiError(BAD_REQUEST, "Invalid presence provided for updation"));
        }
        record.presence = presence.trim();
    }

    if(wagesOfDay || wagesOfDay === Number(0)){
        if(isNaN(wagesOfDay)){
            return next(new ApiError(BAD_REQUEST, "Invalid wages of the day given for updation"));
        }
        monthlyRecord.currentWages = (monthlyRecord.currentWages - record.wagesOfDay) + Number(wagesOfDay);
        record.wagesOfDay = Number(wagesOfDay);
    }

    if(advanceAmount || advanceAmount === Number(0)){
        if(isNaN(advanceAmount)){
            return next(new ApiError(BAD_REQUEST, "Invalid advance amount given for updation"));
        }

        let toAdd = 0
        if(record.advance?.amount){
            toAdd = Number(advanceAmount) - record.advance.amount;
        }else{
            toAdd = Number(advanceAmount);
        }
        monthlyRecord.currentAdvance = monthlyRecord.currentAdvance + toAdd;
        record["advance"] = {
            amount : Number(advanceAmount),
            purpose: advancePurpose?.trim() || "General Work"
        }
    }
    monthlyRecord.dailyRecords = monthlyRecord.dailyRecords.filter(rec => rec._id.toString() !== record._id.toString());
    monthlyRecord.dailyRecords.push(record);

    await monthlyRecord.save();

    res.status(OK).json(new ApiResponse(
        OK,
        "Attendence updated successfully",
        monthlyRecord.dailyRecords
    ));
});

export const deleteAttendence = asyncHandler(async(req, res, next) => {
    const recordId = req.params?.recordId;
    const {dayDate} = req.body;

    if(dayDate === "" || isNaN(dayDate)){
        return next(new ApiError(BAD_REQUEST, "Invalid date provided for record deletion"));
    }

    const monthlyRecord = await MonthlyRecord.findById(recordId);
    if(!monthlyRecord){
        return next(new ApiError(NOT_FOUND, "Monthly record not found"));
    }

    const record = monthlyRecord.dailyRecords.find(rec => rec.dayDate === Number(dayDate));
    if(!record){
        return next(new ApiError(NOT_FOUND, `No record found for ${monthlyRecord.year}-${monthlyRecord.monthIndex+1}-${Number(dayDate)}`));
    }
    
    if(record.wagesOfDay > 0){
        monthlyRecord.currentWages -= record.wagesOfDay;
    }

    if(record.advance?.amount > 0){
        monthlyRecord.currentAdvance -= record.advance.amount;
    }
    monthlyRecord.dailyRecords = monthlyRecord.dailyRecords.filter(rec => rec._id.toString() !== record._id.toString());
    await monthlyRecord.save();

    res.status(OK).json(new ApiResponse(OK, "Record deleted successfully", monthlyRecord.dailyRecords));
});

export const getMonthlyRecord = asyncHandler(async(req, res, next) => {
    const recordId = req.params?.recordId;
    const monthlyRecord = await MonthlyRecord.findById(recordId);

    if(!monthlyRecord){
        return next(new ApiError(NOT_FOUND, "No record found"));
    }
    res.status(OK).json(new ApiResponse(OK, "Get record success", monthlyRecord));
});

export const getAllRecordsOfYear = asyncHandler(async(req, res, next) => {
    const workerId = req.query?.workerId?.trim();
    const year = req.query?.year;

    if(!workerId || !year || isNaN(year)){
        return next(new ApiError(BAD_REQUEST, "Invalid date or workerId given"));
    }

    const records = await MonthlyRecord.find({workerId, year}).select("-dailyRecords -settlements");

    res.status(OK).json(new ApiResponse(OK, "All records get success", records));
});

export const settleAccount = asyncHandler(async(req, res, next) => {
    let {recordId, dayDate} = req.body;
    if(!recordId || typeof recordId !== "string"){
        return next(new ApiError(BAD_REQUEST, "Record id id required to do settlements"));
    }
    const monthlyRecord = await MonthlyRecord.findById(recordId);
    const lastSettlementDate = monthlyRecord.lastSettlementDate?.dayDate || 0;

    if(!dayDate || isNaN(dayDate)){
        return next(new ApiError(BAD_REQUEST, "Date is required for settlement"));
    }

    dayDate = Number(dayDate);
    if(!(dayDate <= monthlyRecord.numberOfDays && dayDate > lastSettlementDate)){
        return next(new ApiError(BAD_REQUEST, "Invalid date given for settlement"));
    }

    const prevWages = monthlyRecord.prevWages || 0;
    const prevAdvance = monthlyRecord.prevAdvance || 0;
    const {currentWages, currentAdvance} = calculateAmounts(monthlyRecord.dailyRecords, lastSettlementDate, dayDate);
    const amount = (prevWages + currentWages) - (prevAdvance + currentAdvance);

    let settlement = {dayDate};
    let response = {prevWages, prevAdvance, currentWages, currentAdvance};
    if(amount >= 0){
        settlement = {
            ...settlement,
            wagesOccured:amount,
            wagesTransferred:amount
        }
        response["wagesOccured"] = amount;
        monthlyRecord.prevWages = amount;
    }else{
        settlement = {
            ...settlement,
            advanceOccured:Math.abs(amount),
            advanceTransferred:Math.abs(amount)
        }
        response["advanceOccured"] = Math.abs(amount);
        monthlyRecord.prevAdvance = Math.abs(amount);
    }

    let newLastSettlementDate = {dayDate}
    const dayIndex = new NepaliDate(monthlyRecord.year, monthlyRecord.monthIndex, dayDate).getDay();
    newLastSettlementDate["dayName"] = DAYS[dayIndex];

    monthlyRecord.settlements.push(settlement);
    monthlyRecord["lastSettlementDate"] = newLastSettlementDate;
    monthlyRecord.currentWages = monthlyRecord.currentWages - currentWages;
    monthlyRecord.currentAdvance = monthlyRecord.currentAdvance - currentAdvance;

    await monthlyRecord.save();

    res.status(OK).json(new ApiResponse(
        OK,
        "Settlement done successfully",
        response
    ));
});