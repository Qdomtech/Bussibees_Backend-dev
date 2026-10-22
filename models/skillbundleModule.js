const mongoose = require("mongoose");

const SkillBundleSchema = new mongoose.Schema({

  BundleName: {
    type: String
  },
  
  BundleImages: {
    type: String
  },
  tagline: {
    type: String
  },
  price: {
    type: String
  },
  

  description: {
    type: String
    
  },
 SkillCourseId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCourse",
      required: true
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("SkillBundle", SkillBundleSchema);
