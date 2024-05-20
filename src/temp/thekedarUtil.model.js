import mongoose from "mongoose";

const thekedarUtilSchema = new mongoose.Schema({
  thekedarId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Thekedar',
    required:[true, "Thekedar Id is required for thekedar utils"]
  },
  lastNullMarkedDate:{
    monthIndex:{
      type:Number,
      required:true
    },
    dayDate:{
      type:Number,
      required:true
    }
  }
});

export const ThekedarUtil = mongoose.model("ThekedarUtils", thekedarUtilSchema);