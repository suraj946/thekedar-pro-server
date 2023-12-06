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
    month:{
        type:Number,
        required:[true, "Month of record is required"]
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
                default:"present"
            },
            wagesOfDay:{
                type:Number,
                required:true
            },
            advance:{
                amount:Number,
                puspose:String
            }
        }
    ],
    lastSettlementDate:{
        dayDate:{
            type:Number,
            required:true
        },
        dayName:{
            type:String,
            enum:["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
            required:true
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