const crypto = require("crypto");
const axios = require("axios");
const fs = require('fs');
const path = require('path');
const Buy = require('../models/buy'); 
const clientUserModule = require('../models/user'); 
const GovernmentCourse = require('../models/governmentcourse');
const mongoose = require('mongoose');
const GovCourseResult = require('../models/govCourseResult');
const Wallet = require('../models/wallet');  
const moment = require('moment-timezone');

const BuyTest = require('../models/buyschduleTest'); 
const ScheduleTest = require("../models/testscheduled");




const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const SALT_INDEX = process.env.SALT_INDEX;

const IS_PRODUCTION = true

const BASE_URL = IS_PRODUCTION
  ? "https://api.phonepe.com/apis/hermes"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";

  exports.createBuy = async (req, res) => {
  try {
    const userId = req.user._id;
    const userProfile = await clientUserModule.findById(userId).lean();
    if (!userProfile) {
      return res.status(404).json({ message: "User not found." });
    }
  
    const requiredFields = [
      "firstName",
      "lastName",
      "country",
      "state",
      "city",
      "pincode",
    ];
    const missingFields = requiredFields.filter((f) => !userProfile[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Please complete your profile before purchasing a course.",
        missingFields,
      });
    }

    const {
      courseId,
      ebook,
      studyNotes,
      videoLectures,
      walletBalance = 0,
      testseries,
      userreferId,
      coursereferId,
      amount,
      coursePrice,
    } = req.body;

    if (!courseId)
      return res.status(400).json({ message: "courseId is required" });

  
    const host = req.get('host');
    const isLive = host === "backend.bussibees.com";


    const orderId = "ORDER_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    
    if (walletBalance > 0) {
      let wallet = await Wallet.findOne({ refererId: userId });
      if (!wallet || wallet.earning < walletBalance) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      
    }

   
    if (!isLive) {
      
      if (walletBalance > 0) {
        let wallet = await Wallet.findOne({ refererId: userId });
        if (!wallet || wallet.earning < walletBalance) {
          return res.status(400).json({ message: "Insufficient wallet balance" });
        }
        wallet.earning -= walletBalance;
        await wallet.save();
        await Wallet.updateMany(
          { refererId: userId, status: true },
          { $set: { status: false } }
        );
      }

      const newBuy = new Buy({
        userId,
        courseId,
        coursePrice,
        amount: amount || 0,
        paymentstatus: true,
        ebook,
        studyNotes,
        videoLectures,
        walletBalance,
        testseries,
        createdBy: userId,
        userreferId,
        coursereferId,
        orderId,
        status: "COMPLETED",
      });
      await newBuy.save();

      return res.status(201).json({
        message: "Course purchased successfully payment bypass.",
        data: newBuy,
        paymentUrl: null,
      });
    }

    
    if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET || !SALT_INDEX) {
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    
    if (amount === 0) {
      const newBuy = new Buy({
        userId,
        courseId,
        coursePrice,
        amount,
        paymentstatus: true,
        ebook,
        studyNotes,
        videoLectures,
        walletBalance,
        testseries,
        createdBy: userId,
        userreferId,
        coursereferId,
        orderId,
        status: "COMPLETED",
      });
      await newBuy.save();
      return res.status(201).json({
        message: "Course purchased successfully (Free / Wallet only).",
        data: newBuy,
        paymentUrl: null,
      });
    }

    
    const newBuy = new Buy({
      userId,
      courseId,
      coursePrice,
      amount,
      paymentstatus: false,
      ebook,
      studyNotes,
      videoLectures,
      walletBalance,
      testseries,
      createdBy: userId,
      userreferId,
      coursereferId,
      orderId,
    });
    await newBuy.save();

   
    const payload = {
      merchantId: PHONEPE_CLIENT_ID,
      merchantTransactionId: orderId,
      merchantUserId: String(userId),
      amount: amount * 100, // in paise
      redirectUrl: `https://product.bussibees.com/payment-redirect/${orderId}`,
      callbackUrl: `https://product.bussibees.com/api/v1/buy/phonepe-status/${orderId}`,
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
      message: "Course purchase initiated. Complete the payment.",
      data: newBuy,
      paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
    });
  } catch (error) {
    console.error(" Error in createBuy:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Server error",
      error: error.response?.data || error.message,
    });
  }
};


