const mongoose = require('mongoose');

const UserGovCourseAnswerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentCourse' },
  testSeriesId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedAnswer: { type: String },
  attemptId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('UserGovCourseAnswer', UserGovCourseAnswerSchema);
