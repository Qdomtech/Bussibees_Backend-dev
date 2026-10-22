const mongoose = require('mongoose');

const GovCourseResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentCourse' },
  testSeriesId: { type: mongoose.Schema.Types.ObjectId, required: true },

  totalQuestions: { type: Number },
  attamptId: { type: Number },
  correct: { type: Number },
  wrong: { type: Number },
  skipped: { type: Number },
  totalScore: { type: Number }, 
  maximumMark: { type: Number }, 
  negativeMark: { type: Number }, 
  percentage: { type: Number },
  totalMarks: { type: Number },
  testTakeTime: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('GovCourseResult', GovCourseResultSchema);
