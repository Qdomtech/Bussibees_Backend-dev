const fs = require('fs');
const path = require('path');
const GovernmentCourse = require('../models/governmentcourse');
const ScheduleTest = require('../models/testscheduled');
const clientUserModule = require('../models/user');
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const ExamType = require('../models/examtype');
const UserGovCourseAnswer = require('../models/userQuizAnswer');
const GovCourseResult = require('../models/govCourseResult');
const Buy = require('../models/buy');
const Wallet = require('../models/wallet')
const moment = require('moment-timezone');


exports.createGovernmentCourse = async (req, res) => {
  try {
    const {
      _id,
      category,
      subcategory,
      courseName,
      courseDescription,
      courseValidity,
      coursePrice,
      testSeries,
      testTime,
      maximumMark,
      negativeMark,
      expireDate,
      categoryType,
      subject,
    } = req.body;

    const createdBy = req.user._id;

    if (!_id && (!category || !subcategory || !courseName)) {
      return res.status(400).json({
        message: "category, subcategory, and courseName are required.",
      });
    }

    // === Course Image ===
    const courseImagePath =
      req.files?.courseImages?.[0]?.path?.split("uploads")[1]
        ? "uploads" +
          req.files.courseImages[0].path.split("uploads")[1].replace(/\\/g, "/")
        : null;

    // === eBook ===
    const ebookPath =
      req.files?.ebookFile?.[0]?.path?.split("uploads")[1]
        ? "uploads" +
          req.files.ebookFile[0].path.split("uploads")[1].replace(/\\/g, "/")
        : null;

    // === Study Notes ===
    const studyNotePath =
      req.files?.studyNoteFile?.[0]?.path?.split("uploads")[1]
        ? "uploads" +
          req.files.studyNoteFile[0].path.split("uploads")[1].replace(/\\/g, "/")
        : null;

    // === Video Lectures ===
    let videoLecturesArray = [];
    if (req.body.videoLectureGroups) {
      try {
        const parsedLectures = JSON.parse(req.body.videoLectureGroups);
        if (Array.isArray(parsedLectures)) {
          videoLecturesArray = parsedLectures.map((v) => ({
            videoLectureName: v.videoLectureName || "",
            videoLectureLink: v.videoLectureLink || "",
          }));
        }
      } catch (err) {
        return res.status(400).json({
          message: "Invalid videoLectureGroups format.",
          error: err.message,
        });
      }
    }

    // === Test Series ===
    let testSeriesArray = [];
    if (testSeries) {
      try {
        const parsedTestSeries =
          typeof testSeries === "string"
            ? JSON.parse(testSeries)
            : testSeries;

        if (!Array.isArray(parsedTestSeries)) {
          return res
            .status(400)
            .json({ message: "testSeries must be an array." });
        }

        // Get existing course data if updating
        let existingCourse = null;
        if (_id) {
          existingCourse = await GovernmentCourse.findById(_id);
        }

        testSeriesArray = parsedTestSeries.map((series, topicIndex) => {
          if (!series.topicName || !Array.isArray(series.topicQuestions)) {
            throw new Error(
              "Each testSeries item must have topicName and topicQuestions array."
            );
          }

          const topicQuestions = series.topicQuestions.map((q, questionIndex) => {
            const { answer } = q;

            // Check if answer exists
            if (!answer) {
              throw new Error(`Answer is missing in question "${q.question || ""}"`);
            }

            // Get files for this specific topic and question
            const questionImageFile = req.files?.questionImage?.[topicIndex]?.[questionIndex];
            const option1ImageFile = req.files?.option1Image?.[topicIndex]?.[questionIndex];
            const option2ImageFile = req.files?.option2Image?.[topicIndex]?.[questionIndex];
            const option3ImageFile = req.files?.option3Image?.[topicIndex]?.[questionIndex];
            const option4ImageFile = req.files?.option4Image?.[topicIndex]?.[questionIndex];
            const option5ImageFile = req.files?.option5Image?.[topicIndex]?.[questionIndex];

            // Get existing images if updating and no new file is provided
            let existingQuestionImage = "";
            let existingOption1Image = "";
            let existingOption2Image = "";
            let existingOption3Image = "";
            let existingOption4Image = "";
            let existingOption5Image = "";

            if (existingCourse && existingCourse.testSeries && 
                existingCourse.testSeries[topicIndex] && 
                existingCourse.testSeries[topicIndex].topicQuestions[questionIndex]) {
              
              const existingQuestion = existingCourse.testSeries[topicIndex].topicQuestions[questionIndex];
              
              existingQuestionImage = existingQuestion.questionImage || "";
              existingOption1Image = existingQuestion.option1Image || "";
              existingOption2Image = existingQuestion.option2Image || "";
              existingOption3Image = existingQuestion.option3Image || "";
              existingOption4Image = existingQuestion.option4Image || "";
              existingOption5Image = existingQuestion.option5Image || "";
            }

            return {
              question: q.question || "",
              questionImage: questionImageFile ? "uploads/" + questionImageFile.filename : existingQuestionImage,

              option1: q.option1 || "",
              option1Image: option1ImageFile ? "uploads/" + option1ImageFile.filename : existingOption1Image,

              option2: q.option2 || "",
              option2Image: option2ImageFile ? "uploads/" + option2ImageFile.filename : existingOption2Image,

              option3: q.option3 || "",
              option3Image: option3ImageFile ? "uploads/" + option3ImageFile.filename : existingOption3Image,

              option4: q.option4 || "",
              option4Image: option4ImageFile ? "uploads/" + option4ImageFile.filename : existingOption4Image,

              option5: q.option5 || "",
              option5Image: option5ImageFile ? "uploads/" + option5ImageFile.filename : existingOption5Image,

              answer,
            };
          });

          return {
            topicName: series.topicName,
            topicQuestions,
          };
        });
      } catch (err) {
        return res.status(400).json({
          message: "Invalid testSeries format.",
          error: err.message,
        });
      }
    }

    // === Create or Update ===
    let course;
    if (_id) {
      const existing = await GovernmentCourse.findById(_id);
      if (!existing)
        return res.status(404).json({ message: "Course not found" });

      const updateData = {
        category: category || existing.category,
        subcategory: subcategory || existing.subcategory,
        courseName: courseName || existing.courseName,
        courseDescription: courseDescription || existing.courseDescription,
        courseValidity: courseValidity || existing.courseValidity,
        coursePrice: coursePrice || existing.coursePrice,
        maximumMark: maximumMark || existing.maximumMark,
        negativeMark: negativeMark || existing.negativeMark,
        expireDate: expireDate || existing.expireDate,
        studyNotes: studyNotePath || existing.studyNotes,
        videoLectures:
          videoLecturesArray.length > 0
            ? videoLecturesArray
            : existing.videoLectures,
        testSeries:
          testSeriesArray.length > 0 ? testSeriesArray : existing.testSeries,
        courseImages: courseImagePath || existing.courseImages,
        ebook: ebookPath || existing.ebook,
        categoryType: categoryType || existing.categoryType,
        subject: subject || existing.subject,
        testTime: testTime || existing.testTime,
      };

      course = await GovernmentCourse.findByIdAndUpdate(_id, updateData, {
        new: true,
      });
    } else {
      course = new GovernmentCourse({
        category,
        subcategory,
        courseName,
        courseDescription,
        courseValidity,
        coursePrice,
        maximumMark,
        negativeMark,
        expireDate,
        studyNotes: studyNotePath,
        videoLectures: videoLecturesArray,
        testSeries: testSeriesArray,
        courseImages: courseImagePath,
        ebook: ebookPath,
        categoryType,
        testTime,
        subject,
        createdBy,
      });

      await course.save();
    }

    return res.status(_id ? 200 : 201).json({
      message: _id ? "Course updated successfully" : "Course created successfully",
      data: course,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


exports.addQuizToTopic = async (req, res) => {
  try {
    const { courseId, topic, quizQuestions } = req.body;
    const createdBy = req.user._id;

    if (!courseId || !topic || !quizQuestions) {
      return res.status(400).json({ message: 'courseId, topic, and quizQuestions are required.' });
    }

    let parsedQuiz = [];
    try {
      parsedQuiz = typeof quizQuestions === 'string' ? JSON.parse(quizQuestions) : quizQuestions;
    } catch (err) {
      return res.status(400).json({ message: 'quizQuestions must be valid JSON.' });
    }

    if (!Array.isArray(parsedQuiz)) {
      return res.status(400).json({ message: 'quizQuestions must be an array.' });
    }

    const course = await GovernmentCourse.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const quizData = parsedQuiz.map(q => ({
      testId: courseId,
      topic,
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      answer: q.answer,
      createdBy
    }));

    await Quiz.insertMany(quizData);

    return res.status(201).json({ message: 'Quiz questions added successfully.', topic, total: quizData.length });
  } catch (error) {
    console.error('Error adding quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.getGovernmentCourses = async (req, res) => {
  try {
    const courses = await GovernmentCourse.find()
      .populate('category subcategory subject')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Courses fetched successfully',
      data: courses
    });
  } catch (error) {
    console.error(' Error fetching courses:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.GovernmentCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await GovernmentCourse.findById(id)
      .populate('category subcategory subject createdBy')
      .lean();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // ✅ Calculate individual prices
    const {
      coursePrice = 0,
      ebookPercentage = 0,
      notePercentage = 0,
      videoPercentage = 0,
      testPercentage = 0
    } = course;

    const calculatePrice = (percentage) => Number(((coursePrice * percentage) / 100).toFixed(2));

    const ebookPrice = calculatePrice(ebookPercentage);
    const notePrice = calculatePrice(notePercentage);
    const videoPrice = calculatePrice(videoPercentage);
    const testPrice = calculatePrice(testPercentage);

    // ✅ Update course object with prices (for response)
    course.ebookPrice = ebookPrice;
    course.notePrice = notePrice;
    course.videoPrice = videoPrice;
    course.testPrice = testPrice;

    // ✅ Optionally, update DB too
    await GovernmentCourse.findByIdAndUpdate(id, {
      ebookPrice,
      notePrice,
      videoPrice,
      testPrice
    });

    return res.status(200).json({
      message: 'Course fetched successfully',
      data: course
    });

  } catch (error) {
    console.error('❌ Error fetching course by ID:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.updateCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    if (!status) {
      status = 'Active';
    }
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Active or Inactive.' });
    }
    const updated = await GovernmentCourse.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Course not found' });
    }

    return res.status(200).json({
      message: `Course status updated to ${status}`,
      data: updated
    });
  } catch (error) {
    console.error('Error updating course status:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 


exports.updateGovernmentCourse = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      courseName,
      courseDescription,
      courseValidity,
      coursePrice,
      testSeries,
      maximumMark,
      negativeMark
    } = req.body;

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Course ID is required for update.' });
    }

    const existing = await GovernmentCourse.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const courseImagePath = req.files?.courseImages?.[0]?.path?.split('uploads')[1]
      ? 'uploads' + req.files.courseImages[0].path.split('uploads')[1].replace(/\\/g, '/')
      : null;

    const studyNotesArray = [];
    const studyNoteGroups = JSON.parse(req.body.studyNoteGroups || '[]');
    const studyNoteFiles = req.files?.studyNoteFile || [];
    let studyNoteIndex = 0;

    for (const group of studyNoteGroups) {
      const { categoryType, studyNoteNames } = group;
      const notes = [];

      for (const name of studyNoteNames) {
        const file = studyNoteFiles[studyNoteIndex++];
        if (file) {
          notes.push({
            studyNoteName: name,
            studyNoteFile: 'uploads/' + file.filename.replace(/\\/g, '/')
          });
        }
      }

      if (notes.length) {
        studyNotesArray.push({ categoryType, notes });
      }
    }
    const ebookArray = [];
    const ebookGroups = JSON.parse(req.body.ebookGroups || '[]');
    const ebookFiles = req.files?.ebookFile || [];
    let ebookFileIndex = 0;

    for (const group of ebookGroups) {
      const { categoryType, ebookNames = [] } = group;
      const ebooks = [];

      if (categoryType === 'Syllabus') {
        const file = ebookFiles[ebookFileIndex++];
        if (file) {
          ebooks.push({
            ebookName: 'Syllabus File',
            ebookFile: 'uploads/' + file.filename.replace(/\\/g, '/')
          });
        }
      } else {
        for (const name of ebookNames) {
          const file = ebookFiles[ebookFileIndex++];
          if (file) {
            ebooks.push({
              ebookName: name,
              ebookFile: 'uploads/' + file.filename.replace(/\\/g, '/')
            });
          }
        }
      }

      if (ebooks.length) {
        ebookArray.push({ categoryType, ebooks });
      }
    }
    const videoLecturesArray = [];
    const videoLectureGroups = JSON.parse(req.body.videoLectureGroups || '[]');

    for (const group of videoLectureGroups) {
      const { categoryType, lectures } = group;
      if (!Array.isArray(lectures) || !categoryType) continue;

      const mappedLectures = lectures.map(v => ({
        videoLectureName: v.videoLectureName,
        videoLectureLink: v.videoLectureLink
      }));

      if (mappedLectures.length) {
        videoLecturesArray.push({ categoryType, lectures: mappedLectures });
      }
    }
    let testSeriesArray = [];
    if (testSeries) {
      try {
        testSeriesArray = typeof testSeries === 'string' ? JSON.parse(testSeries) : testSeries;
      } catch (err) {
        return res.status(400).json({ message: 'Invalid testSeries format.', error: err.message });
      }
    }

    const updateData = {
      category: category || existing.category,
      subcategory: subcategory || existing.subcategory,
      courseName: courseName || existing.courseName,
      courseDescription: courseDescription || existing.courseDescription,
      courseValidity: courseValidity || existing.courseValidity,
      coursePrice: coursePrice || existing.coursePrice,
      maximumMark: maximumMark || existing.maximumMark,
      negativeMark: negativeMark || existing.negativeMark,
      studyNotes: studyNotesArray.length ? studyNotesArray : existing.studyNotes,
      videoLectures: videoLecturesArray.length ? videoLecturesArray : existing.videoLectures,
      testSeries: testSeriesArray.length ? testSeriesArray : existing.testSeries,
      courseImages: courseImagePath || existing.courseImages,
      ebook: ebookArray.length ? ebookArray : existing.ebook
    };

    const updated = await GovernmentCourse.findByIdAndUpdate(id, updateData, { new: true });

    return res.status(200).json({
      message: 'Course updated successfully',
      data: updated
    });

  } catch (error) {
    console.error(' Update error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.deleteGovernmentCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await GovernmentCourse.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Course not found or already deleted' });
    }

    return res.status(200).json({
      message: 'Course deleted successfully',
      data: deleted
    });
  } catch (error) {
    console.error('❌ Error deleting course:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.filterGovernmentCourses = async (req, res) => {
  try {
    const { category, subcategory,subject,categoryType } = req.query;

    const filter = {};

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategory = subcategory;
    }

    if (subject && mongoose.Types.ObjectId.isValid(subject)) {
      filter.subject = subject;
    }

    if (categoryType && typeof categoryType === 'string') {
      filter.categoryType = categoryType;
    }

    const courses = await GovernmentCourse.find(filter)
      .populate('category', 'name') 
      .populate('subcategory', 'name')
      .populate('subject', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Courses fetched successfully',
      data: courses
    });
  } catch (error) {
    console.error('Filter API Error:', error);
    return res.status(500).json({
      message: 'Server error while filtering courses',
      error: error.message
    });
  }
};
 