exports.phonepeStatus = async (req, res) => {
  try {
    const { orderId } = req.params;


    const host = req.get('host');
    const isLive = host === "backend.bussibees.com";
    if (!isLive) {
      const buy = await Buy.findOne({ orderId });
      if (!buy) {
        return res.redirect(`https://product.bussibees.com/payment-failed?orderId=${orderId}&status=NOT_FOUND`);
      }
      if (buy.walletBalance && buy.walletBalance > 0) {
        let wallet = await Wallet.findOne({ refererId: buy.userId });
        if (!wallet || wallet.earning < buy.walletBalance) {
          await Buy.findOneAndUpdate({ orderId }, { status: "FAILED", paymentstatus: false });
          return res.redirect(`https://product.bussibees.com/payment-failed?orderId=${orderId}&status=WALLET_ERROR`);
        }
        wallet.earning -= buy.walletBalance;
        await wallet.save();
        await Wallet.updateMany({ refererId: buy.userId, status: true }, { $set: { status: false } });
      }

      await Buy.findOneAndUpdate(
        { orderId },
        {
          paymentstatus: true,
          status: "COMPLETED",
          transactionReference: `BYPASS_${Date.now()}`,
        }
      );

      return res.redirect(`https://product.bussibees.com/payment-success?orderId=${orderId}&status=COMPLETED`);
    }

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

    const buy = await Buy.findOne({ orderId });
    if (!buy) {
      return res.redirect(`https://product.bussibees.com/payment-failed?orderId=${orderId}&status=NOT_FOUND`);
    }

    if (txnStatus === "COMPLETED" && buy.walletBalance > 0) {
      let wallet = await Wallet.findOne({ refererId: buy.userId });
      if (!wallet || wallet.earning < buy.walletBalance) {
        await Buy.findOneAndUpdate({ orderId }, { status: "FAILED", paymentstatus: false });
        return res.redirect(`https://product.bussibees.com/payment-failed?orderId=${orderId}&status=WALLET_ERROR`);
      }
      wallet.earning -= buy.walletBalance;
      await wallet.save();
      await Wallet.updateMany({ refererId: buy.userId, status: true }, { $set: { status: false } });
    }

    await Buy.findOneAndUpdate(
      { orderId },
      {
        paymentstatus: txnStatus === "COMPLETED",
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
    console.error(" Error in phonepeStatus:", error.response?.data || error.message);
    return res.redirect(
      `https://product.bussibees.com/payment-failed?orderId=${req.params.orderId}&status=ERROR`
    );
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

   
    const host = req.get('host');
    const isLive = host === "backend.bussibees.com";
    if (!isLive) {
      const buy = await Buy.findOne({ orderId });
      if (!buy) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (!buy.paymentstatus) {
        if (buy.walletBalance && buy.walletBalance > 0) {
          let wallet = await Wallet.findOne({ refererId: buy.userId });
          if (!wallet || wallet.earning < buy.walletBalance) {
            await Buy.findOneAndUpdate({ orderId }, { status: "FAILED", paymentstatus: false });
            return res.status(400).json({ status: "FAILED", orderId, transactionId: null, reason: "WALLET_ERROR" });
          }
          wallet.earning -= buy.walletBalance;
          await wallet.save();
          await Wallet.updateMany({ refererId: buy.userId, status: true }, { $set: { status: false } });
        }
        await Buy.findOneAndUpdate(
          { orderId },
          { paymentstatus: true, status: "COMPLETED", transactionReference: `BYPASS_${Date.now()}` }
        );
        return res.status(200).json({ status: "COMPLETED", orderId, transactionId: `BYPASS_${Date.now()}` });
      }
      return res.status(200).json({ status: buy.status || (buy.paymentstatus ? "COMPLETED" : "PENDING"), orderId, transactionId: buy.transactionReference || null });
    }
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
    const txnStatus = paymentData?.state || paymentData?.status || "PENDING";
    const txnId = paymentData?.transactionId || paymentData?.providerReferenceId || null;
    if (txnStatus === "COMPLETED") {
      const buy = await Buy.findOne({ orderId });
      if (buy?.walletBalance && buy.walletBalance > 0) {
        let wallet = await Wallet.findOne({ refererId: buy.userId });
        if (wallet && wallet.earning >= buy.walletBalance) {
          wallet.earning -= buy.walletBalance;
          await wallet.save();
          await Wallet.updateMany({ refererId: buy.userId, status: true }, { $set: { status: false } });
        }
      }
    }

    const updatedBuy = await Buy.findOneAndUpdate(
      { orderId },
      {
        paymentstatus: txnStatus === "COMPLETED",
        status: txnStatus,
        transactionReference: txnId,
      },
      { new: true }
    );

    if (!updatedBuy) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      status: txnStatus,
      orderId,
      transactionId: txnId,
    });
  } catch (error) {
    console.error(" Error in checkPaymentStatus:", error.response?.data || error.message);
    return res.status(500).json({
      status: "ERROR",
      orderId: req.params.orderId,
      transactionId: null,
    });
  }
};

// exports.phonepeStatus = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     const stringToHash =
//       `/pg/v1/status/${PHONEPE_CLIENT_ID}/${orderId}` + PHONEPE_CLIENT_SECRET;
//     const sha256 = crypto
//       .createHash("sha256")
//       .update(stringToHash)
//       .digest("hex");
//     const checksum = sha256 + "###" + SALT_INDEX;

//     const response = await axios.get(
//       `${BASE_URL}/pg/v1/status/${PHONEPE_CLIENT_ID}/${orderId}`,
//       {
//         headers: {
//           "X-VERIFY": checksum,
//           "X-MERCHANT-ID": PHONEPE_CLIENT_ID,
//           "Content-Type": "application/json",
//           accept: "application/json",
//         },
//       }
//     );

//     if (response.data.success && response.data.code === "PAYMENT_SUCCESS") {
//       await Buy.findOneAndUpdate({ orderId }, { paymentstatus: true });
//       return res.redirect("https://product.bussibees.com/payment-success");
//     } else {
//       return res.redirect("https://product.bussibees.com/payment-failed");
//     }
//   } catch (error) {
//     console.error("❌ Error in phonepeStatus:", error.response?.data || error.message);
//     return res.redirect("https://product.bussibees.com/payment-failed");
//   }
// };


