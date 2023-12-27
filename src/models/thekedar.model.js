import mongoose from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

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
    },
    otp:Number,
    otp_expire:Date
},{timestamps:true});

thekedarSchema.pre("save", async function(next){
    if(!this.isModified("password")){
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

thekedarSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

thekedarSchema.methods.generateJWTToken = async function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            name:this.name
        }, 
        process.env.JWT_SECRET,
        {
            expiresIn:process.env.JWT_TOKEN_EXPIRY
        }
    )
}

export const Thekedar = mongoose.model("Thekedar", thekedarSchema);