exports.getCategory = async (req, res) => {
  try {
    const courses = await GovernmentCourse.find()
      .select('category')
      .populate('category', 'name');

    // Use Map to ensure uniqueness by _id
    const categoryMap = new Map();

    courses.forEach(course => {
      const cat = course.category;
      if (cat && !categoryMap.has(cat._id.toString())) {
        categoryMap.set(cat._id.toString(), { _id: cat._id, name: cat.name });
      }
    });

    const uniqueCategories = Array.from(categoryMap.values());

    return res.status(200).json({
      message: 'Unique categories fetched successfully',
      data: uniqueCategories
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.saveUserCategory = async (req, res) => {
  try {
    const { userId, categoryId } = req.body;

    if (!userId || !categoryId) {
      return res.status(400).json({ message: "userId and categoryId are required" });
    }

    const user = await clientUserModule.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.category = categoryId;
    await user.save();

    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      message: "Category saved successfully to user",
      data: {
        userId: user._id,
        category: user.category
      },
      token 
    });

  } catch (error) {
    console.error("❌ Error saving category to user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.dashboardfiltercourse = async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    const userId = req.user._id;

    const filter = { status: "Active" };

    if (category && category.toLowerCase() !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategory = subcategory;
    }

    const purchased = await Buy.find({ userId, paymentstatus: true }).select('courseId').lean();
    const purchasedCourseIds = purchased.map(b => b.courseId?.toString());

    if (purchasedCourseIds.length > 0) {
      filter._id = { $nin: purchasedCourseIds };
    }

    let courses = await GovernmentCourse.find(filter)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');

    const currentDate = moment.tz("Asia/Kolkata").startOf('day');

    const coursesWithUrls = courses.filter(course => {
      // 🔹 Exclude expired courses
      if (course.expireDate) {
        const expireDateMoment = moment.tz(course.expireDate, "DD-MM-YYYY", "Asia/Kolkata");
        if (expireDateMoment.isBefore(currentDate)) return false;
      }

      // 🔹 Convert courseImages
      if (course.courseImages) {
        if (Array.isArray(course.courseImages)) {
          course.courseImages = course.courseImages.map(imgPath =>
            fs.existsSync(imgPath) ? `${baseUrl}/uploads/${path.basename(imgPath)}` : imgPath
          );
        } else if (typeof course.courseImages === 'string') {
          if (fs.existsSync(course.courseImages)) {
            course.courseImages = `${baseUrl}/uploads/${path.basename(course.courseImages)}`;
          }
        }
      }

      // 🔹 Convert ebook
      if (course.ebook && fs.existsSync(course.ebook)) {
        course.ebook = `${baseUrl}/uploads/${path.basename(course.ebook)}`;
      }

      // 🔹 Convert studyNotes
      if (course.studyNotes && fs.existsSync(course.studyNotes)) {
        course.studyNotes = `${baseUrl}/uploads/${path.basename(course.studyNotes)}`;
      }

      return true;
    });

    const hasPurchased = purchasedCourseIds.length > 0;
    const wallet = await Wallet.findOne({ refererId: userId }).lean();
    const totalEarning = wallet?.earning || 0;

    return res.status(200).json({
      message: 'Courses fetched successfully',
      earning: totalEarning,
      payment: hasPurchased,
      data: coursesWithUrls
    });

  } catch (error) {
    console.error('Filter API Error:', error);
    return res.status(500).json({
      message: 'Server error while filtering courses',
      error: error.message
    });
  }
};


exports.saveCoursePercentages = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ebookPercentage: null,
      notePercentage: null,
      videoPercentage: null,
      testPercentage: null
    };

    let total = 0;

    if (req.body.ebookPercentage !== undefined) {
      updateData.ebookPercentage = Number(req.body.ebookPercentage);
      total += updateData.ebookPercentage;
    }

    if (req.body.notePercentage !== undefined) {
      updateData.notePercentage = Number(req.body.notePercentage);
      total += updateData.notePercentage;
    }

    if (req.body.videoPercentage !== undefined) {
      updateData.videoPercentage = Number(req.body.videoPercentage);
      total += updateData.videoPercentage;
    }

    if (req.body.testPercentage !== undefined) {
      updateData.testPercentage = Number(req.body.testPercentage);
      total += updateData.testPercentage;
    }

    // Total must be exactly 100
    if (total !== 100) {
      return res.status(400).json({
        message: "Total percentage must be exactly 100."
      });
    }

    const updatedCourse = await GovernmentCourse.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.status(200).json({
      message: "Percentages saved successfully",
      data: updatedCourse
    });
  } catch (error) {
    console.error("Error saving percentages:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.submitGovCourseAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    let { courseId, testSeriesId, questionId, selectedAnswer, attemptId } = req.body;

    if (!testSeriesId || !questionId || !attemptId) {
      return res.status(400).json({
        message: "testSeriesId, questionId, and attemptId are required.",
      });
    }

    attemptId = String(attemptId);

    const testSeriesObjId = new mongoose.Types.ObjectId(testSeriesId);
    const questionObjId = new mongoose.Types.ObjectId(questionId);
    if (courseId) {
      const courseObjId = new mongoose.Types.ObjectId(courseId);
      const course = await GovernmentCourse.findById(courseObjId).lean();
      if (!course) return res.status(404).json({ message: "Course not found." });

      const testSeries = course.testSeries.find(
        (ts) => ts._id.toString() === testSeriesId
      );
      if (!testSeries) return res.status(404).json({ message: "Test Series not found." });

      const question = testSeries.topicQuestions.find(
        (q) => q._id.toString() === questionId
      );
      if (!question) return res.status(404).json({ message: "Question not found." });

      if (selectedAnswer) {
        await UserGovCourseAnswer.findOneAndUpdate(
          { userId, courseId: courseObjId, testSeriesId: testSeriesObjId, questionId: questionObjId, attemptId },
          { selectedAnswer },
          { upsert: true, new: true }
        );
        return res.status(200).json({ message: "Answer saved successfully.", attemptId });
      } else {
        await UserGovCourseAnswer.findOneAndDelete({
          userId, courseId: courseObjId, testSeriesId: testSeriesObjId, questionId: questionObjId, attemptId,
        });
        return res.status(200).json({ message: "Question skipped.", attemptId });
      }
    }
    const scheduleTest = await ScheduleTest.findOne({
      "testSeries._id": testSeriesObjId,
      "testSeries.topicQuestions._id": questionObjId,
      status: "Active",
    }).lean();

    if (!scheduleTest) return res.status(404).json({ message: "Scheduled Test not found." });

    const testSeries = scheduleTest.testSeries.find(
      (ts) => ts._id.toString() === testSeriesId
    );
    if (!testSeries) return res.status(404).json({ message: "Test Series not found in ScheduleTest." });

    const question = testSeries.topicQuestions.find(
      (q) => q._id.toString() === questionId
    );
    if (!question) return res.status(404).json({ message: "Question not found in ScheduleTest." });

    // ✅ Save / Skip
    if (selectedAnswer) {
      await UserGovCourseAnswer.findOneAndUpdate(
        { userId, testSeriesId: testSeriesObjId, questionId: questionObjId, attemptId },
        { selectedAnswer },
        { upsert: true, new: true }
      );
      return res.status(200).json({ message: "Answer saved successfully (ScheduleTest).", attemptId });
    } else {
      await UserGovCourseAnswer.findOneAndDelete({
        userId, testSeriesId: testSeriesObjId, questionId: questionObjId, attemptId,
      });
      return res.status(200).json({ message: "Question skipped (ScheduleTest).", attemptId });
    }

  } catch (error) {
    console.error("Error in submitGovCourseAnswer:", error.message);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};


exports.calculateGovCourseResult = async (req, res) => {
  try {
    const userId = req.user._id;
    let { courseId, testSeriesId, testTakeTime, attemptId } = req.body;

    if (!testSeriesId || !attemptId) {
      return res.status(400).json({ message: 'testSeriesId and attemptId are required.' });
    }

    attemptId = String(attemptId);
    const testSeriesObjId = new mongoose.Types.ObjectId(testSeriesId);

    // ✅ CASE 1: GovernmentCourse
    if (courseId) {
      const courseObjId = new mongoose.Types.ObjectId(courseId);
      const course = await GovernmentCourse.findById(courseObjId).lean();
      if (!course) return res.status(404).json({ message: 'Course not found.' });

      const testSeries = course.testSeries.find(ts => ts._id.toString() === testSeriesId);
      if (!testSeries) return res.status(404).json({ message: 'Test Series not found.' });

      const totalQuestions = testSeries.topicQuestions.length;
      const maximumMark = course.maximumMark || 1;
      const negativeMark = course.negativeMark || 0;
      const totalMarks = totalQuestions * maximumMark;

      const userAnswers = await UserGovCourseAnswer.find({
        userId,
        courseId: courseObjId,
        testSeriesId: testSeriesObjId,
        attemptId
      }).lean();

      let correct = 0, wrong = 0, totalScore = 0;

      for (let userAnswer of userAnswers) {
        const originalQuestion = testSeries.topicQuestions.find(
          q => q._id.toString() === userAnswer.questionId.toString()
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
      const percentage = totalQuestions === 0
        ? 0
        : Math.max(((totalScore / totalMarks) * 100), 0).toFixed(2);

      const result = await GovCourseResult.create({
        userId,
        courseId: courseObjId,
        testSeriesId: testSeriesObjId,
        attemptId,
        totalQuestions,
        attempted,
        correct,
        wrong,
        skipped,
        totalScore,
        maximumMark,
        negativeMark,
        percentage: Number(percentage),
        totalMarks,
        testTakeTime: testTakeTime || 0
      });

      return res.status(200).json({ message: 'Result calculated and saved.', result });
    }

    // ✅ CASE 2: ScheduleTest (no courseId)
    const scheduleTest = await ScheduleTest.findOne({
      "testSeries._id": testSeriesObjId,
      status: "Active"
    }).lean();

    if (!scheduleTest) return res.status(404).json({ message: 'Scheduled Test not found.' });

    const testSeries = scheduleTest.testSeries.find(ts => ts._id.toString() === testSeriesId);
    if (!testSeries) return res.status(404).json({ message: 'Test Series not found in ScheduleTest.' });

    const totalQuestions = testSeries.topicQuestions.length;
    const maximumMark = scheduleTest.marksPerQuestion || 1;
    const negativeMark = scheduleTest.negativeMarkings || 0;
    const totalMarks = totalQuestions * maximumMark;

    const userAnswers = await UserGovCourseAnswer.find({
      userId,
      testSeriesId: testSeriesObjId,
      attemptId
    }).lean();

    let correct = 0, wrong = 0, totalScore = 0;

    for (let userAnswer of userAnswers) {
      const originalQuestion = testSeries.topicQuestions.find(
        q => q._id.toString() === userAnswer.questionId.toString()
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
    const percentage = totalQuestions === 0
      ? 0
      : Math.max(((totalScore / totalMarks) * 100), 0).toFixed(2);

    const result = await GovCourseResult.create({
      userId,
      testSeriesId: testSeriesObjId,
      attemptId,
      totalQuestions,
      attempted,
      correct,
      wrong,
      skipped,
      totalScore,
      maximumMark,
      negativeMark,
      percentage: Number(percentage),
      totalMarks,
      testTakeTime: testTakeTime || 0
    });

    return res.status(200).json({ message: 'Result calculated and saved (ScheduleTest).', result });

  } catch (error) {
    console.error('Error in calculateGovCourseResult:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.getGovCourseResult = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId, testSeriesId } = req.query;

    const filter = { userId };

    if (testSeriesId && mongoose.Types.ObjectId.isValid(testSeriesId)) {
      filter.testSeriesId = testSeriesId;
    }

    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      filter.courseId = courseId;

      const results = await GovCourseResult.find(filter)
        .populate('courseId', 'courseName')
        .populate('testSeriesId')
        .sort({ createdAt: -1 });

      if (!results || results.length === 0) {
        return res.status(404).json({ message: 'No results found (GovernmentCourse).' });
      }

      return res.status(200).json({
        message: 'GovernmentCourse results fetched successfully.',
        data: results
      });
    }

    const results = await GovCourseResult.find(filter)
      .populate('testSeriesId')
      .sort({ createdAt: -1 });

    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'No results found (ScheduleTest).' });
    }

    return res.status(200).json({
      message: 'ScheduleTest results fetched successfully.',
      data: results
    });

  } catch (error) {
    console.error('Error fetching results:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};


exports.getLatestResult = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId, testSeriesId } = req.query;

    const filter = { userId };

    if (testSeriesId && mongoose.Types.ObjectId.isValid(testSeriesId)) {
      filter.testSeriesId = testSeriesId;
    }

    // ✅ CASE 1: GovernmentCourse (if courseId present)
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      filter.courseId = courseId;

      const latestResult = await GovCourseResult.findOne(filter)
        .populate('courseId', 'courseName')
        .populate('testSeriesId')
        .sort({ createdAt: -1 });

      if (!latestResult) {
        return res.status(404).json({ message: 'No latest result found (GovernmentCourse).' });
      }

      return res.status(200).json({
        message: 'Latest GovernmentCourse result fetched successfully.',
        data: latestResult
      });
    }

    // ✅ CASE 2: ScheduleTest (no courseId)
    const latestResult = await GovCourseResult.findOne(filter)
      .populate('testSeriesId') // ScheduleTest info populate hoga
      .sort({ createdAt: -1 });

    if (!latestResult) {
      return res.status(404).json({ message: 'No latest result found (ScheduleTest).' });
    }

    return res.status(200).json({
      message: 'Latest ScheduleTest result fetched successfully.',
      data: latestResult
    });

  } catch (error) {
    console.error('Error fetching latest result:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      error: error.message
    });
  }
};


exports.getTestQuestions = async (req, res) => {
  try {
    const { courseId, testSeriesId } = req.query;

    if (!courseId || !testSeriesId) {
      return res.status(400).json({ message: 'courseId and testSeriesId are required.' });
    }

    const course = await GovernmentCourse.findById(courseId).lean();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const test = course.testSeries?.find(t => t._id.toString() === testSeriesId);

    if (!test) {
      return res.status(404).json({ message: 'Test series not found' });
    }

    return res.status(200).json({
      message: 'Test questions fetched successfully',
      count: test.topicQuestions?.length || 0,
      questions: test.topicQuestions || []
    });

  } catch (err) {
    console.error('Error fetching test questions:', err);
    return res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};


exports.complimentaryCourses = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, subcategory, sortBy, sortbystatus, sortbyDate } = req.query;

    const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');
    const currentDate = moment.tz("Asia/Kolkata").startOf('day');

    let courses = await GovernmentCourse.find()
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();
    courses = courses.filter(course => {
      if (!course.expireDate) return false;
      const expireDateMoment = moment.tz(course.expireDate, "DD-MM-YYYY", "Asia/Kolkata");
      return expireDateMoment.isBefore(currentDate);
    });

    let complimentaryCourses = [];

    for (const course of courses) {
      if (category && category.toLowerCase() !== 'all' && course.category?._id?.toString() !== category) {
        continue;
      }
      if (subcategory && course.subcategory?._id?.toString() !== subcategory) {
        continue;
      }
      if (course.courseImages) {
        if (Array.isArray(course.courseImages)) {
          course.courseImages = course.courseImages.map(imgPath =>
            fs.existsSync(imgPath) ? `${baseUrl}/uploads/${path.basename(imgPath)}` : imgPath
          );
        } else if (typeof course.courseImages === 'string') {
          if (fs.existsSync(course.courseImages)) {
            course.courseImages = `${baseUrl}/uploads/${path.basename(course.courseImages)}`;
          }
        }
      }

      if (course.ebook && fs.existsSync(course.ebook)) {
        course.ebook = `${baseUrl}/uploads/${path.basename(course.ebook)}`;
      }
      if (course.studyNotes && fs.existsSync(course.studyNotes)) {
        course.studyNotes = `${baseUrl}/uploads/${path.basename(course.studyNotes)}`;
      }

      if (course.testSeries && Array.isArray(course.testSeries)) {
        course.testSeries = course.testSeries.map(ts => {
          if (ts.file && fs.existsSync(ts.file)) {
            ts.file = `${baseUrl}/uploads/${path.basename(ts.file)}`;
          }
          if (ts.topicQuestions && Array.isArray(ts.topicQuestions)) {
            ts.topicQuestions = ts.topicQuestions.map(q => {
              if (q.questionImage && fs.existsSync(q.questionImage)) {
                q.questionImage = `${baseUrl}/uploads/${path.basename(q.questionImage)}`;
              }
              for (let i = 1; i <= 5; i++) {
                const key = `option${i}Image`;
                if (q[key] && fs.existsSync(q[key])) {
                  q[key] = `${baseUrl}/uploads/${path.basename(q[key])}`;
                }
              }
              return q;
            });
          }
          return ts;
        });
      }

      course.ebookStatus = false;
      course.studyNotesStatus = false;
      course.videoLectureStatus = false;

      if (!course.ebook || course.ebook === "") delete course.ebook;
      if (!course.studyNotes || course.studyNotes === "") delete course.studyNotes;
      if (!course.videoLectures || !Array.isArray(course.videoLectures) || course.videoLectures.length === 0) {
        delete course.videoLectures;
      }
      if (!course.testSeries || !Array.isArray(course.testSeries) || course.testSeries.length === 0) {
        delete course.testSeries;
      }

      const sections = ["ebook", "studyNotes", "videoLectures", "testSeries"];
      const availableSections = sections.filter(sec => course[sec]);
      const totalSections = availableSections.length;
      const sectionWeight = totalSections > 0 ? 100 / totalSections : 0;

      let overallProgress = 0;

      if (course.ebook) {
        course.ebookStatus = true;
        overallProgress += sectionWeight;
      }
      if (course.studyNotes) {
        course.studyNotesStatus = true;
        overallProgress += sectionWeight;
      }
      if (Array.isArray(course.videoLectures) && course.videoLectures.length > 0) {
        course.videoLectureStatus = true;
        overallProgress += sectionWeight;
      }
      if (Array.isArray(course.testSeries) && course.testSeries.length > 0) {
        const perTopicWeight = sectionWeight / course.testSeries.length;

        for (const topic of course.testSeries) {
          const latestResult = await GovCourseResult.findOne({
            userId,
            courseId: course._id,
            testSeriesId: topic._id
          }).sort({ updatedAt: -1 }).lean();

          if (latestResult?.percentage !== undefined && latestResult?.percentage !== null) {
            topic.percentage = latestResult.percentage;
            overallProgress += perTopicWeight;
          } else {
            topic.percentage = null;
          }
        }
      }

      course.overallProgress = Number(overallProgress.toFixed(2));

      complimentaryCourses.push(course);
    }

    if (sortBy === 'oldest') {
      complimentaryCourses = complimentaryCourses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      complimentaryCourses = complimentaryCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (sortbystatus) {
      if (sortbystatus.toLowerCase() === "notstarted") {
        complimentaryCourses = complimentaryCourses.filter(c => c.overallProgress === 0);
      } else if (sortbystatus.toLowerCase() === "progress") {
        complimentaryCourses = complimentaryCourses.filter(c => c.overallProgress > 0 && c.overallProgress < 100);
      } else if (sortbystatus.toLowerCase() === "complete") {
        complimentaryCourses = complimentaryCourses.filter(c => c.overallProgress === 100);
      }
    }

    if (sortbyDate) {
      if (sortbyDate.toLowerCase() === "less") {
        complimentaryCourses.sort((a, b) => a.overallProgress - b.overallProgress);
      } else if (sortbyDate.toLowerCase() === "greater") {
        complimentaryCourses.sort((a, b) => b.overallProgress - a.overallProgress);
      }
    }

    return res.status(200).json({
      message: 'Complimentary courses fetched successfully',
      data: complimentaryCourses
    });

  } catch (error) {
    console.error('Complimentary API Error:', error);
    return res.status(500).json({
      message: 'Server error while fetching complimentary courses',
      error: error.message
    });
  }
};


