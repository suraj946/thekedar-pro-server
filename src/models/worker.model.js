import mongoose from "mongoose";

const workerSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, "Name of worker is required"],
        trim:true
    },
    role:{
        type:String,
        enum:["mistri", "labour", "general"],
        default:"general"
    },
    thekedarId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Thekedar',
        required:[true, "Thekedar Id is required for workers"],
    },
    contactNumber:{
        type:String
    },
    address:{
        type:String,
        trim:true
    },
    wagesPerDay:{
        type:Number,
        required:[true, "Wages per day of worker is required"]
    },
    joiningDate:{
        year:{
            type:Number,
            required:true
        },
        monthIndex:{
            type:Number,
            required:true
        },
        dayDate:{
            type:Number,
            required:true
        }
    },
    isActive:{
        type:Boolean,
        default:true
    },
    currentRecordId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'MonthlyRecord',
        required:[true, "RecordId is required for workers"],
    }
});

export const Worker = mongoose.model("Worker", workerSchema);