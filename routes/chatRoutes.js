const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/chatmessage');
const auth = require('../middleware/auth');

// router.post('/chat/report/:testId/:messageId', async (req, res) => {
//   try {
//     const { testId, messageId } = req.params;

    
//     const message = await ChatMessage.findOne({ _id: messageId, testId });
//     if (!message) {
//       return res.status(404).json({ message: "Message not found" });
//     }

    
//     message.reports += 1;
//     await message.save();

//     res.json({ message: "Message reported successfully", reports: message.reports });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });







router.post('/chat/report/:testId/:messageId', async (req, res) => {
  try {
    const { testId, messageId } = req.params;
    const userId = req.body.userId; 
    const message = await ChatMessage.findOne({ _id: messageId, testId });
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.reportedBy.includes(userId)) {
      return res.status(400).json({ message: "You have already reported this message" });
    }

    message.reports = (message.reports || 0) + 1;
    message.reportedBy.push(userId);
    await message.save();

    res.json({ message: "Message reported successfully", reports: message.reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
