const SkillCourse = require("../models/skillCouresModel");
const UserSkillAnswer = require("../models/SkillUserAnswer");
const SkillCourseResult = require("../models/SkillCourseResult");
const BuyBundle = require("../models/BuyBundlesModels");
const SkillBundle = require("../models/skillbundleModule");
const Referral = require("../models/refralleval");
const User = require("../models/user");

const mongoose = require('mongoose');

// exports.createSkillCourse = async (req, res) => {
//   try {
//     const { _id, SkillName, tagline, About } = req.body;
//     const createdBy = req.user?.id || req.user;

//     let existingCourse = null;
//     if (_id && _id !== "null" && _id !== "") {
//       existingCourse = await SkillCourse.findById(_id);
//       if (!existingCourse) {
//         return res.status(404).json({
//           success: false,
//           message: "Course not found",
//         });
//       }
//     }
//     let courseImage = existingCourse?.SkillcourseImages || null;

//     const courseFile = req.files?.find(
//       (file) => file.fieldname === "SkillcourseImages"
//     );

//     if (courseFile) {
//       courseImage = courseFile.location || courseFile.path;
//     }

//     let ebookPath = existingCourse?.ebook || null;

//     const ebookFile = req.files?.find(
//       (file) => file.fieldname === "ebook"
//     );

//     if (ebookFile) {
//       ebookPath = ebookFile.location || ebookFile.path;
//     }

//     if (!_id || _id === "null" || _id === "") {

//       let lecturesArray = [];
//       let assessmentArray = [];


//       if (req.body.lectures) {
//         const parsedLectures = JSON.parse(req.body.lectures);

//         lecturesArray = parsedLectures.map((lecture, index) => {
//           const lectureImageFile = req.files?.find(
//             (file) => file.fieldname === `lectureImages[${index}]`
//           );

//           return {
//             name: lecture.name,
//             link: lecture.link,
//             time: lecture.time,
//             about: lecture.about,
//             images: lectureImageFile
//               ? lectureImageFile.location || lectureImageFile.path
//               : null,
//           };
//         });
//       }

      
//       if (req.body.assessment) {
//         assessmentArray = JSON.parse(req.body.assessment);
//       }

//       const newCourse = await SkillCourse.create({
//         SkillName,
//         tagline,
//         About,
//         SkillcourseImages: courseImage,
//         ebook: ebookPath,
//         lectures: lecturesArray,
//         assessment: assessmentArray,
//         createdBy,
//       });

//       return res.status(201).json({
//         success: true,
//         message: "Skill Course created successfully",
//         data: newCourse,
//       });
//     }

//     await SkillCourse.findByIdAndUpdate(_id, {
//       SkillName: SkillName || existingCourse.SkillName,
//       tagline: tagline || existingCourse.tagline,
//       About: About || existingCourse.About,
//       SkillcourseImages: courseImage,
//       ebook: ebookPath,
//     });
//     if (req.body.lectures) {

//       const parsedLectures = JSON.parse(req.body.lectures);

//       const formattedLectures = parsedLectures.map((lecture, index) => {

//         const lectureImageFile = req.files?.find(
//           (file) => file.fieldname === `lectureImages[${index}]`
//         );

//         return {
//           name: lecture.name,
//           link: lecture.link,
//           time: lecture.time,
//           about: lecture.about,
//           images: lectureImageFile
//             ? lectureImageFile.location || lectureImageFile.path
//             : null,
//         };
//       });

//       await SkillCourse.findByIdAndUpdate(_id, {
//         $push: { lectures: { $each: formattedLectures } }
//       });
//     }
//     if (req.body.assessment) {

//       const parsedAssessment = JSON.parse(req.body.assessment);

//       await SkillCourse.findByIdAndUpdate(_id, {
//         $push: { assessment: { $each: parsedAssessment } }
//       });
//     }

//     const finalCourse = await SkillCourse.findById(_id);

//     return res.status(200).json({
//       success: true,
//       message: "Skill Course updated successfully",
//       data: finalCourse,
//     });

//   } catch (error) {
//     console.error("SkillCourse Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


