const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  otp: {
    type: String
  },
  otpExpires: {
    type: Date
  },
  otpAttemptCount: { type: Number, default: 0 },
  otpBlockedUntil: { type: Date, default: null },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Admin', UserSchema);