const mongoose = require('mongoose');

const GovernmentSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType',  required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType',  required: true },

  courseImages:{
    type: String
  },
  ebook:{
    type: String
  },
  ebookPercentage:{
    type: Number
  },

  studyNotes:{
    type: String
  },
  notePercentage:{
    type: Number
  },
  
  courseName:{
    type: String,
     required: true
  },
  courseDescription:{
    type: String
  },

  courseValidity:{
    type: Number
  },
  
  coursePrice:{
    type: Number
  },

  maximumMark:{
    type: Number
  },
  negativeMark:{
    type: Number
  },
  expireDate:{
    type: String
  },
 
  categoryType: {
      type: String,
      enum: ['Syllabus', 'Subject', 'Topic'],
      
    },

 subject:{type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },

 
  videoPercentage:{
    type: Number
  },
  

  videoLectures: [
  {
    videoLectureName: { type: String },
    videoLectureLink: { type: String }
  }
],
testPercentage:{
    type: Number
  },
testTime:{
    type: Number
  },

testSeries: [
    {
      topicName: { type: String },
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


ebookPrice: { type: Number, default: 0 },
notePrice: { type: Number, default: 0 },
videoPrice: { type: Number, default: 0 },
testPrice: { type: Number, default: 0 },


status: {
  type: String,
  enum: ['Active', 'Inactive'],
  default: 'Inactive'
},
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });
module.exports = mongoose.model('GovernmentCourse', GovernmentSchema);