exports.createSkillCourse = async (req, res) => {
  try {
    const { _id, SkillName, tagline, About } = req.body;
    const createdBy = req.user?.id || req.user;
    let existingCourse = null;

    if (_id && _id !== "null" && _id !== "") {
      existingCourse = await SkillCourse.findById(_id);
      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
    }
    let courseImage = existingCourse?.SkillcourseImages || null;

    const courseFile = req.files?.find(
      (file) => file.fieldname === "SkillcourseImages"
    );

    if (courseFile) {
      courseImage = courseFile.location || courseFile.path;
    }
    let ebookPath = existingCourse?.ebook || null;

    const ebookFile = req.files?.find(
      (file) => file.fieldname === "ebook"
    );

    if (ebookFile) {
      ebookPath = ebookFile.location || ebookFile.path;
    }

    if (!_id || _id === "null" || _id === "") {

      let lecturesArray = [];
      let assessmentArray = [];
      if (req.body.lectures) {
        const parsedLectures =
          typeof req.body.lectures === "string"
            ? JSON.parse(req.body.lectures)
            : req.body.lectures;

        lecturesArray = parsedLectures.map((lecture, index) => {

          const lectureImageFile = req.files?.find(
            (file) => file.fieldname === `lectureImages[${index}]`
          );

          return {
            name: lecture.name,
            link: lecture.link,
            time: lecture.time,
            about: lecture.about,
            images: lectureImageFile
              ? lectureImageFile.location || lectureImageFile.path
              : lecture.images || null,   
          };
        });
      }

      if (req.body.assessment) {
        assessmentArray =
          typeof req.body.assessment === "string"
            ? JSON.parse(req.body.assessment)
            : req.body.assessment;
      }

      const newCourse = await SkillCourse.create({
        SkillName,
        tagline,
        About,
        SkillcourseImages: courseImage,
        ebook: ebookPath,
        lectures: lecturesArray,
        assessment: assessmentArray,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Skill Course created successfully",
        data: newCourse,
      });
    }
    await SkillCourse.findByIdAndUpdate(_id, {
      SkillName: SkillName || existingCourse.SkillName,
      tagline: tagline || existingCourse.tagline,
      About: About || existingCourse.About,
      SkillcourseImages: courseImage,
      ebook: ebookPath,
    });
    if (req.body.lectures) {

      const parsedLectures =
        typeof req.body.lectures === "string"
          ? JSON.parse(req.body.lectures)
          : req.body.lectures;

      const formattedLectures = parsedLectures.map((lecture, index) => {

        const lectureImageFile = req.files?.find(
          (file) => file.fieldname === `lectureImages[${index}]`
        );

        return {
          name: lecture.name,
          link: lecture.link,
          time: lecture.time,
          about: lecture.about,
          images: lectureImageFile
            ? lectureImageFile.location || lectureImageFile.path
            : lecture.images || null, 
        };
      });

      await SkillCourse.findByIdAndUpdate(_id, {
        $push: { lectures: { $each: formattedLectures } }
      });
    }
    if (req.body.assessment) {

      const parsedAssessment =
        typeof req.body.assessment === "string"
          ? JSON.parse(req.body.assessment)
          : req.body.assessment;

      await SkillCourse.findByIdAndUpdate(_id, {
        $push: { assessment: { $each: parsedAssessment } }
      });
    }

    const finalCourse = await SkillCourse.findById(_id);

    return res.status(200).json({
      success: true,
      message: "Skill Course created successfully",
      data: finalCourse,
    });

  } catch (error) {
    console.error("SkillCourse Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.SkillCourses = async (req, res) => {
  try {
    const courses = await SkillCourse.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("Get All SkillCourses Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getSkillCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await SkillCourse.findById(id)
      .populate("createdBy", "name email");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Skill Course not found",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("Get SkillCourse By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.UserSkillCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await SkillCourse.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Skill Course not found",
      });
    }

    let totalMinutes = 0;

    if (course.lectures && course.lectures.length > 0) {
      course.lectures.forEach((lecture) => {
        if (lecture.time) {
          const minutes = parseInt(lecture.time.replace(/\D/g, ""));
          if (!isNaN(minutes)) {
            totalMinutes += minutes;
          }
        }
      });
    }

    const updatedCourse = {
      ...course,
      TimeInMinutes: totalMinutes,
      TimeInHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
    };

    res.status(200).json({
      success: true,
      data: updatedCourse,
    });

  } catch (error) {
    console.error("Get SkillCourse By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.deleteSkillCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await SkillCourse.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Skill Course not found",
      });
    }

    await SkillCourse.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Skill Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete SkillCourse Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.updateSkillCourse = async (req, res) => {
  try {
    const { SkillName, tagline, About } = req.body;
    const courseId = req.params.id;
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required in URL params",
      });
    }

    const existingCourse = await SkillCourse.findById(courseId);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }
    const getFileOrStringOrNull = (fieldName, keepOld = true, oldValue = null) => {
      const file = req.files?.find((f) => f.fieldname === fieldName);
      if (file) {
        return file.location || file.path;
      }

      if (
        req.body[fieldName] &&
        typeof req.body[fieldName] === "string" &&
        req.body[fieldName].trim() !== ""
      ) {
        return req.body[fieldName];
      }

      return keepOld ? oldValue : null;
    };

    const courseImage = getFileOrStringOrNull(
      "SkillcourseImages",
      true,
      existingCourse.SkillcourseImages
    );

    const ebookPath = getFileOrStringOrNull(
      "ebook",
      true,
      existingCourse.ebook
    );

    const bundleImage = getFileOrStringOrNull(
      "BundleImages",
      false
    );

    let lecturesArray = existingCourse.lectures;

    if (req.body.lectures) {
      const parsedLectures =
        typeof req.body.lectures === "string"
          ? JSON.parse(req.body.lectures)
          : req.body.lectures;

      lecturesArray = parsedLectures.map((lecture, index) => {
        const lectureImageFile = req.files?.find(
          (file) => file.fieldname === `lectureImages[${index}]`
        );

        return {
          name: lecture.name,
          link: lecture.link,
          time: lecture.time,
          about: lecture.about,
          images: lectureImageFile
            ? lectureImageFile.location || lectureImageFile.path
            : lecture.images || null,
        };
      });
    }

 
    let assessmentArray = existingCourse.assessment;

    if (req.body.assessment) {
      assessmentArray =
        typeof req.body.assessment === "string"
          ? JSON.parse(req.body.assessment)
          : req.body.assessment;
    }
    const updatedCourse = await SkillCourse.findByIdAndUpdate(
      courseId,
      {
        SkillName: SkillName ?? existingCourse.SkillName,
        tagline: tagline ?? existingCourse.tagline,
        About: About ?? existingCourse.About,
        SkillcourseImages: courseImage,
        ebook: ebookPath,
        BundleImages: bundleImage,
        lectures: lecturesArray,
        assessment: assessmentArray,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Skill Course updated successfully",
      data: updatedCourse,
    });

  } catch (error) {
    console.error("Update SkillCourse Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.submitSkillCourseAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    let { courseId, BundleId, questionId, selectedAnswer, attemptId } = req.body;

    if (!courseId || !BundleId || !questionId || !attemptId) {
      return res.status(400).json({
        message: "courseId, BundleId, questionId and attemptId are required.",
      });
    }

    attemptId = String(attemptId);

    const courseObjId = new mongoose.Types.ObjectId(courseId);
    const bundleObjId = new mongoose.Types.ObjectId(BundleId);
    const questionObjId = new mongoose.Types.ObjectId(questionId);

    const course = await SkillCourse.findById(courseObjId).lean();
    if (!course) {
      return res.status(404).json({ message: "Skill Course not found." });
    }

    const question = course.assessment.find(
      (q) => q._id.toString() === questionId
    );

    if (!question) {
      return res.status(404).json({ message: "Question not found in assessment." });
    }

    if (selectedAnswer) {
      await UserSkillAnswer.findOneAndUpdate(
        {
          userId,
          courseId: courseObjId,
          BundleId: bundleObjId,
          questionId: questionObjId,
          attemptId,
        },
        { selectedAnswer },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        message: "Answer saved successfully.",
        attemptId,
      });
    } else {
      await UserSkillAnswer.findOneAndDelete({
        userId,
        courseId: courseObjId,
        BundleId: bundleObjId,
        questionId: questionObjId,
        attemptId,
      });

      return res.status(200).json({
        message: "Question skipped.",
        attemptId,
      });
    }

  } catch (error) {
    console.error("Error in submitSkillCourseAnswer:", error.message);
    res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};


