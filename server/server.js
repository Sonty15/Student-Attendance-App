// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // โหลด .env file

const studentsRouter = require('./routes/students');
const attendanceRouter = require('./routes/attendance');

const app = express();
const port = process.env.PORT || 4422;

// Middleware
app.use(cors());
app.use(express.json()); // สำหรับ Parse JSON Body

// เชื่อมต่อ MongoDB
const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes (จะเพิ่มในภายหลัง)
app.get('/', (req, res) => {
    res.send('Student Attendance API is running!');
});

app.use('/students', studentsRouter);
app.use('/attendance', attendanceRouter);

// เริ่ม Server
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});