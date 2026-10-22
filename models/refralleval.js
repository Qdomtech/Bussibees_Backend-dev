const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    levelName: {
      type: String,
    },
    referralPercentage: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Referral", referralSchema);