exports.calculateSkillCourseResult = async (req, res) => {
  try {
    const userId = req.user._id;
    let { BundleId, courseId, attemptId, testTakeTime } = req.body;

    if (!BundleId || !courseId || !attemptId) {
      return res.status(400).json({
        message: "BundleId, courseId and attemptId are required.",
      });
    }

    attemptId = String(attemptId);

    const bundleObjId = new mongoose.Types.ObjectId(BundleId);
    const courseObjId = new mongoose.Types.ObjectId(courseId);
    const course = await SkillCourse.findById(courseObjId).lean();
    if (!course) {
      return res.status(404).json({ message: "Skill Course not found." });
    }

    const totalQuestions = course.assessment.length;

    const maximumMark = 1;     
    const negativeMark = 0;  
    const totalMarks = totalQuestions * maximumMark;
    const userAnswers = await UserSkillAnswer.find({
      userId,
      courseId: courseObjId,
      BundleId: bundleObjId,
      attemptId,
    }).lean();

    let correct = 0;
    let wrong = 0;
    let totalScore = 0;

    for (let userAnswer of userAnswers) {
      const originalQuestion = course.assessment.find(
        (q) => q._id.toString() === userAnswer.questionId.toString()
      );

      if (originalQuestion) {
        if (userAnswer.selectedAnswer === originalQuestion.answer) {
          correct++;
          totalScore += maximumMark;
        } else {
          wrong++;
          totalScore -= negativeMark;
        }
      }
    }

    const attempted = userAnswers.length;
    const skipped = totalQuestions - attempted;

    totalScore = Math.max(totalScore, 0);

    const percentage =
      totalQuestions === 0
        ? 0
        : Number(((totalScore / totalMarks) * 100).toFixed(2));

    
    const result = await SkillCourseResult.create({
      userId,
      BundleId: bundleObjId,
      courseId: courseObjId,
      attemptId,
      totalQuestions,
      attempted,
      correct,
      wrong,
      skipped,
      totalScore,
      maximumMark,
      negativeMark,
      percentage,
      totalMarks,
      testTakeTime: testTakeTime || 0,
    });

    return res.status(200).json({
      message: "Skill Course Result calculated and saved.",
      result,
    });

  } catch (error) {
    console.error("Error in calculateSkillCourseResult:", error);
    res.status(500).json({
      message: "Internal server error.",
    });
  }
};


