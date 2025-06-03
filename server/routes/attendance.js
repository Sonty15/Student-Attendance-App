// server/routes/attendance.js
const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance.js');
const Student = require('../models/Student.js');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const { format, parseISO, startOfDay, endOfDay } = require('date-fns'); // เพิ่ม startOfDay, endOfDay

// Middleware เพื่อป้องกันการเข้าถึงที่ไม่ได้รับอนุญาต (ถ้ามี)
// const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/attendance/daily/:class/:date
// @desc    Get daily attendance for a specific class on a specific date
// @access  Public (สามารถปรับเป็น Private ได้ถ้ามีระบบ Authentication)
router.route('/daily/:class/:date').get(async (req, res) => {
    try {
        const { class: studentClass, date } = req.params;
        const targetDate = parseISO(date);
        const start = startOfDay(targetDate);
        const end = endOfDay(targetDate);

        const attendances = await Attendance.find({
            class: studentClass,
            date: { $gte: start, $lte: end }
        }).populate('student');

        if (!attendances) {
            return res.status(404).json({ message: 'Attendance records not found for this class and date' });
        }
        res.json(attendances);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


router.post('/add', async (req, res) => {
    try {
        const attendanceRecords = req.body; // รับ array ของ attendance objects จาก frontend

        if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
            return res.status(400).json({ message: 'ไม่มีข้อมูลการเช็คชื่อที่ส่งมา' });
        }

        const results = [];
        for (const record of attendanceRecords) {
            try {
                // 1. ตรวจสอบและแปลง studentId ให้เป็น ObjectId
                if (!mongoose.Types.ObjectId.isValid(record.studentId)) {
                    results.push({ success: false, message: `Invalid studentId format: ${record.studentId}` });
                    continue;
                }
                const studentObjectId = new mongoose.Types.ObjectId(record.studentId);

                // 2. แปลง date string (MM/dd/yyyy) ให้เป็น Date object
                // ตรวจสอบรูปแบบวันที่ที่คาดหวัง เช่น 'MM/dd/yyyy'
                const parts = record.date.split('/');
                if (parts.length !== 3) {
                     results.push({ success: false, message: `Invalid date format, expected MM/dd/yyyy: ${record.date}` });
                     continue;
                }
                const [month, day, year] = parts;
                // สร้าง Date object: new Date(year, monthIndex, day)
                // monthIndex คือ เดือน - 1 (มกราคม=0, ธันวาคม=11)
                const parsedDate = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10));

                if (isNaN(parsedDate.getTime())) { // ตรวจสอบว่าวันที่ถูกต้องหรือไม่
                    results.push({ success: false, message: `Could not parse date: ${record.date}` });
                    continue;
                }

                // สร้างช่วงเวลาสำหรับวันที่ที่เลือก (เพื่อให้เปรียบเทียบแค่ในวันนั้นๆ ไม่รวมเวลา)
                const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
                const endOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate() + 1);

                // 3. ค้นหาการเช็คชื่อที่มีอยู่สำหรับนักเรียนคนนี้ในวันนั้น
                let existingAttendance = await Attendance.findOne({
                    student: studentObjectId,
                    date: { $gte: startOfDay, $lt: endOfDay } // ค้นหาในช่วงวัน
                });

                if (existingAttendance) {
                    // ถ้ามีการเช็คชื่ออยู่แล้ว ให้อัปเดตสถานะ
                    existingAttendance.status = record.status;
                    await existingAttendance.save();
                    results.push({ success: true, message: 'Updated attendance', record: existingAttendance });
                } else {
                    // ถ้ายังไม่มี ให้อัปเดตหรือสร้างใหม่ (ถ้าอัปเดตไม่ได้)
                    const newAttendance = new Attendance({
                        student: studentObjectId,
                        class: record.class,
                        date: parsedDate, // ใช้ parsedDate ที่แปลงแล้ว
                        status: record.status
                    });
                    await newAttendance.save();
                    results.push({ success: true, message: 'New attendance added', record: newAttendance });
                }
            } catch (error) {
                console.error(`Error processing record for student ${record.studentId} on ${record.date}:`, error);
                results.push({ success: false, message: `Error processing record for student ${record.studentId}: ${error.message}` });
            }
        }
        res.status(200).json({ message: 'ดำเนินการบันทึกการเช็คชื่อเสร็จสิ้น', results });

    } catch (error) {
        console.error('Server error during attendance saving (outer catch):', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ระหว่างการบันทึกการเช็คชื่อ', error: error.message });
    }
});


