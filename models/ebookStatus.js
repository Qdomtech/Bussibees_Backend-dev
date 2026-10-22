const mongoose = require("mongoose");

const EbookStatussechema = new mongoose.Schema(
  {
    CourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCourse",
      required: true,
    },
     BundleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SkillBundle",
          required: true,
        },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    isReadEbook: { 
      type:Boolean,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EbookStatus", EbookStatussechema);
