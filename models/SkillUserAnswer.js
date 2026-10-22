const mongoose = require('mongoose');

const UserSkillAnswerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillCourse' },
  BundleId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedAnswer: { type: String },
  attemptId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('UserSkillAnswer', UserSkillAnswerSchema);