exports.getGovCourseAnswersWithResult = async (req, res) => {
  try {
    const userId = req.user._id;
    let { courseId, testSeriesId, attemptId } = req.query;

    if (!testSeriesId || !attemptId) {
      return res.status(400).json({
        message: "testSeriesId and attemptId are required."
      });
    }

    attemptId = String(attemptId);

    const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");
    const convertToFullUrl = (filePath) => {
      if (!filePath) return filePath;
      return fs.existsSync(filePath)
        ? `${baseUrl}/uploads/${path.basename(filePath)}`
        : filePath;
    };

    let testSeries = null;
    let maximumMark = 1;
    let negativeMark = 0;
    let totalQuestions = 0;
    if (courseId) {
      const course = await GovernmentCourse.findById(courseId).lean();
      if (!course) return res.status(404).json({ message: "Course not found." });

      testSeries = course.testSeries.find(ts => ts._id.toString() === testSeriesId);
      if (!testSeries) return res.status(404).json({ message: "Test Series not found." });

      maximumMark = course.maximumMark || 1;
      negativeMark = course.negativeMark || 0;
      totalQuestions = testSeries.topicQuestions.length;
    }

    if (!courseId) {
      const scheduleTest = await ScheduleTest.findOne({
        "testSeries._id": new mongoose.Types.ObjectId(testSeriesId),
        status: "Active"
      }).lean();

      if (!scheduleTest) return res.status(404).json({ message: "Scheduled Test not found." });

      testSeries = scheduleTest.testSeries.find(ts => ts._id.toString() === testSeriesId);
      if (!testSeries) return res.status(404).json({ message: "Test Series not found in ScheduleTest." });

      maximumMark = scheduleTest.marksPerQuestion || 1;
      negativeMark = scheduleTest.negativeMarkings || 0;
      totalQuestions = testSeries.topicQuestions.length;
    }

    const filter = { 
      userId, 
      testSeriesId: new mongoose.Types.ObjectId(testSeriesId), 
      attemptId 
    };
    if (courseId) filter.courseId = new mongoose.Types.ObjectId(courseId);

    const userAnswers = await UserGovCourseAnswer.find(filter).lean();

    let totalCorrect = 0, totalWrong = 0, totalScore = 0;

    const questionsWithAnswers = testSeries.topicQuestions.map(q => {
      const userAnswer = userAnswers.find(
        ua => ua.questionId.toString() === q._id.toString()
      );

      let status = "Not Attempted";
      if (userAnswer) {
        if (userAnswer.selectedAnswer === q.answer) {
          status = "Correct";
          totalCorrect++;
          totalScore += maximumMark;
        } else {
          status = "Wrong";
          totalWrong++;
          totalScore -= negativeMark;
        }
      }

      const optionsArray = [];
      for (let i = 1; i <= 5; i++) {
        if (q[`option${i}`]) {
          optionsArray.push({
            key: `option${i}`,
            text: q[`option${i}`],
            image: convertToFullUrl(q[`option${i}Image`])
          });
        }
      }

      const correctOpt = optionsArray.find(opt => opt.key === q.answer);
      let selectedOpt = null;
      if (userAnswer && userAnswer.selectedAnswer) {
        selectedOpt = optionsArray.find(opt => opt.key === userAnswer.selectedAnswer) || null;
      }

      return {
        questionId: q._id,
        question: q.question,
        questionImage: convertToFullUrl(q.questionImage),
        options: optionsArray,
        correctAnswer: correctOpt || { key: q.answer },
        selectedAnswer: selectedOpt,
        status
      };
    });

    const totalNotAttempted = totalQuestions - (totalCorrect + totalWrong);
    totalScore = Math.max(totalScore, 0);
    let percentage = totalQuestions === 0 ? 0 : Math.max(((totalScore / (totalQuestions * maximumMark)) * 100), 0);
    percentage = percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(2);

    return res.status(200).json({
      message: "User answers with results fetched successfully.",
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalNotAttempted,
      totalScore,
      maximumMark,
      negativeMark,
      totalMarks: totalQuestions * maximumMark,
      percentage: `${percentage}%`,
      data: questionsWithAnswers
    });

  } catch (error) {
    console.error("Error in getGovCourseAnswersWithResult:", error);
    res.status(500).json({
      message: "Internal server error.",
      error: error.message
    });
  }
};