exports.getBuysByUser = async (req, res) => {
  try {
    const userId = req.user._id; 
    const buys = await Buy.find({ userId })
      .populate('courseId', 'courseName coursePrice courseValidity ') 
      .sort({ createdAt: -1 });
    return res.status(200).json({ data: buys });
  } catch (error) {
    console.error(' Error in getBuysByUser:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// exports.getReferCount = async (req, res) => {
//   try {
//     const loginUserId = req.user._id;
//     // 🔹 Sabhi buy data lao jisme referer ye user hai
//     const buyData = await Buy.find({
//       userreferId: loginUserId,
//       paymentstatus: true
//     })
//       .populate({
//         path: "userId",
//         model: "User",
//         select: "firstName lastName email mobileNo"
//       })
//       .populate({
//         path: "courseId",
//         model: "GovernmentCourse",
//         select: "courseName coursePrice"
//       })
//       .lean();

//     if (!buyData.length) {
//       return res.status(200).json({
//         message: "No course purchases found with this refer.",
//         refererId: loginUserId,
//         count: 0,
//         earning: 0,
//         data: []
//       });
//     }

//     // 🔹 Sabhi entries banao (user + course + commission)
//     const rawEntries = buyData.map(item => {
//       const amount = parseFloat(item.amount || 0); // 👈 ab Buy model ke amount ko use kar rahe hain
//       const commission = parseFloat((amount * 0.10).toFixed(2)); // 👈 10% amount par

//       return {
//         userDetails: {
//           _id: item.userId?._id,
//           email: item.userId?.email,
//           mobileNo: item.userId?.mobileNo,
//           firstName: item.userId?.firstName,
//           lastName: item.userId?.lastName,
//         },
//         course: {
//           _id: item.courseId?._id,
//           courseName: item.courseId?.courseName,
//           coursePrice: item.courseId?.coursePrice,
//         },
//         commission,
//         status: true
//       };
//     });

//     // 🔹 Filter karo → ek course ke max 10 unique users ka commission
//     const courseUserMap = {}; // courseId -> Set of userIds
//     const newEntries = [];

//     for (const item of rawEntries) {
//       const courseId = item.course?._id?.toString();
//       const userId = item.userDetails?._id?.toString();

//       if (!courseUserMap[courseId]) {
//         courseUserMap[courseId] = new Set();
//       }

//       // Agar 10 unique users already ho gaye to skip karo
//       if (courseUserMap[courseId].size >= 10) continue;

//       // Agar user already commission le chuka hai to skip
//       if (courseUserMap[courseId].has(userId)) continue;

//       // Naya user add karo
//       courseUserMap[courseId].add(userId);
//       newEntries.push(item);
//     }

//     // 🔹 Wallet find karo
//     let wallet = await Wallet.findOne({ refererId: loginUserId });

//     if (wallet) {
//       // Sirf naye jo abhi tak wallet me nahi hai
//       const existingKeys = new Set(
//         wallet.data.map(item => `${item.userDetails?._id}_${item.course?._id}`)
//       );

//       const filteredNew = newEntries.filter(item => {
//         const key = `${item.userDetails?._id}_${item.course?._id}`;
//         return !existingKeys.has(key); // only new entries
//       });
//       if (filteredNew.length > 0) {
//         wallet.data.push(...filteredNew);
//         wallet.count = wallet.data.length;

//         // 🔹 Sirf naye commissions add karo
//         const newCommissionSum = filteredNew.reduce(
//           (acc, item) => acc + item.commission,
//           0
//         );
//         wallet.earning = wallet.earning + newCommissionSum;

//         await wallet.save();
//       }
//     } else {
//       // Agar wallet abhi tak nahi hai to naya create karo
//       wallet = await Wallet.create({
//         refererId: loginUserId,
//         count: newEntries.length,
//         earning: newEntries.reduce((acc, item) => acc + item.commission, 0),
//         status: true,
//         data: newEntries
//       });
//     }

//     return res.status(200).json({
//       message: "Details fetched successfully",
//       refererId: wallet.refererId,
//       count: wallet.count,
//       earning: wallet.earning,
//       status: wallet.status,
//       data: wallet.data
//     });
//   } catch (error) {
//     console.error("❌ Error in getReferCount:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message
//     });
//   }
// };



exports.getReferCount = async (req, res) => {
  try {
    const loginUserId = req.user._id;
    const buyCourses = await Buy.find({
      userreferId: loginUserId,
      paymentstatus: true
    })
      .populate({
        path: "userId",
        model: "User",
        select: "firstName lastName email mobileNo"
      })
      .populate({
        path: "courseId",
        model: "GovernmentCourse",
        select: "courseName coursePrice"
      })
      .lean();

    
    const buyTests = await BuyTest.find({
      userreferId: loginUserId,
      paymentStatus: true
    })
      .populate({
        path: "userId",
        model: "User",
        select: "firstName lastName email mobileNo"
      })
      .populate({
        path: "testId",
        model: "ScheduleTest",
        select: "examName price"
      })
      .lean();

    const courseEntries = buyCourses.map(item => ({
      _id: item._id,
      userDetails: item.userId,
      course: item.courseId
        ? {
            _id: item.courseId._id,
            courseName: item.courseId.courseName,
            coursePrice: item.courseId.coursePrice || 0
          }
        : null,
      commission: parseFloat(item.amount * 0.10 || 0),
      status: true,
      createdAt: item.createdAt
    }));

    const testEntries = buyTests.map(item => ({
      _id: item._id,
      userDetails: item.userId,
      course: item.testId
        ? {
            _id: item.testId._id,
            courseName: item.testId.examName, 
            coursePrice: item.testId.price || 0
          }
        : null,
      commission: parseFloat(item.amount * 0.10 || 0),
      status: true,
      createdAt: item.createdAt
    }));

    const rawEntries = [...courseEntries, ...testEntries];

    const itemUserMap = {};
    const newEntries = [];

    for (const item of rawEntries) {
      const itemKey = item.course?._id?.toString();
      const userId = item.userDetails?._id?.toString();

      if (!itemUserMap[itemKey]) itemUserMap[itemKey] = new Set();

      if (itemUserMap[itemKey].size >= 10) continue;
      if (itemUserMap[itemKey].has(userId)) continue;

      itemUserMap[itemKey].add(userId);
      newEntries.push(item);
    }

    let wallet = await Wallet.findOne({ refererId: loginUserId });

    if (wallet) {
      const existingKeys = new Set(
        wallet.data.map(item => `${item.userDetails?._id}_${item.course?._id}`)
      );

      const filteredNew = newEntries.filter(item => {
        const key = `${item.userDetails?._id}_${item.course?._id}`;
        return !existingKeys.has(key);
      });

      if (filteredNew.length > 0) {
        wallet.data.push(...filteredNew);
        wallet.count = wallet.data.length;

        const newCommissionSum = filteredNew.reduce(
          (acc, i) => acc + i.commission,
          0
        );
        wallet.earning += newCommissionSum;

        await wallet.save();
      }
    } else {
      wallet = await Wallet.create({
        refererId: loginUserId,
        count: newEntries.length,
        earning: newEntries.reduce((acc, i) => acc + i.commission, 0),
        status: true,
        data: newEntries
      });
    }

    wallet.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      message: "Details fetched successfully",
      refererId: wallet.refererId,
      count: wallet.count,
      earning: wallet.earning,
      status: wallet.status,
      data: wallet.data
    });
  } catch (error) {
    console.error("Error in getReferCount:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};




// exports.getReferCount = async (req, res) => {
//   try {
//     const loginUserId = req.user._id;

//     // -------------------------
//     // 1️⃣ Courses Buy (refer by this user)
//     // -------------------------
//     const buyCourses = await Buy.find({
//       userreferId: loginUserId,
//       paymentstatus: true
//     })
//       .populate({
//         path: "userId",
//         model: "User",
//         select: "firstName lastName email mobileNo"
//       })
//       .populate({
//         path: "courseId",
//         model: "GovernmentCourse",
//         select: "courseName coursePrice"
//       })
//       .lean();

//     // Entries for courses
//     const courseEntries = buyCourses.map(item => {
//       const amount = parseFloat(item.amount || 0);
//       const commission = parseFloat((amount * 0.10).toFixed(2)); // 10%

//       return {
//         type: "course", // 👈 internally track type
//         userDetails: {
//           _id: item.userId?._id,
//           email: item.userId?.email,
//           mobileNo: item.userId?.mobileNo,
//           firstName: item.userId?.firstName,
//           lastName: item.userId?.lastName,
//         },
//         course: {
//           _id: item.courseId?._id,
//           courseName: item.courseId?.courseName,
//           coursePrice: item.courseId?.coursePrice,
//         },
//         commission,
//         status: true
//       };
//     });

//     // -------------------------
//     // 2️⃣ Tests Buy (refer by this user)
//     // -------------------------
//     const buyTests = await BuyTest.find({
//       userreferId: loginUserId,
//       paymentStatus: true
//     })
//       .populate({
//         path: "userId",
//         model: "User",
//         select: "firstName lastName email mobileNo"
//       })
//       .populate({
//         path: "testId",
//         model: "ScheduleTest",
//         select: "examName examPrice"
//       })
//       .lean();

//     // Entries for tests
//     const testEntries = buyTests.map(item => {
//       const amount = parseFloat(item.amount || 0);
//       const commission = parseFloat((amount * 0.10).toFixed(2)); // 10%

//       return {
//         type: "test", // 👈 internally track type
//         userDetails: {
//           _id: item.userId?._id,
//           email: item.userId?.email,
//           mobileNo: item.userId?.mobileNo,
//           firstName: item.userId?.firstName,
//           lastName: item.userId?.lastName,
//         },
//         test: {
//           _id: item.testId?._id,
//           examName: item.testId?.examName,
//           examPrice: item.testId?.examPrice,
//         },
//         commission,
//         status: true
//       };
//     });

//     // -------------------------
//     // 3️⃣ Combine & Apply Rules (max 10 users per item, unique users)
//     // -------------------------
//     const rawEntries = [...courseEntries, ...testEntries];

//     const itemUserMap = {}; // key = courseId/testId + type → Set of userIds
//     const newEntries = [];

//     for (const item of rawEntries) {
//       const keyId = item.type === "course" ? item.course?._id?.toString() : item.test?._id?.toString();
//       const uniqueKey = `${item.type}_${keyId}`;

//       const userId = item.userDetails?._id?.toString();
//       if (!itemUserMap[uniqueKey]) {
//         itemUserMap[uniqueKey] = new Set();
//       }

//       // Max 10 users
//       if (itemUserMap[uniqueKey].size >= 10) continue;

//       // Same user skip
//       if (itemUserMap[uniqueKey].has(userId)) continue;

//       itemUserMap[uniqueKey].add(userId);
//       newEntries.push(item);
//     }

//     // -------------------------
//     // 4️⃣ Wallet Update
//     // -------------------------
//     let wallet = await Wallet.findOne({ refererId: loginUserId });

//     if (wallet) {
//       const existingKeys = new Set(
//         wallet.data.map(item => {
//           const keyId = item.type === "course" ? item.course?._id : item.test?._id;
//           return `${item.type}_${item.userDetails?._id}_${keyId}`;
//         })
//       );

//       const filteredNew = newEntries.filter(item => {
//         const keyId = item.type === "course" ? item.course?._id : item.test?._id;
//         const key = `${item.type}_${item.userDetails?._id}_${keyId}`;
//         return !existingKeys.has(key);
//       });

//       if (filteredNew.length > 0) {
//         wallet.data.push(...filteredNew);
//         wallet.count = wallet.data.length;
//         wallet.earning += filteredNew.reduce((acc, item) => acc + item.commission, 0);
//         await wallet.save();
//       }
//     } else {
//       wallet = await Wallet.create({
//         refererId: loginUserId,
//         count: newEntries.length,
//         earning: newEntries.reduce((acc, item) => acc + item.commission, 0),
//         status: true,
//         data: newEntries
//       });
//     }

//     return res.status(200).json({
//       message: "Details fetched successfully",
//       refererId: wallet.refererId,
//       count: wallet.count,
//       earning: wallet.earning,
//       status: wallet.status,
//       data: wallet.data
//     });

//   } catch (error) {
//     console.error("❌ Error in getReferCount:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message
//     });
//   }
// };


exports.getPurchasedCourses = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, subcategory, sortBy, sortbystatus, sortbyDate } = req.query;

    // 🔹 Base query
    let buysQuery = Buy.find({ userId, paymentstatus: true })
      .populate({
        path: 'courseId',
        model: 'GovernmentCourse',
        populate: ['category', 'subcategory', 'subject'],
      })
      .lean();

    
    if (sortBy === 'oldest') {
      buysQuery = buysQuery.sort({ createdAt: 1 });
    } else {
      buysQuery = buysQuery.sort({ createdAt: -1 });
    }

    const buys = await buysQuery;
    const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');
    let purchasedCourses = [];

    for (const buy of buys) {
      if (!buy.courseId) continue;
      const course = buy.courseId;

      // ---------- Category/Subcategory Filter ----------
      if (category && category.toLowerCase() !== 'all' && course.category?._id?.toString() !== category) {
        continue;
      }

      if (subcategory && course.subcategory?._id?.toString() !== subcategory) {
        continue;
      }

      const result = {
        ...course,
        category: course.category,
        subcategory: course.subcategory,
        subject: course.subject,
      };

      // ---------- Access filtering ----------
      if (!buy.ebook) delete result.ebook;
      if (!buy.studyNotes) delete result.studyNotes;

      if (buy.videoLectures && Array.isArray(course.videoLectures)) {
        result.videoLectures = course.videoLectures.slice(0, Number(buy.videoLectures));
      } else {
        delete result.videoLectures;
      }

      if (buy.testseries && Array.isArray(course.testSeries)) {
        result.testSeries = course.testSeries.slice(0, Number(buy.testseries));
      } else {
        delete result.testSeries;
      }

      // ---------- Convert file paths ----------
      if (result.courseImages) {
        if (Array.isArray(result.courseImages)) {
          result.courseImages = result.courseImages.map(imgPath =>
            fs.existsSync(imgPath) ? `${baseUrl}/uploads/${path.basename(imgPath)}` : imgPath
          );
        } else if (typeof result.courseImages === 'string') {
          if (fs.existsSync(result.courseImages)) {
            result.courseImages = `${baseUrl}/uploads/${path.basename(result.courseImages)}`;
          }
        }
      }

      if (result.ebook && fs.existsSync(result.ebook)) {
        result.ebook = `${baseUrl}/uploads/${path.basename(result.ebook)}`;
      }

      if (result.studyNotes && fs.existsSync(result.studyNotes)) {
        result.studyNotes = `${baseUrl}/uploads/${path.basename(result.studyNotes)}`;
      }

      // ---------- Overall progress calculation ----------
      result.ebookStatus = false;
      result.studyNotesStatus = false;
      result.videoLectureStatus = false;

      const sections = ["ebook", "studyNotes", "videoLectures", "testSeries"];
      const availableSections = sections.filter(sec => result[sec]);
      const totalSections = availableSections.length;
      const sectionWeight = totalSections > 0 ? 100 / totalSections : 0;

      let overallProgress = 0;

      if (result.ebook) {
        result.ebookStatus = true;
        overallProgress += sectionWeight;
      }
      if (result.studyNotes) {
        result.studyNotesStatus = true;
        overallProgress += sectionWeight;
      }
      if (result.videoLectures) {
        result.videoLectureStatus = true;
        overallProgress += sectionWeight;
      }
      if (Array.isArray(result.testSeries) && result.testSeries.length) {
        const perTopicWeight = sectionWeight / result.testSeries.length;

        for (const topic of result.testSeries) {
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

      result.overallProgress = Number(overallProgress.toFixed(2));

      purchasedCourses.push(result);
    }

    // 🔹 sortByStatus filter
    if (sortbystatus) {
      if (sortbystatus.toLowerCase() === "notstarted") {
        purchasedCourses = purchasedCourses.filter(c => c.overallProgress === 0);
      } else if (sortbystatus.toLowerCase() === "progress") {
        purchasedCourses = purchasedCourses.filter(c => c.overallProgress > 0 && c.overallProgress < 100);
      } else if (sortbystatus.toLowerCase() === "complete") {
        purchasedCourses = purchasedCourses.filter(c => c.overallProgress === 100);
      }
    }

    // 🔹 sortByDate based on overallProgress
    if (sortbyDate) {
      if (sortbyDate.toLowerCase() === "less") {
        purchasedCourses.sort((a, b) => a.overallProgress - b.overallProgress);
      } else if (sortbyDate.toLowerCase() === "greater") {
        purchasedCourses.sort((a, b) => b.overallProgress - a.overallProgress);
      }
    }

    return res.status(200).json({
      message: 'Purchased courses fetched successfully',
      data: purchasedCourses,
    });
  } catch (err) {
    console.error('Error fetching purchased courses:', err);
    return res.status(500).json({
      message: 'Server Error',
      error: err.message,
    });
  }
};


// exports.CourseNames = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const buys = await Buy.find({ userId, paymentstatus: true })
//       .populate({
//         path: "courseId",
//         model: "GovernmentCourse",
//         select: "courseName"
//       })
//       .lean();

//     // Filter valid courses and map to required format
//     const courses = buys
//       .filter(buy => buy.courseId)  
//       .map(buy => ({
//         id: buy.courseId._id,          
//         courseName: buy.courseId.courseName  
//       }));

//     return res.status(200).json({
//       message: "Purchased course names fetched successfully",
//       count: courses.length,
//       courses
//     });

//   } catch (err) {
//     console.error("Error fetching purchased course names:", err);
//     return res.status(500).json({
//       message: "Server Error",
//       error: err.message
//     });
//   }
// };


exports.CourseNames = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = moment.tz("Asia/Kolkata"); 
    const currentDate = now.clone().startOf("day");
    const buys = await Buy.find({ userId, paymentstatus: true })
      .populate({
        path: "courseId",
        model: "GovernmentCourse",
        select: "courseName expireDate"
      })
      .lean();
    const courses = buys
      .filter(buy => {
        if (!buy.courseId) return false;
        if (buy.courseId.expireDate) {
          const expireDateMoment = moment.tz(
            buy.courseId.expireDate,
            "DD-MM-YYYY",
            "Asia/Kolkata"
          );
          if (expireDateMoment.isBefore(currentDate)) return false;
        }
        return true;
      })
      .map(buy => {
        let expireStatus = true;
        if (buy.courseId.expireDate) {
          const expireDateMoment = moment.tz(
            buy.courseId.expireDate,
            "DD-MM-YYYY",
            "Asia/Kolkata"
          );
          expireStatus = !expireDateMoment.isBefore(currentDate);
        }
        return {
          id: buy.courseId._id,
          courseName: buy.courseId.courseName,
          expireDate: buy.courseId.expireDate || null,
          expireStatus
        };
      });

    const buyTests = await BuyTest.find({ userId, paymentStatus: true })
      .populate({
        path: "testId",
        model: "ScheduleTest",
        select: "examName scheduleDate scheduleTime"
      })
      .lean();

    const tests = buyTests
      .filter(buy => {
        if (!buy.testId) return false;

        const { scheduleDate, scheduleTime } = buy.testId;
        if (!scheduleDate) return false;

        const testDateTime = moment.tz(
          `${scheduleDate} ${scheduleTime || "00:00"}`,
          "DD-MM-YYYY HH:mm",
          "Asia/Kolkata"
        );

        return testDateTime.isAfter(now);
      })
      .map(buy => {
        const { scheduleDate, scheduleTime } = buy.testId;

        let expireStatus = true;
        const testDateTime = moment.tz(
          `${scheduleDate} ${scheduleTime || "00:00"}`,
          "DD-MM-YYYY HH:mm",
          "Asia/Kolkata"
        );
        expireStatus = testDateTime.isAfter(now);

        return {
          id: buy.testId._id,
          examName: buy.testId.examName,
          scheduleDate: scheduleDate || null,
          scheduleTime: scheduleTime || null,
          expireStatus
        };
      });
    const allPurchases = [...courses, ...tests];
    return res.status(200).json({
      message: "Purchased courses & tests fetched successfully",
      count: allPurchases.length,
      courses: allPurchases
    });

  } catch (err) {
    console.error("Error fetching purchased data:", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message
    });
  }
};