exports.SkillCourseResult = async (req, res) => {
  try {
    const userId = req.user._id;
    const { BundleId, courseId } = req.query;

    const filter = { userId };

    if (BundleId && mongoose.Types.ObjectId.isValid(BundleId)) {
      filter.BundleId = BundleId;
    }

    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      filter.courseId = courseId;
    }

    const results = await SkillCourseResult.find(filter)
      .populate('courseId', 'SkillName')
      .populate('BundleId')
      .sort({ createdAt: -1 });

    if (!results || results.length === 0) {
      return res.status(404).json({
        message: "No Skill Course results found."
      });
    }

    return res.status(200).json({
      message: "Skill Course results fetched successfully.",
      data: results
    });

  } catch (error) {
    console.error("Error fetching Skill Course results:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message
    });
  }
};


// exports.LatestSkillResult = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { BundleId, courseId } = req.query;

//     if (!BundleId || !courseId) {
//       return res.status(400).json({
//         message: "BundleId and courseId are required."
//       });
//     }

//     const filter = {
//       userId,
//       BundleId,
//       courseId
//     };

//     const latestResult = await SkillCourseResult.findOne(filter)
//       .populate('courseId', 'SkillName')
//       .populate('BundleId')
//       .sort({ createdAt: -1 });

//     if (!latestResult) {
//       return res.status(404).json({
//         message: "No latest result found (SkillCourse)."
//       });
//     }

//     return res.status(200).json({
//       message: "SkillCourse result fetched successfully.",
//       data: latestResult
//     });

//   } catch (error) {
//     console.error("Error fetching  SkillCourse result:", error);
//     return res.status(500).json({
//       message: "Internal server error.",
//       error: error.message
//     });
//   }
// };

