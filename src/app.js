import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {error} from "./middlewares/error.middleware.js";

const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.json({limit : "16kb"}));
app.use(express.urlencoded({extended : true, limit : "16bk"}));
app.use(cookieParser());

//router imports
import thekedarRoute from "./routes/thekedar.route.js";
import workerRoute from "./routes/worker.route.js";
import monthlyRecordRoute from "./routes/monthlyRecord.route.js";

//using routers
app.use("/api/v1/thekedar", thekedarRoute);
app.use("/api/v1/worker", workerRoute);
app.use("/api/v1/record", monthlyRecordRoute);

//error middleware
app.use(error);

export {app};