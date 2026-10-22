
const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user: { type: String, required: true }, 
  role: { type: String, default: "user" },
  message: { type: String, required: true },
 testId: { type: String, required: true },
  messageTime: { type: String, required: true },
  reports: { type: Number, default: 0 },
 reportedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    testId: { type: String }
  }], 
  group: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
