const mongoose = require("mongoose");

const BuyTestSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduleTest",
      required: true,
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    
    userreferId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    },
    testreferId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ScheduleTest", 
      default: null 
    },

   
    amount: { 
      type: Number, 
      required: true 
    },
    walletBalance: { 
      type: Number, 
      default: 0 
    },
    paymentStatus: { 
      type: Boolean, 
      default: false  
    },

    
    orderId: { 
      type: String, 
    },
    transactionId: { 
      type: String, 
      default: null 
    },
    paymentGateway: { 
      type: String, 
      default: "PhonePe" 
    },
    paymentResponse: { 
      type: Object, 
      default: {} 
    },

    status: { 
      type: String, 
      enum: ["PENDING", "COMPLETED", "FAILED"], 
      default: "PENDING" 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BuyTest", BuyTestSchema);
