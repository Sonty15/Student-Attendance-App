// backend/routes/attendance.js
const router = require('express').Router();
let Attendance = require('../models/Attendance');
let Student = require('../models/Student'); // ต้องใช้ Student model ด้วย

// บันทึกการเช็คชื่อ
router.route('/add').post(async (req, res) => {
    try {
        const { studentId, date, status } = req.body; // date ควรเป็น 'YYYY-MM-DD' string

        // แปลง date string เป็น Date object (เที่ยงคืนของวันนั้นๆ เพื่อความสอดคล้อง)
        const checkDate = new Date(date);
        checkDate.setUTCHours(0, 0, 0, 0); // ตั้งเวลาเป็นเที่ยงคืน UTC

        // ค้นหานักเรียนจาก studentId เพื่อเอา _id
        const student = await Student.findOne({ studentId: studentId });
        if (!student) {
            return res.status(404).json('Student not found with provided ID');
        }

        const newAttendance = new Attendance({
            student: student._id,
            date: checkDate,
            status,
            class: student.class // เก็บ class ของนักเรียนไว้ใน record การเช็คชื่อด้วย
        });

        await newAttendance.save();
        res.json('Attendance recorded!');
    } catch (err) {
        // จัดการกรณีที่เช็คชื่อซ้ำวันเดียวกัน
        if (err.code === 11000) { // MongoDB duplicate key error code
            return res.status(409).json('Attendance for this student on this date already exists.');
        }
        res.status(400).json('Error: ' + err);
    }
});

// ดึงข้อมูลการเช็คชื่อรายวันสำหรับชั้นเรียนที่ระบุ (สำหรับการเช็คชื่อ)
router.route('/daily/:class/:date').get(async (req, res) => {
    try {
        const { class: studentClass, date } = req.params;
        const queryDate = new Date(date);
        queryDate.setUTCHours(0, 0, 0, 0); // ตั้งเวลาเป็นเที่ยงคืน UTC

        const attendances = await Attendance.find({
            class: studentClass,
            date: queryDate
        }).populate('student', 'firstName lastName studentId'); // ดึงข้อมูลนักเรียนมาด้วย

        res.json(attendances);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// ดึงข้อมูลการเช็คชื่อทั้งหมดสำหรับชั้นเรียนที่ระบุ (สำหรับรายงาน)
// สามารถเพิ่ม query parameters สำหรับ filter ตามช่วงวันที่ได้
router.route('/report/:class').get(async (req, res) => {
    try {
        const { class: studentClass } = req.params;
        const { startDate, endDate } = req.query; // ดึงจาก query เช่น ?startDate=2024-01-01&endDate=2024-12-31

        let query = { class: studentClass };

        if (startDate && endDate) {
            const startOfDay = new Date(startDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(endDate);
            endOfDay.setUTCHours(23, 59, 59, 999);

            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        const attendances = await Attendance.find(query)
            .populate('student', 'firstName lastName studentId')
            .sort({ date: 1 }); // เรียงตามวันที่

        res.json(attendances);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});


module.exports = router;