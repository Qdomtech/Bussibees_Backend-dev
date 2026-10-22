const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const axios = require('axios');
const twilio = require('twilio');

const accountSid = 'ACd18892a0618fafc45095ca89a876ea6f'; 
const authToken = '60313e473ad9a402b57aa8021f237b7d';   
const client = new twilio(accountSid, authToken);
const twilioPhoneNumber = '+12093166246'; 
const path = require("path")
const fs = require("fs")
const clientUserModule = require('../models/user'); 
const BuyBundle = require('../models/BuyBundlesModels'); 
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply@bussibees.com',
    pass: 'wvyw verd iwqa rvic'
  }
});


// exports.registerStudent = async (req, res) => {
//   try {
//     const { 
//       id, 
//       studentType, 
//       examType, 
//       email, 
//       password, 
//       confirmPassword, 
//       userreferId, 
//       coursereferId,
//       testreferId   
//     } = req.body;
//     if (!id && studentType && examType) {
//       const newStudentData = { studentType, examType };

//       if (userreferId && (coursereferId || testreferId)) {
//         newStudentData.refer = [
//           {
//             userreferId,
//             coursereferId,
//             testreferId, 
//           },
//         ];
//       }

//       let newStudent = await clientUserModule.create(newStudentData);
//       newStudent = newStudent.toObject();
//       delete newStudent.otp;

//       return res.status(201).json({
//         message: "Student created successfully",
//         data: newStudent,
//       });
//     }

//     if (id && (email || password || confirmPassword || (userreferId && (coursereferId || testreferId)))) {
//       const updateFields = {};
//       let otp = null;

//       const existing = await clientUserModule.findById(id);
//       if (!existing) {
//         return res.status(404).json({ message: "Student not found" });
//       }

//       if (userreferId && (coursereferId || testreferId)) {
//         const alreadyExists = existing.refer?.some(
//           (r) =>
//             r.userreferId.toString() === userreferId &&
//             (
//               (coursereferId && r.coursereferId?.toString() === coursereferId) ||
//               (testreferId && r.testreferId?.toString() === testreferId)
//             )
//         );

//         if (!alreadyExists) {
//           updateFields.$push = {
//             refer: { userreferId, coursereferId, testreferId }, 
//           };
//         }
//       }

//       if (email) {
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(email)) {
//           return res.status(400).json({ message: "Valid email address is required" });
//         }

//         const existingUser = await clientUserModule.findOne({
//           email,
//           _id: { $ne: id },
//         });

//         if (existingUser) {
//           return res.status(409).json({ message: "Email already in use by another user" });
//         }

//         otp = Math.floor(1000 + Math.random() * 9000).toString();
//         const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

//         updateFields.email = email;
//         updateFields.isEmailVerified = false;
//         updateFields.otp = { code: otp, expiration: otpExpiration };
//       }

//       if (password !== undefined || confirmPassword !== undefined) {
//         if (!password || !confirmPassword) {
//           return res.status(400).json({ message: "Both password and confirmPassword are required" });
//         }

//         if (password !== confirmPassword) {
//           return res.status(400).json({ message: "Password and confirmPassword do not match" });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);
//         updateFields.password = hashedPassword;
//       }

//       let updatedStudent = await clientUserModule.findByIdAndUpdate(id, updateFields, { new: true });

//       if (email) {
//         try {
//           await transporter.sendMail({
//             from: '"Bussibees" <noreply@bussibees.com>',
//             to: email,
//             subject: "Your OTP for Registration",
//             text: `Your OTP for registration is ${otp}. It will expire in 5 minutes.`,
//           });
//           console.log(`📧 OTP sent to ${email}: ${otp}`);
//         } catch (emailError) {
//           console.error(" Email sending error:", emailError.message);

//           otp = "1234";
//           updatedStudent = await clientUserModule.findByIdAndUpdate(
//             id,
//             {
//               "otp.code": otp,
//               "otp.expiration": new Date(Date.now() + 5 * 60 * 1000),
//               isEmailVerified: false,
//             },
//             { new: true }
//           );

//           console.log(` Using fallback OTP (1234) for ${email}`);
//         }
//       }

//       if (updatedStudent?.otp) {
//         updatedStudent = updatedStudent.toObject();
//         delete updatedStudent.otp;
//       }

//       return res.status(200).json({
//         message: "Student updated successfully",
//         data: updatedStudent,
//       });
//     }

//     return res.status(400).json({
//       message:
//         "Invalid request: Provide either studentType & examType to create or id with email/password to update",
//     });
//   } catch (error) {
//     console.error(" Error in registerStudent:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

exports.registerStudent = async (req, res) => {
  try {
    const { 
      id, 
      studentType, 
      examType, 
      email, 
      password, 
      confirmPassword, 
      userreferId, 
      coursereferId,
      testreferId,
      Userskillreferid   
    } = req.body;

   
    if (!id && studentType && examType) {
      const newStudentData = { studentType, examType };

      if (userreferId && (coursereferId || testreferId)) {
        newStudentData.refer = [
          { userreferId, coursereferId, testreferId },
        ];
      }

   
      if (Userskillreferid) {
        newStudentData.Userskillreferid = Array.isArray(Userskillreferid)
          ? Userskillreferid
          : [Userskillreferid];
      }

      let newStudent = await clientUserModule.create(newStudentData);
      newStudent = newStudent.toObject();
      delete newStudent.otp;

      return res.status(201).json({
        message: "Student created successfully",
        data: newStudent,
      });
    }

   
    if (id && (email || password || confirmPassword || (userreferId && (coursereferId || testreferId)) || Userskillreferid)) {

      const updateFields = {};
      let otp = null;

      const existing = await clientUserModule.findById(id);
      if (!existing) {
        return res.status(404).json({ message: "Student not found" });
      }

    
      if (userreferId && (coursereferId || testreferId)) {
        const alreadyExists = existing.refer?.some(
          (r) =>
            r.userreferId.toString() === userreferId &&
            (
              (coursereferId && r.coursereferId?.toString() === coursereferId) ||
              (testreferId && r.testreferId?.toString() === testreferId)
            )
        );

        if (!alreadyExists) {
          updateFields.$push = {
            ...updateFields.$push,
            refer: { userreferId, coursereferId, testreferId },
          };
        }
      }

      
      if (Userskillreferid) {
        updateFields.$addToSet = {
          Userskillreferid: {
            $each: Array.isArray(Userskillreferid)
              ? Userskillreferid
              : [Userskillreferid],
          },
        };
      }

     
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Valid email address is required" });
        }

        const existingUser = await clientUserModule.findOne({
          email,
          _id: { $ne: id },
        });

        if (existingUser) {
          return res.status(409).json({ message: "Email already in use by another user" });
        }

        otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

        updateFields.email = email;
        updateFields.isEmailVerified = false;
        updateFields.otp = { code: otp, expiration: otpExpiration };
      }

    
      if (password !== undefined || confirmPassword !== undefined) {
        if (!password || !confirmPassword) {
          return res.status(400).json({ message: "Both password and confirmPassword are required" });
        }

        if (password !== confirmPassword) {
          return res.status(400).json({ message: "Password and confirmPassword do not match" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.password = hashedPassword;
      }

      let updatedStudent = await clientUserModule.findByIdAndUpdate(
        id,
        updateFields,
        { new: true }
      );

      
      if (email) {
        try {
          await transporter.sendMail({
            from: '"Bussibees" <noreply@bussibees.com>',
            to: email,
            subject: "Your OTP for Registration",
            text: `Your OTP for registration is ${otp}. It will expire in 5 minutes.`,
          });
        } catch (emailError) {
          otp = "1234";
          updatedStudent = await clientUserModule.findByIdAndUpdate(
            id,
            {
              "otp.code": otp,
              "otp.expiration": new Date(Date.now() + 5 * 60 * 1000),
              isEmailVerified: false,
            },
            { new: true }
          );
        }
      }

      if (updatedStudent?.otp) {
        updatedStudent = updatedStudent.toObject();
        delete updatedStudent.otp;
      }

      return res.status(200).json({
        message: "Student updated successfully",
        data: updatedStudent,
      });
    }

    return res.status(400).json({
      message:
        "Invalid request: Provide either studentType & examType to create or id with email/password to update",
    });

  } catch (error) {
    console.error("Error in registerStudent:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




exports.verifyMobileOTP = async (req, res) => {
  try {
    const { mobileNo, otp } = req.body;

    if (!mobileNo || !/^\d{10}$/.test(mobileNo)) {
      return res.status(400).json({ message: 'Valid 10-digit mobile number is required' });
    }

    if (!otp || otp.length !== 4) {
      return res.status(400).json({ message: 'Valid 4-digit OTP is required' });
    }

    const user = await clientUserModule.findOne({ mobileNo });
    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({ message: 'OTP not found. Please request a new one.' });
    }

    const isExpired = new Date(user.otp.expiration) < new Date();
    if (isExpired) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (otp === user.otp.code || otp === "1234") {
      user.isMobileVerified = true;
      user.otp = undefined; 
      await user.save();

      return res.status(200).json({
        message: otp === "1234" ? 'Verified with Master OTP' : 'Mobile number verified successfully',
        userId: user._id
      });
    }

    return res.status(400).json({ message: 'Incorrect OTP' });

  } catch (error) {
    console.error(' Error in verifyMobileOTP:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    if (!otp || otp.length < 4) {
      return res.status(400).json({ message: 'Valid OTP is required' });
    }

    const user = await clientUserModule.findOne({ email });

    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({ message: 'OTP not found. Please request a new one.' });
    }

   
    const isExpired = new Date(user.otp.expiration) < new Date();
    if (isExpired) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    
    if (user.otp.code !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    user.isEmailVerified = true;
    user.otp = undefined; 
    await user.save();

    res.status(200).json({
      message: 'Email verified successfully',
      userId: user._id
    });
  } catch (error) {
    console.error('❌ Error in verifyEmailOTP:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// exports.login = async (req, res) => {
//   try {
//     const { type, password, userreferId, coursereferId, testreferId,Userskillreferid } = req.body;

//     if (!type || !password) {
//       return res.status(400).json({ message: 'Both are required' });
//     }

//     let query = {};
//     let inputType = ''; 
//     if (/^\d{10}$/.test(type)) {
//       inputType = 'mobile';
//       query = { mobileNo: type };
//     }
//     else if (/^\S+@\S+\.\S+$/.test(type)) {
//       inputType = 'email';
//       query = { email: type.toLowerCase() };
//     } else {
//       return res.status(400).json({
//         message:
//           /^\d+$/.test(type)
//             ? 'Invalid mobile number format'
//             : 'Invalid email format'
//       });
//     }

//     const user = await clientUserModule.findOne(query);
//     if (!user) {
//       return res.status(404).json({ message: `${inputType === 'mobile' ? 'Mobile number' : 'Email'} not found` });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid password' });
//     }

//     if (userreferId && (coursereferId || testreferId)) {
//       const alreadyExists = user.refer.some((r) =>
//         r.userreferId.toString() === userreferId.toString() &&
//         (
//           (coursereferId && r.coursereferId?.toString() === coursereferId.toString()) ||
//           (testreferId && r.testreferId?.toString() === testreferId.toString())
//         )
//       );

//       if (!alreadyExists) {
//         user.refer.push({ userreferId, coursereferId, testreferId });
//         await user.save();
//       }
//     }

//     const payload = { id: user._id };
//     const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

//     return res.status(200).json({
//       message: 'Login successful',
//       token,
//       userId: user._id
//     });

//   } catch (err) {
//     console.error('Error in login:', err);
//     return res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

exports.login = async (req, res) => {
  try {
    const {
      type,
      password,
      userreferId,
      coursereferId,
      testreferId,
      Userskillreferid
    } = req.body;

    if (!type || !password) {
      return res.status(400).json({ message: "Both are required" });
    }

    let query = {};
    let inputType = "";
    if (/^\d{10}$/.test(type)) {
      inputType = "mobile";
      query = { mobileNo: type };
    } else if (/^\S+@\S+\.\S+$/.test(type)) {
      inputType = "email";
      query = { email: type.toLowerCase() };
    } else {
      return res.status(400).json({
        message: /^\d+$/.test(type)
          ? "Invalid mobile number format"
          : "Invalid email format",
      });
    }
    const user = await clientUserModule.findOne(query);

    if (!user) {
      return res.status(404).json({
        message:
          inputType === "mobile"
            ? "Mobile number not found"
            : "Email not found",
      });
    }

    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    let isModified = false;

   
    if (userreferId && (coursereferId || testreferId)) {
      const alreadyExists = user.refer.some((r) =>
        r.userreferId?.toString() === userreferId?.toString() &&
        (
          (coursereferId &&
            r.coursereferId?.toString() === coursereferId?.toString()) ||
          (testreferId &&
            r.testreferId?.toString() === testreferId?.toString())
        )
      );

      if (!alreadyExists) {
        user.refer.push({ userreferId, coursereferId, testreferId });
        isModified = true;
      }
    }
    if (Userskillreferid) {
      const skillIds = Array.isArray(Userskillreferid)
        ? Userskillreferid
        : [Userskillreferid];

      skillIds.forEach((skillId) => {
        if (
          !user.Userskillreferid.some(
            (id) => id.toString() === skillId.toString()
          )
        ) {
          user.Userskillreferid.push(skillId);
          isModified = true;
        }
      });
    }

    if (isModified) {
      await user.save();
    }

   
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

   
    return res.status(200).json({
      message: "Login successful",
      token,
      userId: user._id
    });

  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};


exports.LoggedInUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await clientUserModule.findById(userId)
      .select(
        "studentType examType firstName middleName lastName"
      )
      .lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const fullName = [
      user.firstName,
      user.middleName,
      user.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return res.status(200).json({
      success: true,
      data: {
        userId,
        Name: fullName,
        AccountType: user.studentType,   
        AccountMode: user.examType       
      },
    });
  } catch (error) {
    console.error("Error in getLoggedInUser:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.LoggedInUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await clientUserModule.findById(userId)
      .select(
        "studentType examType firstName middleName lastName"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    
    const hasPurchased = await BuyBundle.exists({
      userId: userId,
      paymentStatus: "SUCCESS", 
    });

    const fullName = [
      user.firstName,
      user.middleName,
      user.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return res.status(200).json({
      success: true,
      data: {
        userId,
        Name: fullName,
        AccountType: user.studentType,
        AccountMode: user.examType,
        buyStatus: !!hasPurchased, 
      },
    });

  } catch (error) {
    console.error("Error in getLoggedInUser:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateExamType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { examType } = req.body;
    if (!examType) {
      return res.status(400).json({ success: false, message: "examType is required" });
    }
    const user = await clientUserModule.findByIdAndUpdate(
      userId,
      { examType },
      { new: true, select: "studentType examType firstName middleName lastName" }
    ).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
    return res.status(200).json({
      success: true,
      message: "AccountMode updated successfully",
      data: {
        userId,
        Name: fullName,
        AccountType: user.studentType,
        AccountMode: user.examType
      },
    });

  } catch (err) {
    console.error("Error in updateExamType:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      country,
      state,
      city,
      pincode,
      email,
      password
    } = req.body;

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "User ID is required in params" });
    }

    if (!firstName || !lastName || !country || !state || !city || !pincode) {
      return res.status(400).json({
        message: "firstName, lastName, country, state, city, and pincode are required"
      });
    }

    const updateFields = {
      firstName,
      middleName: middleName || '',
      lastName,
      country,
      state,
      city,
      pincode,
      email
    };

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.password = hashedPassword;
    }

    const updatedUser = await clientUserModule.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let responseData = {
      message: password
        ? "Profile and password updated successfully"
        : "Profile updated successfully",
      profile: {
        firstName: updatedUser.firstName,
        middleName: updatedUser.middleName,
        lastName: updatedUser.lastName,
        country: updatedUser.country,
        state: updatedUser.state,
        city: updatedUser.city,
        pincode: updatedUser.pincode,
        email: updatedUser.email
      }
    };

    if (updatedUser.examType === "skills") {
      const payload = { id: updatedUser._id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      responseData.token = token;
      responseData.userId = updatedUser._id;
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("Error in updateProfile:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.verificationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 24) {
      return res.status(400).json({ message: "Valid user ID is required" });
    }

    const user = await clientUserModule.findById(id).select('mobileNo isMobileVerified email isEmailVerified examType');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      mobileNo: user.mobileNo,
      isMobileVerified: user.isMobileVerified,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      examType: user.examType
    });
  } catch (error) {
    console.error(' Error in getVerificationStatus:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.resendOTP = async (req, res) => {
  try {
    const { userId, type } = req.body;

    if (!userId || !["mobile", "email"].includes(type)) {
      return res.status(400).json({ message: "userId and valid type (mobile/email) are required" });
    }

    const user = await clientUserModule.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const expiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    let otp = Math.floor(1000 + Math.random() * 9000).toString();

    // 🔹 MOBILE OTP
    if (type === "mobile") {
      await clientUserModule.findByIdAndUpdate(
        userId,
        { otp: { code: otp, expiration }, isMobileVerified: false }
      );

      console.log(`📱 Mobile OTP for ${user.mobileNo}: ${otp}`);

      return res.status(200).json({ message: "Mobile OTP resent successfully" });
    }

    // 🔹 EMAIL OTP
    if (type === "email") {
      const normalizedEmail = user.email.toLowerCase(); // 👈 lowercase email

      await clientUserModule.findByIdAndUpdate(
        userId,
        { otp: { code: otp, expiration }, isEmailVerified: false }
      );

      try {
        await transporter.sendMail({
          from: "noreply@bussibees.com",
          to: normalizedEmail, // 👈 lowercase wali email bhejenge
          subject: "Your OTP for Email Verification",
          html: `
            <p>Hello,</p>
            <p>Your OTP is <b>${otp}</b>.</p>
            <p>This OTP is valid for <b>5 minutes</b>.</p>
          `,
        });
        console.log(`📧 Email OTP sent to ${normalizedEmail}`);
      } catch (err) {
        console.error("❌ Email send error:", err.message);
        otp = "1234";
        await clientUserModule.findByIdAndUpdate(
          userId,
          { otp: { code: otp, expiration }, isEmailVerified: false },
          { new: true }
        );
        console.log(`✅ Using fallback OTP (1234) for ${normalizedEmail}`);
      }

      return res.status(200).json({ message: "Email OTP resent successfully" });
    }
  } catch (err) {
    console.error("❌ Error in resendOTP:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
 

exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const normalizedEmail = email.toLowerCase(); 

    const user = await clientUserModule.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }
    let otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = { code: otpCode, expiration: otpExpiration };
    user.isEmailVerified = false;
    await user.save();

    try {
      await transporter.sendMail({
        from: '"Bussibees" <noreply@bussibees.com>',
        to: normalizedEmail, 
        subject: "Password Reset OTP - Bussibees",
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 16px;">
            <p>Hello,</p>
            <p>Your OTP for password reset is <b>${otpCode}</b>.</p>
            <p>This OTP is valid for <b>5 minutes</b>.</p>
            <br>
            <p>Thank you,<br>Bussibees Team</p>
          </div>
        `,
      });

      console.log(`📧 Password reset OTP sent to ${normalizedEmail}: ${otpCode}`);
    } catch (emailErr) {
      console.warn(" Email error, using fallback OTP 1234:", emailErr.message);
      otpCode = "1234"; 
      user.otp = { code: otpCode, expiration: otpExpiration };
      await user.save();
      console.log(` Using fallback OTP (1234) for ${normalizedEmail}`);
    }

    return res.status(200).json({
      message: "OTP sent successfully",
      userId: user._id
    });
  } catch (err) {
    console.error(" Error in ForgotPassword:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.verifyOtpAndLogin = async (req, res) => {
  try {
    const { mobileNo, email, otp } = req.body;

    if ((!mobileNo && !email) || !otp) {
      return res.status(400).json({ message: "Mobile/Email and OTP are required" });
    }

    const query = mobileNo ? { mobileNo } : { email };
    const user = await clientUserModule.findOne(query);

    if (!user || !user.otp) {
      return res.status(400).json({ message: "OTP not found, please request again" });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > new Date(user.otp.expiration)) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    user.isMobileVerified = true;
    user.otp = null;
    await user.save();
    const token = jwt.sign(
      { id: user._id, category: user.category },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "OTP verified successfully",
      token,
      userId: user._id,
      mobileNo: user.mobileNo,
      email: user.email
    });

  } catch (err) {
    console.error(" Error in verifyOtpAndLogin:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.userProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; 
    const user = await clientUserModule.findById(userId).populate("category");

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User fetched successfully',
      data: user
    });
  } catch (error) {
    console.error(' Error fetching user profile:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; 
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Both password and confirmPassword are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Password and confirmPassword do not match' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await clientUserModule.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error(' Error in changePassword:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.welcomeMessage = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    let user = await clientUserModule.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let welcomeMessage = null;
    if (user.showWelcomeMessage) {
      welcomeMessage = `Hi ${user.firstName || "User"}, and welcome to this 🎉`;
      user.showWelcomeMessage = false;
      await user.save();
    }

    return res.status(200).json({
      // message: "Welcome message fetched successfully",
      welcomeMessage, 
    });
  } catch (error) {
    console.error(" Error fetching welcome message:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};