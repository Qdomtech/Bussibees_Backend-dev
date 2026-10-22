const mongoose = require("mongoose");
const skillwalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    transactions: [
      {
        amount: Number,
        type: { type: String },
        message: String,
        buyerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
         bundleId: {                     
          type: mongoose.Schema.Types.ObjectId,
          ref: "SkillBundle"
        },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillWallet", skillwalletSchema);

