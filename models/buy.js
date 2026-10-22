const mongoose = require('mongoose');

const BuySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentCourse' },
  coursePrice: { type: Number },   // ✅ Add this
  paymentstatus: { type: Boolean, default: false },
  ebook: { type: Boolean },
  studyNotes: { type: Boolean },
  videoLectures: { type: Number },
  testseries: { type: Number },
  amount: { type: Number},  
  walletBalance: { type: Number },
  userreferId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  coursereferId: { type: mongoose.Schema.Types.ObjectId, ref: "GovernmentCourse", default: null },
  orderId: { type: String },
   status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING", // 🔑 new field
    },
  transactionId: { type: String }, // ✅ PhonePe ka transaction
  transactionReference: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Buy', BuySchema);
