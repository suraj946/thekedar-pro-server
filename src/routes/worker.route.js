import { Router } from "express";
import {authenticate} from "../middlewares/auth.middleware.js";
import { 
    createWorker, 
    deleteWorkerMultiple, 
    getAllWorkers, 
    getWokerDetails, 
    getWorkerForAttendance, 
    toggleActiveStatus, 
    updateRole, 
    updateWages, 
    updateWorker
} from "../controllers/worker.controller.js";

const router = Router();

router.route("/create").post(authenticate, createWorker);
router.route("/all").get(authenticate, getAllWorkers);
router.route("/updatewages").put(authenticate, updateWages);
router.route("/updaterole").put(authenticate, updateRole);
router.route("/updatestatus").put(authenticate, toggleActiveStatus);

router.route("/single/:workerId")
      .put(authenticate, updateWorker)
      .get(authenticate, getWokerDetails)
      
router.route("/delete").post(authenticate, deleteWorkerMultiple);
router.route("/get-worker-for-attendance").get(authenticate, getWorkerForAttendance);

export default router;