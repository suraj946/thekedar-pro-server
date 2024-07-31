import mongoose from "mongoose";

const siteSchema = new mongoose.Schema({
  thekedarId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Thekedar',
    required:[true, "Thekedar Id is required for sites"]
  },
  siteName:{
    type: String,
    required: [true, "Site name is required"],
    trim: true
  },
  address:{
    type: String,
    required: [true, "Site address is required"],
    trim: true
  }
}, {timestamps: true});

export const Site = mongoose.model("Site", siteSchema);