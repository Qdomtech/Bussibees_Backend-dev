require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const User = require('./models/user');
const ChatMessage = require('./models/chatmessage');
const ScheduleTest = require('./models/testscheduled');

// Routes
const authRoutes = require('./routes/authRoutes');
const examTypeRoutes = require('./routes/examTypeRoutes');
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/buyRoutes');
const governmentCourseRoutes = require('./routes/governmentcourseRoutes');
const scheduleTestRoutes = require('./routes/schduletestRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const wishListRoutes = require('./routes/wishListRoutes');
const chatRoutes = require('./routes/chatRoutes');
const SkillRoutes = require('./routes/skillCourseRoutes');
const BundleRoutes = require('./routes/bundleRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/api/v1/socket.io"
});


connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);
app.use('/api/v1', examTypeRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', videoRoutes);
app.use('/api/v1', governmentCourseRoutes);
app.use('/api/v1', scheduleTestRoutes);
app.use('/api/v1', subjectRoutes);
app.use('/api/v1', wishListRoutes);
app.use('/api/v1', chatRoutes);
app.use('/api/v1', SkillRoutes);
app.use('/api/v1', BundleRoutes);
app.use('/api/admin', adminRoutes);

app.use('/chat', express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error: Token required"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "testsecret");
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error("Authentication error: User not found"));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on('connection', async (socket) => {
  console.log(`✅ User connected: ${socket.user.firstName}`); // server log [web:31]

  // ------------------------------
  // Load today's test messages only
  // ------------------------------
  socket.on('loadTestGlobalMessages', async (testId) => {
    try {
      console.log('[loadTestGlobalMessages] testId:', testId); // server log [web:31]

      if (!mongoose.Types.ObjectId.isValid(testId)) {
        console.warn('[loadTestGlobalMessages] Invalid testId'); // server log [web:31]
        return socket.emit("loadOldMessages", { error: "Invalid testId" }); // unchanged [web:31]
      }

      const test = await ScheduleTest.findById(testId).lean();
      if (!test) {
        console.warn('[loadTestGlobalMessages] Test not found:', testId); // server log [web:31]
        return socket.emit("loadOldMessages", { error: "Test not found" }); // unchanged [web:31]
      }
      const examName = test.examName || "Unknown Exam"; // unchanged [web:31]

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      console.log('[loadTestGlobalMessages] window:', { startOfDay, endOfDay }); // server log [web:31]

      const messages = await ChatMessage.find({
        group: "global",
        testId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ createdAt: 1 }).lean();
      console.log('[loadTestGlobalMessages] messages:', messages.length); // server log [web:31]

      const userIds = new Set(messages.map(msg => msg.userId?.toString()));
      const userCount = userIds.size; // unchanged [web:31]

      // Minimal, safe aggregation: same logic, explicit userId in project for log visibility
      const userObjectId = new mongoose.Types.ObjectId(socket.user._id);
      const totalReportsAgg = await ChatMessage.aggregate([
        {
          $match: {
            userId: userObjectId,
            testId, // keep as-is to avoid changing stored-type expectation
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        { $project: { userId: 1, reports: { $ifNull: ["$reports", 0] } } },
        { $group: { _id: "$userId", totalReports: { $sum: "$reports" } } }
      ]);
      console.log('[loadTestGlobalMessages] totalReportsAgg:', totalReportsAgg); // server log [web:31]

      const totalReports = totalReportsAgg[0]?.totalReports || 0; // unchanged [web:61]
      const isBlocked = totalReports >= 10; // unchanged [web:31]
      console.log('[loadTestGlobalMessages] totals:', { totalReports, isBlocked, userCount }); // server log [web:31]

      // Include totalReports in response (minimal addition)
      socket.emit("loadOldMessages", {
        examName,
        messages: messages.map(msg => ({ ...msg, reports: msg.reports || 0 })),
        userCount,
        totalReports,
        isBlocked
      }, () => {
        console.log('[ack] loadOldMessages delivered to client'); // optional ack log [web:31]
      });

    } catch (err) {
      console.error("❌ Error loading messages:", err); // server log [web:31]
      socket.emit("loadOldMessages", { error: "Server error while loading messages" }); // unchanged [web:31]
    }
  });

  // ------------------------------
  // Send message
  // ------------------------------
  socket.on('sendMessageGlobal', async (msg) => {
    try {
      const userId = socket.user._id;
      console.log('[sendMessageGlobal] payload:', msg); // server log [web:31]

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const userReportsAgg = await ChatMessage.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(userId), 
            testId: msg.testId,
            createdAt: { $gte: startOfDay, $lte: endOfDay } 
          } 
        },
        { $project: { userId: 1, reports: { $ifNull: ["$reports", 0] } } },
        { $group: { _id: "$userId", totalReports: { $sum: "$reports" } } }
      ]);

      const totalReports = userReportsAgg[0]?.totalReports || 0; // unchanged [web:61]
      const isBlocked = totalReports >= 10; // unchanged [web:31]
      console.log('[sendMessageGlobal] totalReports:', totalReports, 'isBlocked:', isBlocked); // server log [web:31]

      if (isBlocked) {
        socket.emit("blockedStatus", {
          message: "🚫 You are blocked from sending messages (reports ≥ 10).",
          totalReports,
          isBlocked
        });
        return;
      }

      const chat = await ChatMessage.create({
        userId,
        user: `${socket.user.firstName?.charAt(0) || ''}${socket.user.lastName?.charAt(0) || ''}`,
        role: msg.role || "user",
        group: "global",
        message: msg.message,
        messageTime: msg.messageTime,
        testId: msg.testId
      });

      const messages = await ChatMessage.find({
        group: "global",
        testId: msg.testId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }).lean();

      const userIds = new Set(messages.map(m => m.userId?.toString()));
      const userCount = userIds.size;

      io.emit('receiveMessageGlobal', {
        ...chat.toObject(),
        reports: chat.reports || 0,
        userCount,
        totalReports,
        isBlocked: false
      });

    } catch (err) {
      console.error("❌ Error sending message:", err); // server log [web:31]
    }
  });

  // ------------------------------
  // Disconnect
  // ------------------------------
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.firstName}`); // server log [web:31]
  });
});

app.get('/generate-token/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "testsecret", { expiresIn: '24h' });
    res.json({ token, firstName: user.firstName });
  } catch (err) {
    console.error(" Error generating token:", err);
    res.status(500).json({ message: "Server error" });
  }
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
