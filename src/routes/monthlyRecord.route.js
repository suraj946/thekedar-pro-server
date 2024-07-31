import { Router } from "express";
import {authenticate} from "../middlewares/auth.middleware.js";
import { 
      addAttendanceForLeftDays, 
    adjustGivenAmountOnSettlement, 
    checkAttendanceForToday, 
    checkForSettlement, 
    createAttendance, 
    createMonthlyRecord, 
    deleteAttendence, 
    deleteMonthlyRecord, 
    getAllRecordsOfYear, 
    getAllSettlementOfMonth, 
    getCalendarEvents, 
    getMonthlyRecord, 
    getSingleSettlement, 
    settleAccount, 
    updateAttendence
} from "../controllers/monthlyRecord.controller.js";

const router = Router();

router.route("/create").post(authenticate, createMonthlyRecord);
router.route("/attendence/:recordId")
      .post(authenticate, addAttendanceForLeftDays)
      .put(authenticate, updateAttendence)
      .delete(authenticate, deleteAttendence);

router.route("/create-attendance").post(authenticate, createAttendance);

router.route("/single/:recordId")
      .get(authenticate, getMonthlyRecord);

router.route("/all").get(authenticate, getAllRecordsOfYear);

router.route("/settlement").post(authenticate, settleAccount);
router.route("/adjust-settlement").post(authenticate, adjustGivenAmountOnSettlement);
router.route("/all-settlements/:recordId").get(authenticate, getAllSettlementOfMonth);
router.route("/single-settlement").get(authenticate, getSingleSettlement);

router.route("/check-attendence/:recordId").get(authenticate, checkAttendanceForToday);
router.route("/check-settlement/:recordId").get(authenticate, checkForSettlement);
router.route("/calendar-events/:workerId").get(authenticate, getCalendarEvents);

router.route("/delete").post(authenticate, deleteMonthlyRecord);

export default router;