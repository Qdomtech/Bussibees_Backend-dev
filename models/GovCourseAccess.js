const mongoose = require("mongoose");

const GovCourseAccessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "GovernmentCourse", required: true },
  ebook: { type: Boolean, default: false },
  studyNotes: { type: Boolean, default: false },
  videoLectures: [
    {
      lectureId: { type: mongoose.Schema.Types.ObjectId },
      status: { type: Boolean, default: false }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("GovCourseAccess", GovCourseAccessSchema);
