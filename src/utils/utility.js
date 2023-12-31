import { createTransport } from "nodemailer";
import { ApiResponse } from "./ApiResponse.js";

export const sendToken = async(thekedar, statusCode, res, message) => {
  const jwtToken = await thekedar.generateJWTToken();

  res
    .status(statusCode)
    .cookie("token", jwtToken, {
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE_DAY * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    })
    .json(new ApiResponse(statusCode, message, thekedar));
};

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
            width: 120px;
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
