const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType',  required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType',  required: true },

  name:{
    type: String
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });
module.exports = mongoose.model('Subject', SubjectSchema);