// exports.CourseNames = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const buys = await Buy.find({ userId, paymentstatus: true })
//       .populate({
//         path: "courseId",
//         model: "GovernmentCourse",
//         select: "courseName expireDate"
//       })
//       .lean();

//     const currentDate = moment.tz("Asia/Kolkata").startOf("day");

//     // Filter valid + non-expired courses
//     const courses = buys
//       .filter(buy => {
//         if (!buy.courseId) return false;

//         if (buy.courseId.expireDate) {
//           const expireDateMoment = moment.tz(
//             buy.courseId.expireDate,
//             "DD-MM-YYYY",
//             "Asia/Kolkata"
//           );
//           if (expireDateMoment.isBefore(currentDate)) {
//             return false; // ❌ expired course hata do
//           }
//         }
//         return true;
//       })
//       .map(buy => {
//         let expireStatus = true;
//         if (buy.courseId.expireDate) {
//           const expireDateMoment = moment.tz(
//             buy.courseId.expireDate,
//             "DD-MM-YYYY",
//             "Asia/Kolkata"
//           );
//           expireStatus = !expireDateMoment.isBefore(currentDate);
//         }
//         return {
//           id: buy.courseId._id,
//           courseName: buy.courseId.courseName,
//           expireDate: buy.courseId.expireDate || null,
//           expireStatus
//         };
//       });

