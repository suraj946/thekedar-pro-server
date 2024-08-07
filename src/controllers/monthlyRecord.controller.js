import { Types } from "mongoose";
import {
  BAD_REQUEST,
  CREATED,
  DAYS,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../constants.js";
import { MonthlyRecord } from "../models/monthlyRecord.modal.js";
import { Worker } from "../models/worker.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateAmounts, getCurrentNepaliDate } from "../utils/utility.js";

const settlePreviousMonth = async (prevRecord) => {
  try {
    // const prevRecord = await MonthlyRecord.findById(recordId);
    // if (!prevRecord) throw new ApiError(404, "Record not found for settlement");
    const lastSettlementDate = prevRecord.lastSettlementDate?.dayDate || 0;
    if (lastSettlementDate === prevRecord.numberOfDays) {
      return {
        prevWages: prevRecord.prevWages,
        prevAdvance: prevRecord.prevAdvance,
        response: prevRecord.settlements.filter(
          (s) => s.dayDate === lastSettlementDate
        )[0],
      };
    }

    const prevWages = prevRecord.prevWages || 0;
    const prevAdvance = prevRecord.prevAdvance || 0;
    const currentWages = prevRecord.currentWages;
    const currentAdvance = prevRecord.currentAdvance;
    const amount = prevWages + currentWages - (prevAdvance + currentAdvance);
    let settlement = { dayDate: prevRecord.numberOfDays };

    if (amount > 0) {
      settlement = {
        ...settlement,
        wagesOccured: amount,
        wagesTransferred: amount,
      };
      prevRecord.prevWages = amount;
      prevRecord.prevAdvance = 0;
    } else if (amount < 0) {
      settlement = {
        ...settlement,
        advanceOccured: Math.abs(amount),
        advanceTransferred: Math.abs(amount),
      };
      prevRecord.prevAdvance = Math.abs(amount);
      prevRecord.prevWages = 0;
    } else {
      prevRecord.prevWages = 0;
      prevRecord.prevAdvance = 0;
    }

    const { dayDate, dayIndex } = getCurrentNepaliDate();
    let newLastSettlementDate = {
      dayDate: settlement.dayDate,
      performedOn: dayDate,
    };
    newLastSettlementDate["dayName"] = DAYS[dayIndex];

    prevRecord.settlements.push(settlement);
    prevRecord["lastSettlementDate"] = newLastSettlementDate;
    prevRecord.currentWages = 0;
    prevRecord.currentAdvance = 0;
    await prevRecord.save();

    return {
      prevWages: prevRecord.prevWages,
      prevAdvance: prevRecord.prevAdvance,
      response: settlement,
    };
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Something went wrong");
  }
};

export const createMonthlyRecord = asyncHandler(async (req, res, next) => {
  const { workerId } = req.body;
  const { year, monthIndex, numberOfDays } = getCurrentNepaliDate();

  const worker = await Worker.findById(workerId);
  if (!worker) {
    return next(
      new ApiError(NOT_FOUND, "Worker not found for record creation")
    );
  }

  if (worker.currentRecordId) {
    return next(
      new ApiError(
        BAD_REQUEST,
        "Monthly record is already created for this month"
      )
    );
  }

  let records = { workerId, year, monthIndex, numberOfDays };
  let settlementResponse = {};
  let monthlyRecord;

  if (!worker.previousRecordId) {
    monthlyRecord = await MonthlyRecord.create(records);
  }

  if (worker.previousRecordId) {
    const prevRecord = await MonthlyRecord.findById(worker.previousRecordId);
    if (!prevRecord) throw new ApiError(404, "Record not found for settlement");

    if (prevRecord.year === year && prevRecord.monthIndex === monthIndex) {
      monthlyRecord = prevRecord;
    } else {
      const { prevWages, prevAdvance, response } = await settlePreviousMonth(
        prevRecord
      );
      records = { ...records, prevWages, prevAdvance };
      settlementResponse = response;

      monthlyRecord = await MonthlyRecord.create(records);
    }
  }

  if (!monthlyRecord) {
    return next(
      new ApiError(
        INTERNAL_SERVER_ERROR,
        "Something went wrong while creating monthly record"
      )
    );
  }

  //to update worker current month record id
  await Worker.findByIdAndUpdate(workerId, {
    $set: {
      currentRecordId: monthlyRecord._id,
      previousRecordId: null,
    },
  });

  res
    .status(CREATED)
    .json(
      new ApiResponse(CREATED, "Record is created", { settlementResponse })
    );
});

export const addAttendanceForLeftDays = asyncHandler(async (req, res, next) => {
  const { dayDate, presence, wagesOfDay, advanceAmount, purposeOfAdvance } =
    req.body;

  const recordId = req.params?.recordId;
  let monthlyRecord = await MonthlyRecord.findById(recordId);
  if (!monthlyRecord) {
    return next(
      new ApiError(NOT_FOUND, "Monthly record not found for attendence")
    );
  }

  if ([dayDate, wagesOfDay].some((field) => field === "" || isNaN(field))) {
    return next(
      new ApiError(BAD_REQUEST, "Feels like some fields are invalid")
    );
  }

  if (
    !["half", "present", "absent", "one-and-half"].includes(presence.trim())
  ) {
    return next(new ApiError(BAD_REQUEST, "Invalid presence provided"));
  }

  //for future checking
  let currDate = getCurrentNepaliDate();
  const lastSettlementDate = monthlyRecord.lastSettlementDate?.dayDate || 0;
  if (dayDate > currDate.dayDate || dayDate <= lastSettlementDate) {
    return next(
      new ApiError(BAD_REQUEST, "Invalid day date provided for attendance")
    );
  }

  //check for already done
  let isExist = monthlyRecord.dailyRecords.findIndex(
    (rec) => rec.dayDate === Number(dayDate)
  );
  if (isExist !== -1) {
    return next(
      new ApiError(BAD_REQUEST, "Attendance already done for this day")
    );
  }

  //for getting exact name of day
  currDate = getCurrentNepaliDate(
    `${monthlyRecord.year}-${monthlyRecord.monthIndex + 1}-${dayDate}`
  );
  let record = {
    presence: presence.trim(),
    wagesOfDay: Number(wagesOfDay),
    dayDate: Number(dayDate),
    day: DAYS[currDate.dayIndex],
  };

  let advance = {};
  if (advanceAmount) {
    if (isNaN(advanceAmount)) {
      return next(new ApiError(BAD_REQUEST, "Invalid advance amount provided"));
    }
    advance["amount"] = Number(advanceAmount);
    advance["purpose"] = purposeOfAdvance?.trim() || "General Work";
    monthlyRecord.currentAdvance += Number(advanceAmount);
  }
  record = { ...record, advance };

  monthlyRecord.dailyRecords.push(record);
  monthlyRecord.currentWages += Number(wagesOfDay);
  monthlyRecord = await monthlyRecord.save();

  res
    .status(OK)
    .json(new ApiResponse(OK, "Attendence done successfully", record));
});

const addAttendenceSingle = async (
  workersData,
  presence,
  dayDate,
  dayIndex
) => {
  try {
    const {
      wagesOfDay,
      advanceAmount,
      purposeOfAdvance,
      recordId,
      workerName,
      workerId,
    } = workersData;
    let monthlyRecord = await MonthlyRecord.findById(recordId);
    if (!monthlyRecord) {
      return Promise.reject(`Monthly record not found for ${workerName}`);
    }

    if (wagesOfDay === "" || isNaN(wagesOfDay)) {
      return Promise.reject(`Invalid daily wages provided for ${workerName}`);
    }

    //check for already done
    let isExist = monthlyRecord.dailyRecords.findIndex(
      (rec) => rec.dayDate === Number(dayDate)
    );
    if (isExist !== -1) {
      return Promise.reject(
        `Attendance for ${workerName} has already been done`
      );
    }

    let record = {
      presence: presence.trim(),
      wagesOfDay: Number(wagesOfDay),
      dayDate: Number(dayDate),
      day: DAYS[dayIndex],
    };

    let advance = {};
    if (advanceAmount) {
      if (isNaN(advanceAmount)) {
        return Promise.reject(`Invalid advance amount given for ${workerName}`);
      }
      advance["amount"] = Number(advanceAmount);
      advance["purpose"] = purposeOfAdvance?.trim() || "General Work";
      monthlyRecord.currentAdvance += Number(advanceAmount);
    }
    record = { ...record, advance };

    monthlyRecord.dailyRecords.push(record);
    monthlyRecord.currentWages += Number(wagesOfDay);
    monthlyRecord = await monthlyRecord.save();

    return {
      workerId,
      isDone: true,
    };
  } catch (error) {
    return Promise.reject(error.message);
  }
};

export const createAttendance = asyncHandler(async (req, res, next) => {
  const { workersData, presence } = req.body;

  if (
    !["half", "present", "absent", "one-and-half"].includes(presence.trim())
  ) {
    return next(new ApiError(BAD_REQUEST, "Invalid presence provided"));
  }

  let { dayDate, dayIndex } = getCurrentNepaliDate();

  const batch = [];
  const temp = [];
  for (let i = 0; i < workersData.length; i++) {
    temp.push(workersData[i]);
    if (temp.length === 10 || i === workersData.length - 1) {
      batch.push([...temp]);
      temp.length = 0;
    }
  }

  const response = [];
  for (let i = 0; i < batch.length; i++) {
    if (batch[i].length > 0) {
      const promises = batch[i].map((wd) =>
        addAttendenceSingle(wd, presence, dayDate, dayIndex)
      );
      const results = await Promise.allSettled(promises);
      response.push(...results);
    }
  }

  res
    .status(OK)
    .json(new ApiResponse(OK, "Attendance operation completed", response));
});

export const updateAttendence = asyncHandler(async (req, res, next) => {
  const { dayDate, presence, wagesOfDay, advanceAmount, advancePurpose } =
    req.body;
  const recordId = req.params?.recordId;
  const monthlyRecord = await MonthlyRecord.findById(recordId);

  if (!monthlyRecord) {
    return next(new ApiError(NOT_FOUND, "Record not found for updation"));
  }

  const lastSettlementDate = monthlyRecord.lastSettlementDate?.dayDate || 0;
  const { monthIndex } = getCurrentNepaliDate();

  if (
    dayDate <= lastSettlementDate ||
    monthIndex !== monthlyRecord.monthIndex
  ) {
    return next(new ApiError(BAD_REQUEST, "Invalid day date for updation"));
  }

  const record = monthlyRecord.dailyRecords.find(
    (rec) => rec.dayDate === Number(dayDate)
  );
  if (!record) {
    return next(
      new ApiError(
        NOT_FOUND,
        `Attendence not found for ${monthlyRecord.year}-${
          monthlyRecord.monthIndex + 1
        }-${dayDate}`
      )
    );
  }

  if (presence) {
    if (
      !["half", "present", "absent", "one-and-half"].includes(presence.trim())
    ) {
      return next(
        new ApiError(BAD_REQUEST, "Invalid presence provided for updation")
      );
    }
    record.presence = presence.trim();
  }

  if (wagesOfDay || wagesOfDay === Number(0)) {
    if (isNaN(wagesOfDay)) {
      return next(
        new ApiError(BAD_REQUEST, "Invalid wages of the day given for updation")
      );
    }
    monthlyRecord.currentWages =
      monthlyRecord.currentWages - record.wagesOfDay + Number(wagesOfDay);
    record.wagesOfDay = Number(wagesOfDay);
  }

  if (advanceAmount || advanceAmount === Number(0)) {
    if (isNaN(advanceAmount)) {
      return next(
        new ApiError(BAD_REQUEST, "Invalid advance amount given for updation")
      );
    }

    let toAdd = 0;
    if (record.advance?.amount) {
      toAdd = Number(advanceAmount) - record.advance.amount;
    } else {
      toAdd = Number(advanceAmount);
    }
    monthlyRecord.currentAdvance = monthlyRecord.currentAdvance + toAdd;
    record["advance"] = {
      amount: Number(advanceAmount),
      purpose: advancePurpose?.trim() || "General Work",
    };
  }
  monthlyRecord.dailyRecords = monthlyRecord.dailyRecords.filter(
    (rec) => rec._id.toString() !== record._id.toString()
  );
  monthlyRecord.dailyRecords.push(record);

  await monthlyRecord.save();

  res
    .status(OK)
    .json(new ApiResponse(OK, "Attendence updated successfully", record));
});

export const deleteAttendence = asyncHandler(async (req, res, next) => {
  const recordId = req.params?.recordId;
  let { dayDate } = req.query;

  if (dayDate === "" || isNaN(dayDate)) {
    return next(
      new ApiError(BAD_REQUEST, "Invalid date provided for record deletion")
    );
  }

  dayDate = Number(dayDate);

  const monthlyRecord = await MonthlyRecord.findById(recordId);
  if (!monthlyRecord) {
    return next(new ApiError(NOT_FOUND, "Monthly record not found"));
  }

  const lastSettlementDate = monthlyRecord.lastSettlementDate?.dayDate || 0;
  const { monthIndex } = getCurrentNepaliDate();

  if (
    dayDate <= lastSettlementDate ||
    monthIndex !== monthlyRecord.monthIndex
  ) {
    return next(new ApiError(BAD_REQUEST, "Invalid day date for deletion"));
  }
  
  const record = monthlyRecord.dailyRecords.find(
    (rec) => rec.dayDate === dayDate
  );
  if (!record) {
    return next(
      new ApiError(
        NOT_FOUND,
        `No record found for ${monthlyRecord.year}-${
          monthlyRecord.monthIndex + 1
        }-${dayDate}`
      )
    );
  }

  if (record.wagesOfDay > 0) {
    monthlyRecord.currentWages -= record.wagesOfDay;
  }

  if (record.advance?.amount > 0) {
    monthlyRecord.currentAdvance -= record.advance.amount;
  }
  monthlyRecord.dailyRecords = monthlyRecord.dailyRecords.filter(
    (rec) => rec._id.toString() !== record._id.toString()
  );
  await monthlyRecord.save();

  res.status(OK).json(new ApiResponse(OK, "Record deleted successfully", {}));
});

export const getMonthlyRecord = asyncHandler(async (req, res, next) => {
  const recordId = req.params?.recordId;
  const monthlyRecord = await MonthlyRecord.findById(recordId);

  if (!monthlyRecord) {
    return next(new ApiError(NOT_FOUND, "No record found"));
  }
  monthlyRecord.dailyRecords.sort((a, b) => a.dayDate - b.dayDate);
  res.status(OK).json(new ApiResponse(OK, "Get record success", monthlyRecord));
});

export const getAllRecordsOfYear = asyncHandler(async (req, res, next) => {
  const workerId = req.query?.workerId?.trim();
  const year = req.query?.year;

  if (!workerId || !year || isNaN(year)) {
    return next(new ApiError(BAD_REQUEST, "Invalid date or workerId given"));
  }

  const records = await MonthlyRecord.aggregate([
    {
      $match: {
        $and: [
          { workerId: new Types.ObjectId(workerId) },
          { year: Number(year) },
        ],
      },
    },
    {
      $project: { 
        monthIndex: 1,
        numberOfDays: 1,
      },
    },
    {$sort:{monthIndex:-1}}
  ]);

  res.status(OK).json(new ApiResponse(OK, "All records get success", records));
});

export const settleAccount = asyncHandler(async (req, res, next) => {
  let { recordId, dayDate } = req.body;
  if (!recordId || typeof recordId !== "string") {
    return next(
      new ApiError(BAD_REQUEST, "RecordId is required to do settlements")
    );
  }
  const monthlyRecord = await MonthlyRecord.findById(recordId);
  if (!monthlyRecord) {
    return next(new ApiError(NOT_FOUND, "Record not found for settlement"));
  }
  const lastSettlementDate = monthlyRecord.lastSettlementDate?.dayDate || 0;

  if (!dayDate || isNaN(dayDate)) {
    return next(new ApiError(BAD_REQUEST, "Date is required for settlement"));
  }

  dayDate = Number(dayDate);
  if (
    !(dayDate <= monthlyRecord.numberOfDays && dayDate > lastSettlementDate)
  ) {
    return next(new ApiError(BAD_REQUEST, "Invalid date given for settlement"));
  }
  const { dayDate: todayDate, dayIndex } = getCurrentNepaliDate();
  if (dayDate > todayDate) {
    return next(
      new ApiError(BAD_REQUEST, "Settlement cannot be done for future dates")
    );
  }

  const prevWages = monthlyRecord.prevWages || 0;
  const prevAdvance = monthlyRecord.prevAdvance || 0;
  const { currentWages, currentAdvance } = calculateAmounts(
    monthlyRecord.dailyRecords,
    lastSettlementDate,
    dayDate
  );
  const amount = prevWages + currentWages - (prevAdvance + currentAdvance);

  let settlement = { dayDate };
  let response = {
    prevWages,
    prevAdvance,
    calculatedWages: currentWages,
    calculatedAdvance: currentAdvance,
    newCurrentWages: monthlyRecord.currentWages - currentWages,
    newCurrentAdvance: monthlyRecord.currentAdvance - currentAdvance,
    amount,
  };
  if (amount > 0) {
    settlement = {
      ...settlement,
      wagesOccured: amount,
      wagesTransferred: amount,
    };
    // response["wagesOccured"] = amount;
    monthlyRecord.prevWages = amount;
    monthlyRecord.prevAdvance = 0;
  } else if (amount < 0) {
    settlement = {
      ...settlement,
      advanceOccured: Math.abs(amount),
      advanceTransferred: Math.abs(amount),
    };
    // response["advanceOccured"] = Math.abs(amount);
    monthlyRecord.prevAdvance = Math.abs(amount);
    monthlyRecord.prevWages = 0;
  } else {
    // response["wagesOccured"] = 0;
    // response["advanceOccured"] = 0;
    monthlyRecord.prevWages = 0;
    monthlyRecord.prevAdvance = 0;
  }

  let newLastSettlementDate = { dayDate, performedOn: todayDate };
  newLastSettlementDate["dayName"] = DAYS[dayIndex];

  monthlyRecord.settlements.push(settlement);
  monthlyRecord["lastSettlementDate"] = newLastSettlementDate;
  monthlyRecord.currentWages = monthlyRecord.currentWages - currentWages;
  monthlyRecord.currentAdvance = monthlyRecord.currentAdvance - currentAdvance;

  await monthlyRecord.save();

  res
    .status(OK)
    .json(new ApiResponse(OK, "Settlement done successfully", response));
});

export const adjustGivenAmountOnSettlement = asyncHandler(
  async (req, res, next) => {
    const { recordId, settlementDayDate, givenAmount } = req.body;
    if (!recordId || typeof recordId !== "string") {
      return next(
        new ApiError(
          BAD_REQUEST,
          "RecordId is required for settlement adjustment"
        )
      );
    }

    if (!settlementDayDate || isNaN(settlementDayDate)) {
      return next(
        new ApiError(BAD_REQUEST, "Settled date is required for adjustment")
      );
    }

    if (!givenAmount || isNaN(givenAmount)) {
      return next(
        new ApiError(
          BAD_REQUEST,
          "Amount to give to worker is required for adjustment"
        )
      );
    }

    const monthlyRecord = await MonthlyRecord.findById(recordId);
    if (!monthlyRecord) {
      return next(
        new ApiError(NOT_FOUND, "Record not found for settlement adjustment")
      );
    }

    const lastSettlementDate = monthlyRecord.lastSettlementDate?.dayDate;
    const performedOnDate = monthlyRecord.lastSettlementDate?.performedOn || 0;
    if (!lastSettlementDate || typeof lastSettlementDate !== "number") {
      return next(
        new ApiError(BAD_REQUEST, "No settlement is done in this month")
      );
    }
    const todayDate = getCurrentNepaliDate().dayDate;
    if (
      Number(settlementDayDate) !== lastSettlementDate ||
      performedOnDate !== todayDate
    ) {
      return next(
        new ApiError(
          BAD_REQUEST,
          "Adjustment can only be done on settlement day"
        )
      );
    }

    let {
      dayDate,
      wagesOccured,
      advanceOccured,
      amountTaken,
      wagesTransferred,
      advanceTransferred,
    } = monthlyRecord.settlements.find(
      (e) => e.dayDate === Number(settlementDayDate)
    );

    if (wagesOccured - amountTaken > 0) {
      //don't confuse with response it is designed that when wages occured on settlement and if you are giving money then after that according to given amount only transferred(wages and advance) amount will change the occured amount will be same
      const remainingAmount = wagesOccured - (amountTaken + givenAmount);
      if (remainingAmount > 0) {
        wagesTransferred = remainingAmount;
        monthlyRecord.prevWages = remainingAmount;
        monthlyRecord.prevAdvance = 0;
      } else if (remainingAmount < 0) {
        advanceTransferred = Math.abs(remainingAmount);
        wagesTransferred = 0;
        monthlyRecord.prevWages = 0;
        monthlyRecord.prevAdvance = Math.abs(remainingAmount);
      } else {
        wagesTransferred = 0;
        advanceTransferred = 0;
        monthlyRecord.prevWages = 0;
        monthlyRecord.prevAdvance = 0;
      }
    } else {
      advanceTransferred = advanceTransferred + givenAmount;
      wagesTransferred = 0;
      monthlyRecord.prevWages = 0;
      monthlyRecord.prevAdvance = advanceTransferred;
    }
    amountTaken += givenAmount;

    monthlyRecord.settlements = monthlyRecord.settlements.filter(
      (rec) => rec.dayDate !== dayDate
    );
    monthlyRecord.settlements.push({
      dayDate,
      wagesOccured,
      advanceOccured,
      amountTaken,
      wagesTransferred,
      advanceTransferred,
    });

    await monthlyRecord.save();

    res.status(OK).json(
      new ApiResponse(OK, "Amount adjustment on settlement success", {
        wagesOccured,
        advanceOccured,
        wagesTransferred,
        advanceTransferred,
        amountTaken,
      })
    );
  }
);

//Not required yet
export const getAllSettlementOfMonth = asyncHandler(async (req, res, next) => {
  const recordId = req.params?.recordId?.trim();
  if (!recordId || typeof recordId !== "string") {
    return next(new ApiError(BAD_REQUEST, "Invalid recordId is provided"));
  }
  const monthlyRecord = await MonthlyRecord.findById(recordId.trim());
  if (!monthlyRecord) {
    return next(new ApiError(NOT_FOUND, "Record not found"));
  }

  res
    .status(OK)
    .json(
      new ApiResponse(
        OK,
        "Get all settlement success",
        monthlyRecord.settlements
      )
    );
});

//Not required yet
export const getSingleSettlement = asyncHandler(async (req, res, next) => {
  const recordId = req.query?.recordId?.trim();
  let dayDate = req.query?.dayDate?.trim();

  if (!recordId || typeof recordId !== "string") {
    return next(new ApiError(BAD_REQUEST, "Invalid recordId provided"));
  }
  const monthlyRecord = await MonthlyRecord.findById(recordId.trim());
  if (!monthlyRecord) {
    return next(new ApiError(NOT_FOUND, "Record not found"));
  }

  if (!dayDate || isNaN(dayDate)) {
    dayDate = monthlyRecord.lastSettlementDate?.dayDate || 0;
  } else {
    dayDate = Number(dayDate);
  }

  if (dayDate === 0) {
    return next(
      new ApiError(BAD_REQUEST, "No settlement is done in this month")
    );
  }
  const record = monthlyRecord.settlements.find(
    (rec) => rec.dayDate === dayDate
  );
  if (!record) {
    return next(new ApiError(NOT_FOUND, "No settlement found for this date"));
  }

  res
    .status(OK)
    .json(new ApiResponse(OK, "Get single settlement success", record));
});

export const checkAttendanceForToday = asyncHandler(async (req, res, next) => {
  const recordId = req.params?.recordId?.trim();
  if (!recordId || typeof recordId !== "string") {
    return next(new ApiError(BAD_REQUEST, "Invalid recordId is provided"));
  }
  const monthlyRecord = await MonthlyRecord.findById(recordId);
  if (!monthlyRecord) {
    return next(new ApiError(NOT_FOUND, "Record not found"));
  }
  let isDone = false;
  const todayDate = getCurrentNepaliDate().dayDate;
  monthlyRecord.dailyRecords.forEach((rec) => {
    if (rec.dayDate === todayDate) {
      isDone = true;
    }
  });

  res
    .status(OK)
    .json(new ApiResponse(OK, "Attendance check success", { isDone }));
});

export const checkForSettlement = asyncHandler(async (req, res, next) => {
  const recordId = req.params?.recordId?.trim();
  if (!recordId || typeof recordId !== "string") {
    return next(new ApiError(BAD_REQUEST, "Invalid recordId is provided"));
  }
  const monthlyRecord = await MonthlyRecord.findById(recordId);
  if (!monthlyRecord) {
    return next(new ApiError(NOT_FOUND, "Record not found"));
  }
  const todayDate = getCurrentNepaliDate().dayDate;
  // const lastSettlementDate = monthlyRecord.lastSettlementDate?.dayDate || 0;
  const performedOnDate = monthlyRecord.lastSettlementDate?.performedOn || 0;
  if (performedOnDate === todayDate) {
    const settlements = monthlyRecord.settlements?.sort(
      (a, b) => b.dayDate - a.dayDate
    );
    return res.status(OK).json(
      new ApiResponse(OK, "Settlement has been done successfully", {
        alreadySettled: true,
        settlement: settlements[0],
        fromDate: settlements.length === 1 ? 1 : settlements[1].dayDate,
        toDate: settlements[0].dayDate,
      })
    );
  }
  res
    .status(OK)
    .json(
      new ApiResponse(OK, "Settlement not done yet", { alreadySettled: false })
    );
});

export const getCalendarEvents = asyncHandler(async (req, res, next) => {
  const workerId = req.params?.workerId?.trim();
  const { year, monthIndex } = getCurrentNepaliDate();
  let queryMonthIndex = req.query?.monthIndex?.trim();

  if (queryMonthIndex) {
    queryMonthIndex = Number(queryMonthIndex);
    if (isNaN(queryMonthIndex)) {
      return next(new ApiError(BAD_REQUEST, "Invalid monthIndex provided"));
    }
  } else {
    queryMonthIndex = monthIndex;
  }

  if (!workerId || typeof workerId !== "string") {
    return next(new ApiError(BAD_REQUEST, "Invalid recordId is provided"));
  }

  let monthlyRecord = await MonthlyRecord.findOne({
    workerId,
    year,
    monthIndex: queryMonthIndex,
  });

  const { dayIndex, numberOfDays } = getCurrentNepaliDate(
    `${year}-${queryMonthIndex + 1}-1`
  );

  if (!monthlyRecord) {
    res.status(OK).json(
      new ApiResponse(OK, "Get calendar events success", {
        dailyRecords: [],
        numberOfDays,
        dayIndex,
      })
    );
    return;
  }

  let dailyRecords = new Array(monthlyRecord.numberOfDays + 1).fill(null);

  monthlyRecord.dailyRecords.forEach((rec) => {
    dailyRecords[rec.dayDate] = rec;
  });

  monthlyRecord.settlements.forEach((set) => {
    if (dailyRecords[set.dayDate]) {
      const data = dailyRecords[set.dayDate]._doc;
      dailyRecords[set.dayDate] = {
        ...data,
        advance:
          Object.keys(data.advance).length > 0 ? data.advance : undefined,
        settlement: set,
      };
    } else {
      dailyRecords[set.dayDate] = {
        dayDate: set.dayDate,
        day: DAYS[(set.dayDate + dayIndex - 1) % 7], // for getting corresponding day
        settlement: set,
      };
    }
  });

  dailyRecords = dailyRecords.filter((rec) => rec !== null);

  res.status(OK).json(
    new ApiResponse(OK, "Get calendar events success", {
      dailyRecords,
      numberOfDays,
      dayIndex,
      lastSettlementDate: monthlyRecord.lastSettlementDate?.dayDate || 0,
    })
  );
});

export const deleteMonthlyRecord = asyncHandler(async (req, res, next) => {
  let {recordIds, workerId} = req.body;
  if (!recordIds || !Array.isArray(recordIds)) {
    return next(new ApiError(BAD_REQUEST, "Invalid recordIds provided"));
  }

  if (!workerId || typeof workerId !== "string") {
    return next(new ApiError(BAD_REQUEST, "Invalid workerId provided"));
  }

  const worker = await Worker.findById(workerId);
  if(!worker) {
    return next(new ApiError(NOT_FOUND, "Worker not found"));
  }
  const {currentRecordId, previousRecordId} = worker;

  recordIds = recordIds.filter((rec) => {
    rec = rec.toString();
    return !(rec === currentRecordId.toString() || rec === previousRecordId?.toString());
  });

  if(recordIds.length === 0) {
    return next(new ApiError(BAD_REQUEST, "No records to delete"));
  }

  const response = await MonthlyRecord.deleteMany({
    $and: [
      { _id: { $in: recordIds } },
      { workerId: workerId },
    ]
  });

  res
    .status(OK)
    .json(new ApiResponse(OK, "Monthly record deleted successfully", {response}));
});
