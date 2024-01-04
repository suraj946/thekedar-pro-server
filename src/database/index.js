import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async() => {
    try {
        console.log("Connecting to database...");
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}?authSource=admin`);
        console.log(`DATABASE CONNECTED !! HOST : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("DATABASE CONNECTION FAILED ", error);
        process.exit(1);
    }
}

export default connectDB;