exports.LatestSkillResult = async (req, res) => {
  try {
    const userId = req.user._id;
    const { BundleId, courseId } = req.query;

    if (!BundleId || !courseId) {
      return res.status(400).json({
        message: "BundleId and courseId are required."
      });
    }

    const filter = {
      userId,
      BundleId,
      courseId
    };

    const latestResult = await SkillCourseResult.findOne(filter)
      .sort({ createdAt: -1 })
      .select("totalQuestions percentage");

   
    if (!latestResult) {
      return res.status(200).json({
        message: "No result found.",
        data: {}
      });
    }

    return res.status(200).json({
      message: "SkillCourse result fetched successfully.",
      data: {
        totalQuestions: latestResult.totalQuestions,
        percentage: latestResult.percentage
      }
    });

  } catch (error) {
    console.error("Error fetching SkillCourse result:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message
    });
  }
};

exports.UsersCertificate = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("firstName middleName lastName");

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const results = await SkillCourseResult.find({ userId })
      .populate("courseId", "SkillName")
      .select("courseId createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const formattedResults = results.map(result => ({
      courseId: result.courseId,
      createdAt: result.createdAt.toISOString().split("T")[0] 
    }));

    return res.status(200).json({
      message: "User certificate data fetched successfully.",
      data: {
        fullName: `${user.firstName || ""} ${user.middleName || ""} ${user.lastName || ""}`.trim(),
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        courses: formattedResults
      }
    });

  } catch (error) {
    console.error("Error fetching certificate:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message
    });
  }
};





exports.AssessmentQuestions = async (req, res) => {
  try {
    const { courseId } = req.query;
    const userId = req.user?.id;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Course ID",
      });
    }

    const purchasedBundles = await BuyBundle.find({
      userId,
     paymentStatus: "SUCCESS",
    })
      .sort({ createdAt: -1 })
      .select("BundleId");

    if (!purchasedBundles.length) {
      return res.status(404).json({
        success: false,
        message: "No purchased bundles found",
      });
    }

    const bundleIds = purchasedBundles.map(b => b.BundleId);
    const bundle = await SkillBundle.findOne({
      _id: { $in: bundleIds },
      SkillCourseId: { $in: [courseId] },   
    })
      .select("BundleName")
      .lean();

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Course not found in your purchased bundles",
      });
    }
    const course = await SkillCourse.findById(courseId)
      .select("assessment SkillName")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Skill Course not found.",
      });
    }

    const questions = (course.assessment || []).map(q => ({
      _id: q._id,
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      option5: q.option5,
    }));

    return res.status(200).json({
      success: true,
      message: "Assessment questions fetched successfully.",
      bundle: {
        bundleId: bundle._id,
        bundleName: bundle.BundleName,
      },
      courseName: course.SkillName,
      count: questions.length,
      questions,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.createOrUpdateReferral = async (req, res) => {
  try {
    const { levelName, referralPercentage } = req.body;

    if (!levelName || referralPercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: "levelName and referralPercentage are required",
      });
    }

    let referral = await Referral.findOne({ levelName });

    if (referral) {
      referral.referralPercentage = referralPercentage;
      await referral.save();

      return res.status(200).json({
        success: true,
        message: "Referral updated successfully",
        data: referral,
      });
    } else {
      referral = await Referral.create({
        levelName,
        referralPercentage,
      });

      return res.status(201).json({
        success: true,
        message: "Referral created successfully",
        data: referral,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find().sort({ createdAt: 1 });
    return res.status(200).json({
      success: true,
      count: referrals.length,
      data: referrals,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// exports.AssessmentQuestions = async (req, res) => {
//   try {
//     const { courseId } = req.query;

//     if (!courseId) {
//       return res.status(400).json({
//         message: "courseId is required."
//       });
//     }

//     const course = await SkillCourse.findById(courseId)
//       .select("assessment SkillName")
//       .lean();

//     if (!course) {
//       return res.status(404).json({
//         message: "Skill Course not found."
//       });
//     }

//     const questions = (course.assessment || []).map(q => ({
//       _id: q._id,
//       question: q.question,
//       option1: q.option1,
//       option2: q.option2,
//       option3: q.option3,
//       option4: q.option4,
//       option5: q.option5
//     }));

//     return res.status(200).json({
//       message: "Assessment questions fetched successfully.",
//       courseName: course.SkillName,
//       count: questions.length,
//       questions
//     });

//   } catch (err) {
//     console.error("Error fetching assessment questions:", err);
//     return res.status(500).json({
//       message: "Server error",
//       error: err.message
//     });
//   }
// };