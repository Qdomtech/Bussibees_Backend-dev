const mongoose = require('mongoose');

const ExamTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['category', 'subcategory', 'subsubcategory'], required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('ExamType', ExamTypeSchema);