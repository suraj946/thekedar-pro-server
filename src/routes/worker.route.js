import { Router } from "express";
import {authenticate} from "../middlewares/auth.middleware.js";
import { 
    createWorker, 
    deleteWorker, 
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
      .delete(authenticate, deleteWorker);

router.route("/get-worker-for-attendance").get(authenticate, getWorkerForAttendance);

export default router;