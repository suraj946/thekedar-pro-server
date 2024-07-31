import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  thekedarId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Thekedar',
    required:[true, "Thekedar Id is required for payment"]
  },
  siteId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Site',
    required:[true, "Site Id is required for payment"]
  },
  amount:{
    type:Number,
    required:[true, "Amount is required for payment"]
  },
  date:{
    type: String,
    required:[true, "Date is required for payment"],
    trim:true
  },
  description:{
    type: String,
    trim:true
  },
  bitNumber:{
    type:Number
  }
}, {timestamps: true});

export const Payment = mongoose.model("Payment", paymentSchema);