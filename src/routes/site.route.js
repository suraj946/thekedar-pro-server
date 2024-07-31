import { Router } from "express";
import {authenticate} from "../middlewares/auth.middleware.js";
import { createSite, deleteSite, editSite, getSingleSite, getSites } from "../controllers/site.controller.js";

const router = Router();

router.route("/create").post(authenticate, createSite);
router.route("/all").get(authenticate, getSites);
router.route("/single/:siteId").get(authenticate, getSingleSite)
      .put(authenticate, editSite)
      .delete(authenticate, deleteSite);

export default router;