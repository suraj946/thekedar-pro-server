import { Router } from "express";
import {authenticate} from "../middlewares/auth.middleware.js";
import { createPayment, deletePayment, editPayment } from "../controllers/payment.controller.js";

const router = Router();

router.route("/create").post(authenticate, createPayment);
router.route("/single/:paymentId").put(authenticate, editPayment)
      .delete(authenticate, deletePayment);

export default router;