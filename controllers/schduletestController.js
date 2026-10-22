const axios = require('axios');
require('dotenv').config();
const crypto = require('crypto');
const ScheduleTest = require('../models/testscheduled');
const BuyTest = require('../models/buyschduleTest');
const Wallet = require('../models/wallet');
const moment = require("moment-timezone");
const GovCourseResult = require("../models/govCourseResult");

const IS_PRODUCTION = true

const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const SALT_INDEX = process.env.SALT_INDEX;


// const PHONEPE_CLIENT_ID = process.env.PHONEPE_TEST_CLIENT_ID;
// const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_TEST_SECRET;
// const SALT_INDEX = process.env.PHONEPE_TEST_SALT_INDEX;


const BASE_URL = IS_PRODUCTION
  ? "https://api.phonepe.com/apis/hermes"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";


exports.createTest = async (req, res) => {
  try {
    const {
      _id,
      examName,
      examPrice,
      testSeries,
      scheduleDate,
      scheduleTime,
      totalExamTime,
      marksPerQuestion,
      negativeMarkings,
    } = req.body || {};

    const createdBy = req.user._id;

    // ===== Process testSeries =====
    let testSeriesArray = [];
    if (testSeries) {
      try {
        const parsedTestSeries =
          typeof testSeries === "string" ? JSON.parse(testSeries) : testSeries;

        if (!Array.isArray(parsedTestSeries)) {
          return res
            .status(400)
            .json({ message: "testSeries must be an array." });
        }

        let existingCourse = null;
        if (_id) {
          existingCourse = await ScheduleTest.findById(_id);
        }

        testSeriesArray = parsedTestSeries.map((series, topicIndex) => {
          if (!series.topicName || !Array.isArray(series.topicQuestions)) {
            throw new Error(
              "Each testSeries item must have topicName and topicQuestions array."
            );
          }

          const topicQuestions = series.topicQuestions.map(
            (q, questionIndex) => {
              const { answer } = q;
              if (!answer) {
                throw new Error(
                  `Answer is missing in question "${q.question || ""}"`
                );
              }

              const questionImageFile =
                req.files?.questionImage?.[topicIndex]?.[questionIndex];
              const option1ImageFile =
                req.files?.option1Image?.[topicIndex]?.[questionIndex];
              const option2ImageFile =
                req.files?.option2Image?.[topicIndex]?.[questionIndex];
              const option3ImageFile =
                req.files?.option3Image?.[topicIndex]?.[questionIndex];
              const option4ImageFile =
                req.files?.option4Image?.[topicIndex]?.[questionIndex];
              const option5ImageFile =
                req.files?.option5Image?.[topicIndex]?.[questionIndex];

              let existingQuestionImage = "";
              let existingOption1Image = "";
              let existingOption2Image = "";
              let existingOption3Image = "";
              let existingOption4Image = "";
              let existingOption5Image = "";

              if (
                existingCourse &&
                existingCourse.testSeries &&
                existingCourse.testSeries[topicIndex] &&
                existingCourse.testSeries[topicIndex].topicQuestions[
                  questionIndex
                ]
              ) {
                const existingQuestion =
                  existingCourse.testSeries[topicIndex].topicQuestions[
                    questionIndex
                  ];

                existingQuestionImage = existingQuestion.questionImage || "";
                existingOption1Image = existingQuestion.option1Image || "";
                existingOption2Image = existingQuestion.option2Image || "";
                existingOption3Image = existingQuestion.option3Image || "";
                existingOption4Image = existingQuestion.option4Image || "";
                existingOption5Image = existingQuestion.option5Image || "";
              }

              return {
                question: q.question || "",
                questionImage: questionImageFile
                  ? "uploads/" + questionImageFile.filename
                  : existingQuestionImage,

                option1: q.option1 || "",
                option1Image: option1ImageFile
                  ? "uploads/" + option1ImageFile.filename
                  : existingOption1Image,

                option2: q.option2 || "",
                option2Image: option2ImageFile
                  ? "uploads/" + option2ImageFile.filename
                  : existingOption2Image,

                option3: q.option3 || "",
                option3Image: option3ImageFile
                  ? "uploads/" + option3ImageFile.filename
                  : existingOption3Image,

                option4: q.option4 || "",
                option4Image: option4ImageFile
                  ? "uploads/" + option4ImageFile.filename
                  : existingOption4Image,

                option5: q.option5 || "",
                option5Image: option5ImageFile
                  ? "uploads/" + option5ImageFile.filename
                  : existingOption5Image,

                answer,
              };
            }
          );

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

    // ===== Create or Update Test =====
    let course;
    if (_id) {
      const existing = await ScheduleTest.findById(_id);
      if (!existing) return res.status(404).json({ message: "Test not found" });

      const updateData = {
        examName: examName || existing.examName,
        examPrice: examPrice || existing.examPrice,
        marksPerQuestion: marksPerQuestion || existing.marksPerQuestion,
        negativeMarkings: negativeMarkings || existing.negativeMarkings,
        scheduleDate: scheduleDate || existing.scheduleDate,
        scheduleTime: scheduleTime || existing.scheduleTime,
        totalExamTime: totalExamTime || existing.totalExamTime,
        testSeries:
          testSeriesArray.length > 0 ? testSeriesArray : existing.testSeries,
      };

      course = await ScheduleTest.findByIdAndUpdate(_id, updateData, {
        new: true,
      });
    } else {
      course = new ScheduleTest({
        examName,
        examPrice,
        marksPerQuestion,
        negativeMarkings,
        scheduleDate,
        scheduleTime,
        totalExamTime,
        testSeries: testSeriesArray,
        createdBy,
      });

      await course.save();
    }

    // ===== Send Response =====
    return res.status(_id ? 200 : 201).json({
      message: _id ? "Test updated successfully" : "Test created successfully",
      data: course,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getschduleTest = async (req, res) => {
  try {
    const { id } = req.params;

    let test;
    if (id) {
      // Agar ID diya gaya hai to uss test ko fetch karo
      test = await ScheduleTest.findById(id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
    } else {
      // Agar ID nahi diya gaya to sabhi tests fetch karo
      test = await ScheduleTest.find();
    }

    return res.status(200).json({
      message: id ? "Test fetched successfully" : "All tests fetched successfully",
      data: test,
    });
  } catch (error) {
    console.error("❌ Error fetching Test:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteScheduleTest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Test ID is required" });
    }

    const deletedTest = await ScheduleTest.findByIdAndDelete(id);
    if (!deletedTest) {
      return res.status(404).json({ message: "Test not found" });
    }

    return res.status(200).json({
      message: "Test deleted successfully",
      data: deletedTest,
    });
  } catch (error) {
    console.error("❌ Error deleting Test:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// exports.UserScheduleTests = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized: Invalid token" });
//     }

//     const now = moment().tz("Asia/Kolkata");

//     // Fetch all active tests
//     const tests = await ScheduleTest.find({ status: "Active" }).lean();

//     // Fetch purchased tests for this user
//     const purchased = await BuyTest.find({ userId, paymentStatus: true })
//       .select("testId")
//       .lean();
//     const purchasedTestIds = purchased.map(p => p.testId.toString());

//     // Fetch completed results for this user
//     const completedResults = await GovCourseResult.find({ userId }).lean();
//     const resultsMap = {};
//     completedResults.forEach(r => {
//       if (r.testSeriesId) resultsMap[r.testSeriesId.toString()] = r;
//     });

//     // Merge tests with purchase & completed status
//     const testsWithStatus = tests
//       .map(test => {
//         const testSeriesId = test.testSeries?.[0]?._id || null;

//         // Check if this test has completed result
//         const completedResult = testSeriesId ? resultsMap[testSeriesId.toString()] : null;

//         // Determine if the test should be shown
//         let showTest = false;
//         let isPurchased = purchasedTestIds.includes(test._id.toString());

//         if (completedResult) {
//           showTest = true; // always show completed tests
//         } else if (isPurchased) {
//           const testDate = moment(test.scheduleDate, "DD-MM-YYYY");
//           showTest = testDate.isSameOrAfter(now, "day");
//         } else {
//           const testDateTime = moment.tz(
//             `${test.scheduleDate} ${test.scheduleTime}`,
//             "DD-MM-YYYY HH:mm:ss",
//             "Asia/Kolkata"
//           );
//           showTest = testDateTime.isAfter(now);
//         }

//         if (!showTest) return null;

//         // Remove testSeries array from response
//         const { testSeries, ...rest } = test;
//         return {
//           ...rest,
//           purchased: completedResult ? false : isPurchased, 
//           testSeriesId: testSeriesId,
//           completed: completedResult ? true : false,
//           ...(completedResult
//             ? {
//                 totalQuestions: completedResult.totalQuestions,
//                 correct: completedResult.correct,
//                 wrong: completedResult.wrong,
//                 skipped: completedResult.skipped,
//                 totalScore: completedResult.totalScore,
//                 maximumMark: completedResult.maximumMark,
//                 negativeMark: completedResult.negativeMark,
//                 percentage: completedResult.percentage,
//                 totalMarks: completedResult.totalMarks,
//                 testTakeTime: completedResult.testTakeTime
//               }
//             : {}),
//         };
//       })
//       .filter(Boolean); // remove nulls

//     return res.status(200).json({
//       message: "Active and completed tests fetched successfully",
//       data: testsWithStatus,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching tests:", error);
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


exports.UserScheduleTests = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const now = moment().tz("Asia/Kolkata");

    // 🔹 Fetch all active tests
    const tests = await ScheduleTest.find({ status: "Active" })
      .populate("testSeries") // to access totalQuestions
      .lean();

    // 🔹 Fetch purchased tests for this user
    const purchased = await BuyTest.find({ userId, paymentStatus: true })
      .select("testId")
      .lean();
    const purchasedTestIds = purchased.map(p => p.testId.toString());

    // 🔹 Fetch completed results for this user
    const completedResults = await GovCourseResult.find({ userId }).lean();
    const resultsMap = {};
    completedResults.forEach(r => {
      if (r.testSeriesId) resultsMap[r.testSeriesId.toString()] = r;
    });

    // 🔹 Merge tests with purchase & completed status
    const testsWithStatus = tests
      .map(test => {
        const testSeriesId = test.testSeries?.[0]?._id || null;

        // Check if this test has completed result
        const completedResult = testSeriesId
          ? resultsMap[testSeriesId.toString()]
          : null;

        let showTest = false;
        let isPurchased = purchasedTestIds.includes(test._id.toString());

        const testDateTime = moment.tz(
          `${test.scheduleDate} ${test.scheduleTime}`,
          "DD-MM-YYYY HH:mm:ss",
          "Asia/Kolkata"
        );

        if (completedResult) {
          showTest = true; // always show completed tests
        } else if (isPurchased) {
          const testDate = moment(test.scheduleDate, "DD-MM-YYYY");
          showTest = testDate.isSameOrAfter(now, "day");
        } else {
          showTest = testDateTime.isAfter(now);
        }

        if (!showTest) return null;

        // ✅ NEW CONDITION (IMPROVED):
        // Purchased, not completed, and schedule date has PASSED (strictly before today)
        const testDate = moment(test.scheduleDate, "DD-MM-YYYY");
        const today = now.clone().startOf("day");

        if (
          isPurchased &&
          !completedResult &&
          testDate.isBefore(today, "day") // date passed (not same day)
        ) {
          const { testSeries, ...rest } = test;
          return {
            ...rest,
            purchased: true,
            testSeriesId: testSeriesId,
            completed: true,
            totalQuestions: test.testSeries?.[0]?.totalQuestions || 0,
            correct: 0,
            wrong: 0,
            skipped: 0,
            totalScore: 0,
            maximumMark: 0,
            negativeMark: 0,
            percentage: 0,
            totalMarks: 0,
            testTakeTime: 0,
          };
        }

        // Remove testSeries array from response
        const { testSeries, ...rest } = test;

        return {
          ...rest,
          purchased: completedResult ? false : isPurchased,
          testSeriesId: testSeriesId,
          completed: completedResult ? true : false,
          ...(completedResult
            ? {
                totalQuestions: completedResult.totalQuestions,
                correct: completedResult.correct,
                wrong: completedResult.wrong,
                skipped: completedResult.skipped,
                totalScore: completedResult.totalScore,
                maximumMark: completedResult.maximumMark,
                negativeMark: completedResult.negativeMark,
                percentage: completedResult.percentage,
                totalMarks: completedResult.totalMarks,
                testTakeTime: completedResult.testTakeTime,
              }
            : {}),
        };
      })
      .filter(Boolean); // remove nulls

    return res.status(200).json({
      message: "Active and completed tests fetched successfully",
      data: testsWithStatus,
    });
  } catch (error) {
    console.error("❌ Error fetching tests:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


exports.userStatuscompletd = async (req, res) => {
  try {
    const userId = req.user?._id; 

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    // Fetch all results for this user
    const results = await GovCourseResult.find({ userId }).lean();

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "No results found for this user" });
    }

    return res.status(200).json({
      message: "User's results fetched successfully",
      data: results
    });

  } catch (error) {
    console.error("❌ Error fetching GovCourseResults:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};




exports.publiSchduletest = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    if (!status) {
      status = 'Active';
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Active or Inactive.' });
    }

    const updated = await ScheduleTest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'test not found' });
    }

    return res.status(200).json({
      message: `Test status updated to ${status}`,
      data: updated
    });
  } catch (error) {
    console.error('Error updating course status:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 


// exports.buyScheduleTest = async (req, res) => {
//   try {
//     const { testId, amount, walletBalance = 0, userreferId, testreferId } = req.body; 
//     const userId = req.user._id; 

//     const test = await ScheduleTest.findById(testId);
//     if (!test) {
//       return res.status(404).json({ message: "Test not found" });
//     }
  
//     if (walletBalance > 0) {
//       let wallet = await Wallet.findOne({ refererId: userId });

//       if (!wallet || wallet.earning < walletBalance) {
//         return res.status(400).json({ message: "Insufficient wallet balance" });
//       }

      
//       wallet.earning -= walletBalance;
//       await wallet.save();

      
//       await Wallet.updateMany(
//         { refererId: userId, status: true },
//         { $set: { status: false } }
//       );
//     }

    
//     const buy = new BuyTest({
//       testId,
//       userId,
//       amount,
//       walletBalance,
//       paymentStatus: true,   
//       status: "COMPLETED",
//       userreferId,  
//       testreferId,  
//     });

//     await buy.save();

//     return res.status(201).json({
//       message: "Test purchased successfully",
//       data: buy,
//     });

//   } catch (error) {
//     console.error("❌ Error buying test:", error);
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


exports.buyScheduleTest = async (req, res) => {
  try {
    const { testId, amount, walletBalance = 0, userreferId, testreferId } = req.body;
    const userId = req.user?._id;

    if (!testId || !userId) {
      return res.status(400).json({ message: "Test ID and User ID are required" });
    }

    const test = await ScheduleTest.findById(testId);
    if (!test) return res.status(404).json({ message: "Test not found" });

    // Wallet deduction if walletBalance > 0
    if (walletBalance > 0) {
      let wallet = await Wallet.findOne({ refererId: userId });
      if (!wallet || wallet.earning < walletBalance) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      wallet.earning -= walletBalance;
      await wallet.save();
      await Wallet.updateMany({ refererId: userId, status: true }, { $set: { status: false } });
    }

    // Detect environment by host
    const host = req.get('host'); // or req.hostname
    const isLive = host === "backend.bussibees.com";

    if (!isLive) {
      
      const buy = new BuyTest({
        testId,
        userId,
        amount,
        walletBalance,
        paymentStatus: true,
        status: "COMPLETED",
        userreferId,
        testreferId,
        orderId: "TEST_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      });

      await buy.save();

      return res.status(201).json({
        message: "Test purchased successfully payment bypass).",
        data: buy,
        paymentUrl: null,
      });
    }

    // LIVE → PhonePe integration
    if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET || !SALT_INDEX) {
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    const orderId = "ORDER_TEST_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    // Free / Wallet Only Purchase
    if (amount === 0) {
      const newBuy = new BuyTest({
        testId,
        userId,
        amount,
        walletBalance,
        paymentStatus: true,
        status: "COMPLETED",
        userreferId,
        testreferId,
        orderId,
      });
      await newBuy.save();
      return res.status(201).json({
        message: "Test purchased successfully (Free/Wallet only).",
        data: newBuy,
        paymentUrl: null,
      });
    }

    // Normal Purchase → Pending
    const newBuy = new BuyTest({
      testId,
      userId,
      amount,
      walletBalance,
      paymentStatus: false,
      status: "PENDING",
      userreferId,
      testreferId,
      orderId,
    });
    await newBuy.save();

    const payload = {
      merchantId: PHONEPE_CLIENT_ID,
      merchantTransactionId: orderId,
      merchantUserId: String(userId),
      amount: amount * 100,
      redirectUrl: `https://product.bussibees.com/competition-payment-redirect/${orderId}`,
      callbackUrl: `https://product.bussibees.com/api/v1/test/phonepe-status/${orderId}`,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const payloadString = JSON.stringify(payload);
    const base64Payload = Buffer.from(payloadString).toString("base64");
    const stringToHash = base64Payload + "/pg/v1/pay" + PHONEPE_CLIENT_SECRET;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = sha256 + "###" + SALT_INDEX;

    const response = await axios.post(
      `${BASE_URL}/pg/v1/pay`,
      { request: base64Payload },
      {
        headers: {
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": PHONEPE_CLIENT_ID,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      }
    );

    return res.status(201).json({
      message: "Test purchase initiated. Complete the payment.",
      data: newBuy,
      paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
    });

  } catch (error) {
    console.error("❌ Error buying test:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.response?.data || error.message,
    });
  }
};


exports.phonepeStatusTest = async (req, res) => {
  try {
    const { orderId } = req.params;

    const stringToHash = `/pg/v1/status/${PHONEPE_CLIENT_ID}/${orderId}` + PHONEPE_CLIENT_SECRET;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = sha256 + "###" + SALT_INDEX;

    const response = await axios.get(
      `${BASE_URL}/pg/v1/status/${PHONEPE_CLIENT_ID}/${orderId}`,
      {
        headers: {
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": PHONEPE_CLIENT_ID,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      }
    );

    const paymentData = response.data.data;
    const txnStatus = paymentData?.state;
    const txnId = paymentData?.transactionId || paymentData?.providerReferenceId || null;

    const buy = await BuyTest.findOne({ orderId });
    if (!buy) {
      return res.redirect(`https://product.bussibees.com/payment-failed?orderId=${orderId}&status=NOT_FOUND`);
    }

    if (txnStatus === "COMPLETED" && buy.walletBalance > 0) {
      let wallet = await Wallet.findOne({ refererId: buy.userId });
      if (!wallet || wallet.earning < buy.walletBalance) {
        await BuyTest.findOneAndUpdate({ orderId }, { status: "FAILED", paymentStatus: false });
        return res.redirect(`https://product.bussibees.com/payment-failed?orderId=${orderId}&status=WALLET_ERROR`);
      }
      wallet.earning -= buy.walletBalance;
      await wallet.save();
      await Wallet.updateMany({ refererId: buy.userId, status: true }, { $set: { status: false } });
    }

    await BuyTest.findOneAndUpdate(
      { orderId },
      {
        paymentStatus: txnStatus === "COMPLETED",
        status: txnStatus,
        transactionReference: txnId,
      }
    );

    return res.redirect(
      txnStatus === "COMPLETED"
        ? `https://product.bussibees.com/payment-success?orderId=${orderId}&status=${txnStatus}`
        : `https://product.bussibees.com/payment-failed?orderId=${orderId}&status=${txnStatus}`
    );

  } catch (error) {
    return res.redirect(`https://product.bussibees.com/payment-failed?orderId=${req.params.orderId}&status=ERROR`);
  }
};


exports.checkPaymentStatusTest = async (req, res) => {
  try {
    const { orderId } = req.params;

    const stringToHash = `/pg/v1/status/${PHONEPE_CLIENT_ID}/${orderId}` + PHONEPE_CLIENT_SECRET;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = sha256 + "###" + SALT_INDEX;

    const response = await axios.get(
      `${BASE_URL}/pg/v1/status/${PHONEPE_CLIENT_ID}/${orderId}`,
      {
        headers: {
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": PHONEPE_CLIENT_ID,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      }
    );

    const paymentData = response.data.data;
    const txnStatus = paymentData?.state || "PENDING";
    const txnId = paymentData?.transactionId || paymentData?.providerReferenceId || null;

    if (txnStatus === "COMPLETED") {
      const buy = await BuyTest.findOne({ orderId });
      if (buy?.walletBalance > 0) {
        let wallet = await Wallet.findOne({ refererId: buy.userId });
        if (wallet && wallet.earning >= buy.walletBalance) {
          wallet.earning -= buy.walletBalance;
          await wallet.save();
          await Wallet.updateMany({ refererId: buy.userId, status: true }, { $set: { status: false } });
        }
      }
    }

    const updatedBuy = await BuyTest.findOneAndUpdate(
      { orderId },
      { paymentStatus: txnStatus === "COMPLETED", status: txnStatus, transactionReference: txnId },
      { new: true }
    );

    if (!updatedBuy) return res.status(404).json({ message: "Order not found" });

    return res.status(200).json({
      status: txnStatus,
      orderId,
      transactionId: txnId,
    });

  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      orderId: req.params.orderId,
      transactionId: null,
    });
  }
};