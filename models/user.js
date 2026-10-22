const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  mobileNo: {
    type: String,
    unique: true,
    sparse: true,
    match: /^\d{10}$/,
  },

  otp: {
    code: {
      type: String
    },
    expiration: {
      type: Date
    }
  },

  email: {
    type: String,
    default: null
  },

password: {
  type: String,

},


  emailOtp: {
    code: {
      type: String
    },
    expiration: {
      type: Date
    }
  },

  studentType: {
    type: String,
    required: true
  },

  examType: {
    type: String,
    required: true
  },

  isMobileVerified: {
    type: Boolean,
    default: false
  },
 
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  firstName: { type: String },
  middleName: { type: String },
lastName: { type: String },
country: { type: String },
state: { type: String },
city: { type: String },
pincode: { type: String },
refer: [
  {
    userreferId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    coursereferId: { type: mongoose.Schema.Types.ObjectId, ref: "GovernmentCourse" },
    testreferId: { type: mongoose.Schema.Types.ObjectId, ref: "ScheduleTest" },
    date: { type: Date, default: Date.now }
  }
],
Userskillreferid:[{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
showWelcomeMessage: {
  type: Boolean,
  default: true
},
earning: {
  type: Number,
  default: 0
},
 category: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType', },

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
