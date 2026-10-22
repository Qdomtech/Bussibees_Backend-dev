const mongoose = require('mongoose');

const ScheduleTestSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: true
  },
  examPrice: {
    type: Number,
    default: 0
  },

  marksPerQuestion: {
    type: Number,
    default: 0
  },

  negativeMarkings: {
    type: Number,
    default: 0
  },

 scheduleDate: {
      type: String, 
      required: true,
    },
    scheduleTime: {
      type: String, 
      required: true,
    },
  totalExamTime: {
    type: String,
    default: ""
  },

//   expireDate: {
//     type: String
//   },

  testSeries: [
    {
    //   topicName: { type: String },
      topicQuestions: [
        {
          question: { type: String, default: "" },
          questionImage: { type: String, default: "" },

          option1: { type: String, default: "" },
          option1Image: { type: String, default: "" },

          option2: { type: String, default: "" },
          option2Image: { type: String, default: "" },

          option3: { type: String, default: "" },
          option3Image: { type: String, default: "" },

          option4: { type: String, default: "" },
          option4Image: { type: String, default: "" },

          option5: { type: String, default: "" },
          option5Image: { type: String, default: "" },

          answer: { type: String, default: "" }
        }
      ]
    }
  ],

  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Inactive'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }

}, { timestamps: true });

module.exports = mongoose.model('ScheduleTest', ScheduleTestSchema);
