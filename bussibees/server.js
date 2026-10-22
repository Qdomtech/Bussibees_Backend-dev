require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db');
const videoRoutes = require('./routes/videoRoutes');
const governmentCourseRoutes = require('./routes/governmentcourseRoutes');
const userRoutes = require('./routes/userRoutes');
const app = express();
const PORT = process.env.PORT || 5000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/v1', require('./routes/examTypeRoutes'));

app.use('/api/v1', userRoutes);
app.use('/api/v1', videoRoutes);
app.use('/api/v1', governmentCourseRoutes);


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));