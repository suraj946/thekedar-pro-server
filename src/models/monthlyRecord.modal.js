import mongoose from "mongoose";

const monthlyRecordSchema = new mongoose.Schema({
    workerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Worker',
        required:[true, "Worker Id for monthly record is required"]
    },
    year:{
        type:Number,
        required:[true, "Year of record is required"]
    },
    monthIndex:{
        type:Number,
        required:[true, "Month of record is required"]
    },
    numberOfDays:{
        type:Number,
        required:true
    },
    dailyRecords:[
        {
            day:{
                type:String,
                enum:["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
                required:true
            },
            dayDate:{
                type:Number,
                required:true
            },
            presence:{
                type:String,
                enum:["half", "present", "absent", "one-and-half"],
            },
            wagesOfDay:{
                type:Number,
                default:0
            },
            advance:{
                amount:Number,
                purpose:String
            }
        }
    ],
    settlements:[
        {
            dayDate:{
                type:Number,
                required:true
            },
            wagesOccured:{
                type:Number,
                default:0
            },
            advanceOccured:{
                type:Number,
                default:0
            },
            amountTaken:{
                type:Number,
                default:0
            },
            wagesTransferred:{
                type:Number,
                default:0
            },
            advanceTransferred:{
                type:Number,
                default:0
            },
        }
    ],
    lastSettlementDate:{
        dayDate:{
            type:Number,
        },
        dayName:{
            type:String,
            enum:["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        }
    },
    prevWages:{
        type:Number,
        default:0
    },
    prevAdvance:{
        type:Number,
        default:0
    },
    currentWages:{
        type:Number,
        default:0
    },
    currentAdvance:{
        type:Number,
        default:0
    },
});

export const MonthlyRecord = mongoose.model("MonthlyRecord", monthlyRecordSchema);