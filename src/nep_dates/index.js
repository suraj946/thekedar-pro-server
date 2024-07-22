import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pathToDate = path.join(__dirname, "/data");

const getPathBS = (year) => {
  const data = fs.readdirSync(pathToDate);
  const name = data.find((item) => item.includes(year));
  if (!name) throw new Error("Invalid year range");
  return path.join(pathToDate, name);
};

const getPathAD = (year, month, dayDate) => {
  const data = fs.readdirSync(pathToDate);
  const names = data.filter((item) => item.includes(year));
  const dateToCheckMs = new Date(`${year}-${month}-${dayDate}`).getTime();
  const name = names.find((item) => {
    const range = item.split("_")[1]?.split(".")[0]?.split("$");
    const lowerMs = new Date(range[0]).getTime();
    const upperMs = new Date(range[1]).getTime();
    return lowerMs <= dateToCheckMs && dateToCheckMs <= upperMs;
  });
  if (!name) throw new Error("Invalid date");
  return path.join(pathToDate, name);
};

const getNepaliDateFromAD = (dateInAD) => {
  const currentDate = new Date(Date.now());
  const dateStr = dateInAD ?
    `${dateInAD.year}-${dateInAD.month}-${dateInAD.dayDate}`
    : `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
    
  const dateObj = new Date(dateStr);
  const date =
    typeof dateInAD !== "undefined"
      ? dateInAD
      : {
          year: dateObj.getFullYear(),
          month: dateObj.getMonth() + 1,
          dayDate: dateObj.getDate(),
        };

  const dateToCheckMs = dateObj.getTime();
  let json = fs.readFileSync(getPathAD(date.year, date.month, date.dayDate));
  json = JSON.parse(json);
  let keyStr = "";
  const obj = { year: json.yearBS };
  Object.keys(json.data).forEach((key) => {
    const arr = key.split("_");
    const nepaliMonth = arr[1];
    const dateStrArr = arr[2].split("$");
    const range1 = new Date(dateStrArr[0]).getTime();
    const range2 = new Date(dateStrArr[1]).getTime();
    if (range1 <= dateToCheckMs && dateToCheckMs <= range2) {
      keyStr = key;
      obj.monthIndex = nepaliMonth - 1;
      return;
    }
  });
  if (!keyStr) throw new Error("Invalid date");
  const monthInfo = json.data[keyStr];
  const potentialDateRange = monthInfo.dates.filter((d) =>
    d.date_ad.includes(`${date.year}-${date.month}`)
  );
  potentialDateRange.sort((a, b) => a.day_bs - b.day_bs);
  let d1 = Number(potentialDateRange[0].date_ad.split("-")[2]);

  return {
    ...obj,
    dayDate: potentialDateRange[0].day_bs + date.dayDate - d1,
    numberOfDays: monthInfo.numberOfDays,
    dayIndex: dateObj.getDay(),
    dateInAD: `${date.year}-${date.month}-${date.dayDate}`
  };
};

const getNepaliDateFromBS = (dateInBS) => {
  if(!dateInBS) return getNepaliDateFromAD();
  const {year, month, dayDate} = dateInBS;
  const data = fs.readFileSync(getPathBS(year));
  const json = JSON.parse(data);
  const monthInfo =
    json.data[
      Object.keys(json.data).find((key) => key.includes(`month_${month}`))
    ];
  const arr = monthInfo.dates;
  if (!arr) throw new Error("Invalid date");
  arr.sort((a, b) => a.day_bs - b.day_bs);
  let dateInAD;

  if (dayDate >= arr[0].day_bs && dayDate <= arr[1].day_bs) {
    dateInAD = arr[0].date_ad.split("-");
    dateInAD[2] = Number(dateInAD[2]) + dayDate - 1;
    dateInAD = dateInAD.join("-");
  } else if (dayDate >= arr[2].day_bs && dayDate <= arr[3].day_bs) {
    dateInAD = arr[2].date_ad.split("-");
    dateInAD[2] = Number(dateInAD[2]) + (dayDate - arr[1].day_bs - 1);
    dateInAD = dateInAD.join("-");
  }

  if (!dateInAD) throw new Error("Invalid date");

  const date = new Date(dateInAD);
  return {
    year,
    monthIndex: month - 1,
    dayDate,
    dayIndex: date.getDay(),
    dateInAD,
    numberOfDays: monthInfo.numberOfDays,
  };
};

export { getNepaliDateFromAD, getNepaliDateFromBS };