//     return res.status(200).json({
//       message: "Purchased course names fetched successfully",
//       count: courses.length,
//       courses
//     });

//   } catch (err) {
//     console.error("Error fetching purchased course names:", err);
//     return res.status(500).json({
//       message: "Server Error",
//       error: err.message
//     });
//   }
// };



exports.courseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    let course = await GovernmentCourse.findById(id)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("subject", "name")
      .lean();

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ---------- Expire Status Check ----------
    const currentDate = moment.tz("Asia/Kolkata").startOf("day");
    let expireStatus = true; // default

    if (course.expireDate) {
      const expireDateMoment = moment.tz(course.expireDate, "DD-MM-YYYY", "Asia/Kolkata");
      if (expireDateMoment.isBefore(currentDate)) {
        expireStatus = false;
      }
    }
    course.expireStatus = expireStatus;

    const buy = await Buy.findOne({
      userId,
      courseId: id,
      paymentstatus: true
    }).lean();

    // ---------- Filter access ----------
    if (buy) {
      if (!buy.ebook) delete course.ebook;
      if (!buy.studyNotes) delete course.studyNotes;

      if (buy.videoLectures && Array.isArray(course.videoLectures)) {
        course.videoLectures = course.videoLectures.slice(0, Number(buy.videoLectures));
      } else {
        delete course.videoLectures;
      }

      if (buy.testseries && Array.isArray(course.testSeries)) {
        course.testSeries = course.testSeries.slice(0, Number(buy.testseries));
      } else {
        delete course.testSeries;
      }
    } else {
      delete course.ebook;
      delete course.studyNotes;
      delete course.videoLectures;
      delete course.testSeries;
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");

    // ---------- Helper function to convert file path to full URL ----------
    const convertToFullUrl = (filePath) => {
      if (!filePath) return filePath;
      return fs.existsSync(filePath) ? `${baseUrl}/uploads/${path.basename(filePath)}` : filePath;
    };

    // ---------- Convert courseImages, ebook, studyNotes ----------
    if (course.courseImages) {
      if (Array.isArray(course.courseImages)) {
        course.courseImages = course.courseImages.map(convertToFullUrl);
      } else if (typeof course.courseImages === "string") {
        course.courseImages = convertToFullUrl(course.courseImages);
      }
    }

    if (course.ebook) course.ebook = convertToFullUrl(course.ebook);
    if (course.studyNotes) course.studyNotes = convertToFullUrl(course.studyNotes);

    // ---------- Convert testSeries question images ----------
    if (Array.isArray(course.testSeries)) {
      course.testSeries.forEach((topic) => {
        if (Array.isArray(topic.topicQuestions)) {
          topic.topicQuestions.forEach((q) => {
            q.questionImage = convertToFullUrl(q.questionImage);
            q.option1Image = convertToFullUrl(q.option1Image);
            q.option2Image = convertToFullUrl(q.option2Image);
            q.option3Image = convertToFullUrl(q.option3Image);
            q.option4Image = convertToFullUrl(q.option4Image);
            q.option5Image = convertToFullUrl(q.option5Image);
          });
        }
      });
    }

    // ---------- Default statuses ----------
    course.ebookStatus = false;
    course.studyNotesStatus = false;
    course.videoLectureStatus = false;

    // ---------- Progress calculation ----------
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

    if (course.videoLectures) {
      course.videoLectureStatus = true;
      overallProgress += sectionWeight;
    }

    if (Array.isArray(course.testSeries) && course.testSeries.length) {
      const perTopicWeight = sectionWeight / course.testSeries.length;

      for (const topic of course.testSeries) {
        const latestResult = await GovCourseResult.findOne({
          userId,
          courseId: id,
          testSeriesId: topic._id
        })
          .sort({ updatedAt: -1 })
          .lean();

        if (latestResult?.percentage !== undefined && latestResult?.percentage !== null) {
          topic.percentage = latestResult.percentage;
          overallProgress += perTopicWeight;
        } else {
          topic.percentage = null;
        }
      }
    }

    course.overallProgress = Number(overallProgress.toFixed(2));

    // ---------- REFER DATA ----------
    const userWithRefer = await clientUserModule.findById(userId)
      .populate({
        path: "refer.userreferId",
        model: "User",
        select: "firstName middleName lastName"
      })
      .lean();

    const referData = userWithRefer?.refer?.filter(
      r => r.coursereferId?.toString() === id.toString()
    );

    if (referData && referData.length > 0) {
      const r = referData[0].userreferId;
      const fullName = [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");
      course.referName = fullName;
    } else {
      course.referName = null;
    }

    return res.status(200).json(course);
  } catch (error) {
    console.error("Error fetching course by ID:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};



exports.History = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ token से userId
    const { testSeriesId } = req.params;

    if (!userId || !testSeriesId) {
      return res.status(400).json({ 
        message: "userId and testSeriesId are required.", 
        results: [] 
      });
    }

    let results = await GovCourseResult.find({ userId, testSeriesId })
      .populate("courseId", "testTime")
      .lean(); // ✅ use lean to modify before sending

    if (!results || results.length === 0) {
      return res.status(200).json({
        message: "No results found for this user and test series.",
        results: []
      });
    }

    // 🔹 Convert testTime (seconds) to hours.minutes format
    results = results.map(r => {
      if (r.courseId?.testTime) {
        const totalSeconds = r.courseId.testTime;
        const minutesTotal = totalSeconds / 60; // convert to minutes
        const hours = Math.floor(minutesTotal / 60);
        const minutes = Math.round(minutesTotal % 60); // remaining minutes
        r.courseId.testTimeFormatted = Number(`${hours}.${minutes < 10 ? '0' : ''}${minutes}`);
      } else {
        r.courseId.testTimeFormatted = 0;
      }
      return r;
    });

    res.status(200).json({
      message: "Results fetched successfully.",
      results
    });

  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ 
      message: "Server error while fetching results.", 
      results: [] 
    });
  }
};