// @route   GET /api/attendance/report/:class
// @desc    Get attendance report for a specific class within a date range (for monthly/yearly)
// @access  Public
router.route('/report/:class').get(async (req, res) => {
    try {
        const { class: studentClass } = req.params;
        const { startDate, endDate } = req.query;

        let query = { class: studentClass };

        if (startDate && endDate) {
            const start = startOfDay(parseISO(startDate));
            const end = endOfDay(parseISO(endDate));
            query.date = { $gte: start, $lte: end };
        }

        const attendances = await Attendance.find(query).populate('student').sort('date');

        if (!attendances || attendances.length === 0) {
            return res.status(404).json({ message: 'Attendance records not found for the specified class and date range' });
        }
        res.json(attendances);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/attendance/dailyReportAllClasses/:date
// @desc    Get daily attendance report for all classes on a specific date, aggregated by class
// @access  Public
router.route('/dailyReportAllClasses/:date').get(async (req, res) => {
    try {
        const { date } = req.params;
        const targetDate = parseISO(date);
        const start = startOfDay(targetDate);
        const end = endOfDay(targetDate);

        // Fetch all students to get total counts per class
        const allStudents = await Student.find({});

        // Aggregate attendance data for the specified date
        const attendanceData = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $lookup: {
                    from: 'students', // The name of the students collection
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            {
                $unwind: '$studentInfo'
            },
            {
                $group: {
                    _id: { class: '$studentInfo.class', status: '$status', gender: '$studentInfo.gender' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.class',
                    malePresent: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$_id.gender', 'ชาย'] }, { $eq: ['$_id.status', 'มาเรียน'] }] },
                                '$count',
                                0
                            ]
                        }
                    },
                    femalePresent: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$_id.gender', 'หญิง'] }, { $eq: ['$_id.status', 'มาเรียน'] }] },
                                '$count',
                                0
                            ]
                        }
                    },
                    sick: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.status', 'ป่วย'] }, '$count', 0]
                        }
                    },
                    leave: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.status', 'ลา'] }, '$count', 0]
                        }
                    },
                    absent: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.status', 'ขาด'] }, '$count', 0]
                        }
                    },
                }
            },
            {
                $project: {
                    _id: 0,
                    class: '$_id',
                    malePresent: 1,
                    femalePresent: 1,
                    sick: 1,
                    leave: 1,
                    absent: 1,
                }
            }
        ]);

        const classOrder = [
            'อนุบาล 2', 'อนุบาล 3',
            'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
            'ม.1', 'ม.2', 'ม.3'
        ];

        const reportClasses = {};
        let overallTotals = {
            totalMale: 0, totalFemale: 0, totalCombined: 0,
            presentMale: 0, presentFemale: 0, presentCombined: 0,
            sick: 0, leave: 0, absent: 0,
            totalNotPresent: 0,
            attendancePercentage: 0
        };

        // Initialize all classes with zeros
        classOrder.forEach(cls => {
            reportClasses[cls] = {
                totalMale: 0, totalFemale: 0, totalCombined: 0,
                presentMale: 0, presentFemale: 0, presentCombined: 0,
                sick: 0, leave: 0, absent: 0,
                totalNotPresent: 0
            };
        });

        // Populate total student counts
        allStudents.forEach(student => {
            if (reportClasses[student.class]) {
                if (student.gender === 'ชาย') {
                    reportClasses[student.class].totalMale++;
                } else if (student.gender === 'หญิง') {
                    reportClasses[student.class].totalFemale++;
                }
                reportClasses[student.class].totalCombined++;
            }
        });

        // Populate attendance data and calculate totals
        attendanceData.forEach(data => {
            if (reportClasses[data.class]) {
                reportClasses[data.class].presentMale = data.malePresent;
                reportClasses[data.class].presentFemale = data.femalePresent;
                reportClasses[data.class].presentCombined = data.malePresent + data.femalePresent;
                reportClasses[data.class].sick = data.sick;
                reportClasses[data.class].leave = data.leave;
                reportClasses[data.class].absent = data.absent;
                reportClasses[data.class].totalNotPresent = data.sick + data.leave + data.absent;
            }
        });

        // Calculate overall totals
        classOrder.forEach(cls => {
            overallTotals.totalMale += reportClasses[cls].totalMale;
            overallTotals.totalFemale += reportClasses[cls].totalFemale;
            overallTotals.totalCombined += reportClasses[cls].totalCombined;
            overallTotals.presentMale += reportClasses[cls].presentMale;
            overallTotals.presentFemale += reportClasses[cls].presentFemale;
            overallTotals.presentCombined += reportClasses[cls].presentCombined;
            overallTotals.sick += reportClasses[cls].sick;
            overallTotals.leave += reportClasses[cls].leave;
            overallTotals.absent += reportClasses[cls].absent;
            overallTotals.totalNotPresent += reportClasses[cls].totalNotPresent;
        });

        if (overallTotals.totalCombined > 0) {
            overallTotals.attendancePercentage = (overallTotals.presentCombined / overallTotals.totalCombined) * 100;
        } else {
            overallTotals.attendancePercentage = 0;
        }


        res.json({ classes: reportClasses, overallTotals });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;