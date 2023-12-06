import mongoose from "mongoose";

const thekedarSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, "Name is required"],
        trim:true
    },
    email:{
        type:String,
        required:[true, "Email is required"],
        trim:true,
        unique:true,
        lowercase:true
    },
    password:{
        type:String,
        required:[true, "Password is required"],
    },
    contactNumber:{
        type:String,
    },
    address:{
        type:String,
        trim:true
    },
    companyName:{
        type:String,
        trim:true,
        required:[true, "Company name is required"]
    }
},{timestamps:true});

export const Thekedar = mongoose.model("Thekedar", thekedarSchema);