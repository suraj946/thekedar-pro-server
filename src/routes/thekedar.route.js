import {Router} from "express";
import { 
    changePassword, 
    forgotPassword, 
    loadUser, 
    login, 
    logout, 
    register, 
    resetPassword, 
    updateProfile
} from "../controllers/thekedar.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/loaduser").get(authenticate, loadUser);
router.route("/logout").get(authenticate, logout);
router.route("/updateprofile").put(authenticate, updateProfile);
router.route("/changepassword").put(authenticate, changePassword);
router.route("/forgotpassword").post(forgotPassword);
router.route("/resetpassword").put(resetPassword);

export default router;