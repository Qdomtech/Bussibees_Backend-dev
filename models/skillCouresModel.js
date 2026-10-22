const mongoose = require('mongoose');

const LectureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  link: {
    type: String
  },
  time: {
    type: String
  },
  about: {
    type: String
  },
  images: {
    type: String
  }
}, { _id: true });

const SkillCourseSchema = new mongoose.Schema({
  
  SkillcourseImages: {
    type: String
  },

  SkillName: {
    type: String
  },

  tagline: {
    type: String
  },
ebook:{
    type: String
  },
  About: {
    type: String
  },

  lectures: [LectureSchema],
assessment: [
  {
    question: { type: String, default: "" },      
    option1: { type: String, default: "" },
    option2: { type: String, default: "" },
    option3: { type: String, default: "" },
    option4: { type: String, default: "" },
    option5: { type: String, default: "" },
    answer: { type: String, default: "" }   
  }
],

  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin' 
  }

}, { timestamps: true });

module.exports = mongoose.model('SkillCourse', SkillCourseSchema);
