const mongoose = require("mongoose");

const LectureStatussechema = new mongoose.Schema(
  {
     BundleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SkillBundle",
          required: true,
        },
    CourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCourse",
      required: true,
    },
    LectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCourse",
      required: true,
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    isReadLecture: { 
      type:Boolean,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LectureStatus", LectureStatussechema);
