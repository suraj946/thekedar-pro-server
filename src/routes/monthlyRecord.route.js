import { Router } from "express";
import {authenticate} from "../middlewares/auth.middleware.js";
import { 
    addAttendence, 
    adjustGivenAmountOnSettlement, 
    createAttendance, 
    createMonthlyRecord, 
    deleteAttendence, 
    getAllRecordsOfYear, 
    getAllSettlementOfMonth, 
    getMonthlyRecord, 
    getSingleSettlement, 
    settleAccount, 
    updateAttendence
} from "../controllers/monthlyRecord.controller.js";

const router = Router();

router.route("/create").post(authenticate, createMonthlyRecord);
router.route("/attendence/:recordId")
      .post(authenticate, addAttendence)
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

export default router;