// exports.getUserDetailsByRefer = async (req, res) => {
//   try {
//     const loginUserId = req.user._id;   
//     const { coursereferId } = req.query;

//     if (!coursereferId) {
//       return res.status(400).json({ message: "coursereferId is required" });
//     }

//     const buyData = await Buy.find({
//       userreferId: loginUserId,
//       coursereferId
//     })
//       .limit(10)   // 👈 sirf 10 records fetch honge
//       .populate({
//         path: "userId",
//         model: "User",
//         select: "firstName lastName email mobileNo"
//       })
//       .populate({
//         path: "coursereferId",
//         model: "GovernmentCourse",
//         select: "title description price"
//       });

//     return res.status(200).json({
//       message: "Details fetched successfully",
//       refererId: loginUserId,
//       count: buyData.length, // yaha sirf 10 ya usse kam hoga
//       data: buyData.map(item => ({
//         userDetails: item.userId,
//         course: item.coursereferId
//       }))
//     });

//   } catch (error) {
//     console.error("Error in getUserDetailsByRefer:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

exports.getUserDetailsByRefer = async (req, res) => {
  try {
    const loginUserId = req.user._id;   
    const { coursereferId, testreferId } = req.query;

    if (!coursereferId && !testreferId) {
      return res.status(400).json({ message: "coursereferId or testreferId is required" });
    }

    let buyData = [];

    if (coursereferId) {
      buyData = await Buy.find({
        userreferId: loginUserId,
        coursereferId
      })
        .limit(10)
        .populate({
          path: "userId",
          model: "User",
          select: "firstName lastName email mobileNo"
        })
        .populate({
          path: "coursereferId",
          model: "GovernmentCourse",
          select: "courseName coursePrice"
        })
        .lean();

      buyData = buyData.map(item => ({
        userDetails: item.userId,
        course: item.coursereferId
      }));
    }

    if (testreferId) {
      const testData = await BuyTest.find({
        userreferId: loginUserId,
        testreferId
      })
        .limit(10)
        .populate({
          path: "userId",
          model: "User",
          select: "firstName lastName email mobileNo"
        })
        .populate({
          path: "testreferId",
          model: "ScheduleTest",
          select: "examName price"
        })
        .lean();

      const formattedTestData = testData.map(item => ({
        userDetails: item.userId,
        course: item.testreferId
          ? {
              _id: item.testreferId._id,
              courseName: item.testreferId.examName, // examName mapped to courseName
              coursePrice: item.testreferId.price || 0
            }
          : null
      }));

      buyData = [...buyData, ...formattedTestData];
    }

    return res.status(200).json({
      message: "Details fetched successfully",
      refererId: loginUserId,
      count: buyData.length,
      data: buyData
    });

  } catch (error) {
    console.error("Error in getUserDetailsByRefer:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};



exports.ocrFromPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const imagePath = req.file.path;

    // OCR Process
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(m) // optional: console me progress
    });

    return res.status(200).json({
      success: true,
      text: result.data.text,
      imagePath
    });

  } catch (error) {
    console.error('OCR Error:', error);
    return res.status(500).json({ success: false, message: 'OCR failed', error: error.message });
  }
};


