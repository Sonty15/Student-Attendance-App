// backend/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // อ้างอิงถึง Student Model
    date: { type: Date, required: true }, // วันที่เช็คชื่อ (จะเก็บเป็น YYYY-MM-DD)
    status: { type: String, enum: ['มา', 'ป่วย', 'ลา', 'ขาด'], required: true },
    class: { type: String, required: true } // เพื่อความสะดวกในการ Query แยกชั้น
}, {
    timestamps: true
});

// เพิ่ม index เพื่อประสิทธิภาพในการค้นหา
attendanceSchema.index({ date: 1, student: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;