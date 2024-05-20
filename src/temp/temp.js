// import {Types} from "mongoose";
// import NepaliDate from "nepali-date-converter";

import NepaliDate from "nepali-date-converter";
import { ApiError } from "../utils/ApiError.js";
import { getCurrentNepaliDate } from "../utils/utility.js";

// const date = new NepaliDate(2080, 8, 29);
// const day = date.format("ddd D").split(" ");

// let data = {
//     statusCode: 200,
//     message: "Attendence done successfully",
//     data: {
//       _id: "6580213607cceaf29f59d0e9",
//       workerId: "657af5a169a5a97d9cbfe5a4",
//       year: 2080,
//       monthIndex: 8,
//       numberOfDays: 29,
//       prevWages: 8000,
//       currentWages: 5800,
//       currentAdvance: 1500,
//       dailyRecords: [
//         {
//           day: "sunday",
//           dayDate: 1,
//           presence: "half",
//           wagesOfDay: 400,
//           _id: "6582abd33b57401f7f6c8095"
//         },
//         {
//           day: "wednesday",
//           dayDate: 4,
//           presence: "absent",
//           wagesOfDay: 0,
//           _id: "6582ac153b57401f7f6c809d"
//         },
//         {
//           advance: {
//             amount: 1000,
//             purpose: "General Work"
//           },
//           day: "thursday",
//           dayDate: 5,
//           presence: "half",
//           wagesOfDay: 600,
//           _id: "65840f3d2ea5c0f10438e5a8"
//         },
//         {
//           day: "monday",
//           dayDate: 2,
//           presence: "present",
//           wagesOfDay: 800,
//           _id: "658beed324ce8ca2a3e03d86"
//         },
//         {
//           day: "tuesday",
//           dayDate: 3,
//           presence: "half",
//           wagesOfDay: 400,
//           _id: "658beefc24ce8ca2a3e03d8e"
//         },
//         {
//           advance: {
//             amount: 500,
//             purpose: "General Purpose"
//           },
//           day: "friday",
//           dayDate: 6,
//           presence: "one-and-half",
//           wagesOfDay: 1200,
//           _id: "658bef9324ce8ca2a3e03d97"
//         },
//         {
//           day: "saturday",
//           dayDate: 7,
//           presence: "absent",
//           wagesOfDay: 0,
//           _id: "658befd624ce8ca2a3e03da9"
//         },
//         {
//           day: "sunday",
//           dayDate: 8,
//           presence: "present",
//           wagesOfDay: 800,
//           _id: "658bf06324ce8ca2a3e03db4"
//         },
//         {
//           day: "monday",
//           dayDate: 9,
//           presence: "present",
//           wagesOfDay: 800,
//           _id: "658bf07024ce8ca2a3e03dc0"
//         },
//         {
//           day: "tuesday",
//           dayDate: 10,
//           presence: "present",
//           wagesOfDay: 800,
//           _id: "658bf07824ce8ca2a3e03dcd"
//         }
//       ],
//       settlements: [],
//       __v: 20
//     },
//     success: true
//   }

// const lastSettlementDate = 5;
// const todayDate = 10;
// const arr = data.data.dailyRecords.filter(record => (record.dayDate > lastSettlementDate && record.dayDate <= todayDate));
// const arr = data.data.dailyRecords;

// let currWages = 0;
// let currAdvance = 0;
// let remainingWages = 0;
// let remainingAdvance = 0;

// console.log(arr);

// for(let i = 0; i < arr.length; i++){
//     if(arr[i].dayDate > lastSettlementDate && arr[i].dayDate <= todayDate){
//         currWages += arr[i].wagesOfDay;
//         if(arr[i].advance && typeof arr[i].advance.amount === "number"){
//             currAdvance += arr[i].advance.amount;
//         }
//     }
// }

// console.log({currWages, currAdvance});

// const getDaysInMonth = (year) => {
//   const date = new NepaliDate(2080, 8, 30);
//   console.log({date});
  // for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
  //   let count = 1,
  //   i = 3;
  //   let date = new NepaliDate(year, monthIndex, 2).getDate();
  //   while (date != 1) {
  //     date = new NepaliDate(year, monthIndex, i).getDate();
  //     count++;
  //     i++;
  //   }

  //   console.log(`${monthIndex+1} : ${count} days`);
  // }
// };

// getDaysInMonth(2081);

// const objId = new Types.ObjectId()

// console.log(new Types.ObjectId());


// const forSingle = async(name, email, i) => {
//   try {
//     if(!name){
//       throw new ApiError(401, "name is required", {id:i});
//     }
  
//     if(!email){
//       throw new ApiError(401, "email is required", {id:i});
//     }
  
//     return await Promise.resolve({success:true});
//   } catch (error) {
//     return Promise.reject({
//       error:error.message,
//       info:{...error.data}
//     })
//   }
// }

// const done = async() => {
//   const data = [
//     {
//       name:"",
//       email:"s@gmail.com"
//     },
//     {
//       name:"Ramesh",
//       email:"r@gmail.com"
//     },
//     {
//       name:"Puja",
//       email:"p@gmail.com"
//     },
//     {
//       name:"Avishek",
//       email:"a@gmail.com"
//     },
//   ];

//   const allPromises = [];
//   data.forEach((d, idx) => {
//     allPromises.push(forSingle(d.name, d.email, idx));
//   });

//   const res = await Promise.allSettled(allPromises);
//   res.forEach(r => {
//     if(r.status === "rejected"){
//       console.log(r.reason?.info);
//     }
//   })
// }

// done();



// const worker = {
//   _id: '657af5a169a5a97d9cbfe5a4',
//   name: 'Ramesh Sah',
//   role: 'mistri',
//   thekedarId: '6572c79483f62bcfc1700020',
//   contactNumber: '9855641256',
//   address: 'Bariyarpur',
//   wagesPerDay: 1000,

//   joiningDate: {
//     year: 2080,
//     monthIndex: 7,
//     dayDate: 28,
//   },
//   isActive: true,
//   currentRecords: {
//     _id: {
//       $oid: '6580213607cceaf29f59d0e9',
//     },
//     prevAdvance: 0,
//     workerId: {
//       $oid: '657af5a169a5a97d9cbfe5a4',
//     },
//     lastSettlementDate: {
//       dayName: 'monday',
//       dayDate: 16,
//     },
//     __v: 35,
//     year: 2080,
//     monthIndex: 8,
//     prevWages: 0,
//     currentWages: 0,
//     currentAdvance: 0,
//     numberOfDays: 29,
//   },
// };


const d1 = getCurrentNepaliDate().dayDate;
const d2 = new NepaliDate(new Date(Date.now())).getDate();

console.log({d1, d2});