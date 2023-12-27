import { Router } from "express";
import {authenticate} from "../middlewares/auth.middleware.js";
import { 
    addAttendence, 
    createMonthlyRecord, 
    deleteAttendence, 
    getAllRecordsOfYear, 
    getMonthlyRecord, 
    updateAttendence
} from "../controllers/monthlyRecord.controller.js";

const router = Router();

router.route("/create").post(authenticate, createMonthlyRecord);
router.route("/attendence/:recordId")
      .post(authenticate, addAttendence)
      .put(authenticate, updateAttendence)
      .delete(authenticate, deleteAttendence);

router.route("/single/:recordId")
      .get(authenticate, getMonthlyRecord);

router.route("/all").get(authenticate, getAllRecordsOfYear);

export default router;