exports.courseByIdComplimentary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    let course = await GovernmentCourse.findById(id)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("subject", "name")
      .lean();

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ---------- Expire Status Check ----------
    const currentDate = moment.tz("Asia/Kolkata").startOf("day");
    let expireStatus = true; // default

    if (course.expireDate) {
      const expireDateMoment = moment.tz(course.expireDate, "DD-MM-YYYY", "Asia/Kolkata");
      if (expireDateMoment.isBefore(currentDate)) {
        expireStatus = false;
      }
    }
    course.expireStatus = expireStatus;

    const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");

    // ---------- Helper function ----------
    const convertToFullUrl = (filePath) => {
      if (!filePath) return filePath;
      return fs.existsSync(filePath)
        ? `${baseUrl}/uploads/${path.basename(filePath)}`
        : filePath;
    };

    // ---------- Convert file paths ----------
    if (course.courseImages) {
      if (Array.isArray(course.courseImages)) {
        course.courseImages = course.courseImages.map(convertToFullUrl);
      } else if (typeof course.courseImages === "string") {
        course.courseImages = convertToFullUrl(course.courseImages);
      }
    }

    if (course.ebook) course.ebook = convertToFullUrl(course.ebook);
    if (course.studyNotes) course.studyNotes = convertToFullUrl(course.studyNotes);

    if (Array.isArray(course.testSeries)) {
      course.testSeries.forEach((topic) => {
        if (Array.isArray(topic.topicQuestions)) {
          topic.topicQuestions.forEach((q) => {
            q.questionImage = convertToFullUrl(q.questionImage);
            q.option1Image = convertToFullUrl(q.option1Image);
            q.option2Image = convertToFullUrl(q.option2Image);
            q.option3Image = convertToFullUrl(q.option3Image);
            q.option4Image = convertToFullUrl(q.option4Image);
            q.option5Image = convertToFullUrl(q.option5Image);
          });
        }
      });
    }

    // ---------- Default statuses ----------
    course.ebookStatus = false;
    course.studyNotesStatus = false;
    course.videoLectureStatus = false;

    // Agar section nahi hai ya empty hai to response se hata do
    if (!course.ebook || course.ebook === "") delete course.ebook;
    if (!course.studyNotes || course.studyNotes === "") delete course.studyNotes;
    if (!course.videoLectures || !Array.isArray(course.videoLectures) || course.videoLectures.length === 0) {
      delete course.videoLectures;
    }
    if (!course.testSeries || !Array.isArray(course.testSeries) || course.testSeries.length === 0) {
      delete course.testSeries;
    }

    // ---------- Progress calculation ----------
    const sections = ["ebook", "studyNotes", "videoLectures", "testSeries"];
    const availableSections = sections.filter((sec) => course[sec]);
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
          courseId: id,
          testSeriesId: topic._id,
        })
          .sort({ updatedAt: -1 })
          .lean();

        if (latestResult?.percentage !== undefined && latestResult?.percentage !== null) {
          topic.percentage = latestResult.percentage;
          overallProgress += perTopicWeight;
        } else {
          topic.percentage = null;
        }
      }
    }

    course.overallProgress = Number(overallProgress.toFixed(2));

    // ---------- REFER DATA ----------
    const userWithRefer = await clientUserModule.findById(userId)
      .populate({
        path: "refer.userreferId",
        model: "User",
        select: "firstName middleName lastName",
      })
      .lean();

    const referData = userWithRefer?.refer?.filter(
      (r) => r.coursereferId?.toString() === id.toString()
    );

    if (referData && referData.length > 0) {
      const r = referData[0].userreferId;
      const fullName = [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");
      course.referName = fullName;
    } else {
      course.referName = null;
    }

    return res.status(200).json(course);
  } catch (error) {
    console.error("Error fetching course by ID Complimentary:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



// exports.courseByIdComplimentary = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;

//     let course = await GovernmentCourse.findById(id)
//       .populate("category", "name")
//       .populate("subcategory", "name")
//       .populate("subject", "name")
//       .lean();

//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");

//     // ---------- Helper function ----------
//     const convertToFullUrl = (filePath) => {
//       if (!filePath) return filePath;
//       return fs.existsSync(filePath)
//         ? `${baseUrl}/uploads/${path.basename(filePath)}`
//         : filePath;
//     };

//     // ---------- Convert file paths ----------
//     if (course.courseImages) {
//       if (Array.isArray(course.courseImages)) {
//         course.courseImages = course.courseImages.map(convertToFullUrl);
//       } else if (typeof course.courseImages === "string") {
//         course.courseImages = convertToFullUrl(course.courseImages);
//       }
//     }

//     if (course.ebook) course.ebook = convertToFullUrl(course.ebook);
//     if (course.studyNotes) course.studyNotes = convertToFullUrl(course.studyNotes);

//     if (Array.isArray(course.testSeries)) {
//       course.testSeries.forEach((topic) => {
//         if (Array.isArray(topic.topicQuestions)) {
//           topic.topicQuestions.forEach((q) => {
//             q.questionImage = convertToFullUrl(q.questionImage);
//             q.option1Image = convertToFullUrl(q.option1Image);
//             q.option2Image = convertToFullUrl(q.option2Image);
//             q.option3Image = convertToFullUrl(q.option3Image);
//             q.option4Image = convertToFullUrl(q.option4Image);
//             q.option5Image = convertToFullUrl(q.option5Image);
//           });
//         }
//       });
//     }

//     // ---------- Default statuses ----------
//     course.ebookStatus = false;
//     course.studyNotesStatus = false;
//     course.videoLectureStatus = false;

//     // Agar section nahi hai to response se hata do
//     if (!course.ebook) delete course.ebook;
//     if (!course.studyNotes) delete course.studyNotes;
//     if (!course.videoLectures) delete course.videoLectures;
//     if (!course.testSeries) delete course.testSeries;

//     // ---------- Progress calculation ----------
//     const sections = ["ebook", "studyNotes", "videoLectures", "testSeries"];
//     const availableSections = sections.filter((sec) => course[sec]);
//     const totalSections = availableSections.length;
//     const sectionWeight = totalSections > 0 ? 100 / totalSections : 0;

//     let overallProgress = 0;

//     if (course.ebook) {
//       course.ebookStatus = true;
//       overallProgress += sectionWeight;
//     }

//     if (course.studyNotes) {
//       course.studyNotesStatus = true;
//       overallProgress += sectionWeight;
//     }

//     if (course.videoLectures) {
//       course.videoLectureStatus = true;
//       overallProgress += sectionWeight;
//     }

//     if (Array.isArray(course.testSeries) && course.testSeries.length) {
//       const perTopicWeight = sectionWeight / course.testSeries.length;

//       for (const topic of course.testSeries) {
//         const latestResult = await GovCourseResult.findOne({
//           userId,
//           courseId: id,
//           testSeriesId: topic._id,
//         })
//           .sort({ updatedAt: -1 })
//           .lean();

//         if (latestResult?.percentage !== undefined && latestResult?.percentage !== null) {
//           topic.percentage = latestResult.percentage;
//           overallProgress += perTopicWeight;
//         } else {
//           topic.percentage = null;
//         }
//       }
//     }

//     course.overallProgress = Number(overallProgress.toFixed(2));

//     // ---------- REFER DATA ----------
//     const userWithRefer = await clientUserModule.findById(userId)
//       .populate({
//         path: "refer.userreferId",
//         model: "User",
//         select: "firstName middleName lastName",
//       })
//       .lean();

//     const referData = userWithRefer?.refer?.filter(
//       (r) => r.coursereferId?.toString() === id.toString()
//     );

//     if (referData && referData.length > 0) {
//       const r = referData[0].userreferId;
//       const fullName = [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");
//       course.referName = fullName;
//     } else {
//       course.referName = null;
//     }

//     return res.status(200).json(course);
//   } catch (error) {
//     console.error("Error fetching course by ID Complimentary:", error);
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };
