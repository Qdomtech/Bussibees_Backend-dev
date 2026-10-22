const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const User = require("../models/user")
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOtp);

// router.get("/verify-token", async (req, res) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({
//       status: "no",
//       message: "Token not provided properly."
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
//     const user = await User.findById(decoded.id);

//     if (!user) {
//       return res.status(401).json({
//         status: "no",
//         message: "User not found. Account may have been deleted."
//       });
//     }

//     return res.status(200).json({
//       status: "yes",
//       message: "Token is valid.",
//       userId: user._id
//     });

//   } catch (err) {
//     console.error("Token verification failed:", err.message);

//     return res.status(401).json({
//       status: "no",
//       message: "Token invalid or expired."
//     });
//   }
// });


router.get('/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: "no", message: "Token not provided properly." });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({
      status: "yes",
      message: "Token is valid.",
      userId: decoded.id
    });
    
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({
      status: "no",
      message: "Token invalid or expired.",
      error: err.message  
    });
  }
});

router.get('/check', (req, res) => {
  return res.status(200).json({ response: true });
});
module.exports = router;