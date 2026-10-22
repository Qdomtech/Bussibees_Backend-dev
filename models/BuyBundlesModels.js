const mongoose = require("mongoose");

const BuyBundleSchema = new mongoose.Schema(
  {
    BundleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillBundle",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },
    merchantOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },

    transactionId: {
      type: String,
    },
    paymentStatus: {
  type: String,
  enum: ["SUCCESS", "FAILED", "PENDING"],
  default: "PENDING"
},

    rawResponse: {
      type: Object,
    },

    paymentMode: {
      type: String,
      default: "PHONEPE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BuyBundle", BuyBundleSchema);