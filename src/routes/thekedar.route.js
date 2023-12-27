import {Router} from "express";
import { 
    changePassword, 
    forgotPassword, 
    login, 
    register, 
    resetPassword, 
    updateProfile
} from "../controllers/thekedar.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/updateprofile").put(authenticate, updateProfile);
router.route("/changepassword").put(authenticate, changePassword);
router.route("/forgotpassword").post(forgotPassword);
router.route("/resetpassword").put(resetPassword);

export default router;