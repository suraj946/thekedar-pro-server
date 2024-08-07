import { createTransport } from "nodemailer";
import { ApiResponse } from "./ApiResponse.js";
import { getNepaliDateFromAD, getNepaliDateFromBS } from "../nep_dates/index.js";
import { Worker } from "../models/worker.model.js";

export const getCurrentNepaliDate = (dateStr, type="BS") => {
  if(!dateStr) return getNepaliDateFromAD();
  if(!["AD", "BS"].includes(type)) throw new Error("Invalid date type");

  const regex = /^\d{4}-([1-9]|1[0-2])-([1-9]|[12][0-9]|3[0-2])$/;
  if(!regex.test(dateStr)) throw new Error("Invalid date format should be YYYY-MM-DD");
  const date = dateStr.split('-').map(d => Number(d));
  const [year, month, dayDate] = date;
  if(type === "AD"){
    return getNepaliDateFromAD({year, month, dayDate});
  }

  if(type === "BS"){
    return getNepaliDateFromBS({year, month, dayDate});
  }
}

export const isMonthChanged = (runningDate, currentDate) => {
  const {monthIndex, year} = currentDate;
  const {year:runningYear, monthIndex:runningMonthIndex} = runningDate;
  let isInitialCall;

  if((year === runningYear && monthIndex - runningMonthIndex > 0) || year > runningYear){
    isInitialCall = true;
  }else{
    isInitialCall = false;
  }

  return isInitialCall;
}

export const sendToken = async(thekedar, statusCode, res, message) => {
  const jwtToken = await thekedar.generateJWTToken();
  const currentDate = getCurrentNepaliDate();
  const workersCount = await Worker.countDocuments({thekedarId: thekedar._id});
  thekedar["password"] = undefined;
  res
    .status(statusCode)
    .cookie("token", jwtToken, {
      ...cookieOptions(),
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE_DAY * 24 * 60 * 60 * 1000
      ),
    })
    .json(new ApiResponse(statusCode, message, {
      thekedar,
      isInitialCall: isMonthChanged(thekedar.runningDate, currentDate),
      currentDate,
      workersCount
    }));
};


export const cookieOptions = () => ({
  secure: (process.env.NODE_ENV === "development") ? false : true,
  httpOnly: (process.env.NODE_ENV === "development") ? false : true,
  sameSite: (process.env.NODE_ENV === "development") ? false : "none",
});

export const sendEmail = async ({toEmail, subject, otp, heading, description}) => {
  const transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    to: toEmail,
    subject,
    html:`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
          }
          h1 {
            color: #ff0040;
            text-align: center;
            margin-bottom: 20px;
          }
          p {
            color: #555;
            text-align: center;
            font-size: 20px;
          }
          .otp-box {
            margin: 20px auto;
            padding: 10px;
            text-align: center;
            background-color: #ffd2d2;
            border-radius: 10px;
            width: 85%;
          }
          .app-name {
            color: #fff;
            text-align: center;
            background-color: #ff0040;
            width: 170px;
            margin: 20px auto;
            padding: 10px;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
            <p class="app-name">${process.env.APP_NAME}</p>
          <h1>${heading}</h1>
          <p>${description}</p>
          <div class="otp-box">
            <p>Your OTP : <strong>${otp}</strong></p>
          </div>
        </div>
      </body>
    </html>
    
    `
  });
};

export const calculateAmounts = (recordsArray, lastSettlementDate, todayDate) => {
  let currentWages = 0;
  let currentAdvance = 0;

  for(let i = 0; i < recordsArray.length; i++){
    let record = recordsArray[i];
    if(record.dayDate > lastSettlementDate && record.dayDate <= todayDate){
      currentWages += record.wagesOfDay;
      if(record.advance && typeof record.advance.amount === "number"){
        currentAdvance += record.advance.amount;
      }
    }
  }
  return {currentWages, currentAdvance};
}
