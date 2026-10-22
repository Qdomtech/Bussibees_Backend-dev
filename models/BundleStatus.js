const mongoose = require("mongoose");

const BundleStatussechema = new mongoose.Schema(
  {
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
    Status: { 
      type:String, 
      required: true 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BundleStatus", BundleStatussechema);
