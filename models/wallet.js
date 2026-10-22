const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  refererId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  count: { type: Number, default: 0 },         
  earning: { type: Number, default: 0 },        
  status: { type: Boolean, default: true },     
  data: [
    {
      userDetails: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        email: String,
        mobileNo: String,
        firstName: String,
        lastName: String
      },
      course: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "GovernmentCourse" },
        courseName: String,
        coursePrice: Number
      },
      commission: Number,
      status: { type: Boolean, default: true }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("Wallet", WalletSchema);
