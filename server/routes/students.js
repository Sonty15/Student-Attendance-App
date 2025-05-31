// backend/routes/students.js
const router = require('express').Router();
let Student = require('../models/Student');

// ดึงข้อมูลนักเรียนทั้งหมด หรือกรองตาม class
router.route('/').get(async (req, res) => {
    try {
        const { class: studentClass } = req.query; // ดึง class จาก query string
        let students;
        if (studentClass) {
            students = await Student.find({ class: studentClass });
        } else {
            students = await Student.find();
        }
        res.json(students);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// เพิ่มนักเรียนใหม่
router.route('/add').post(async (req, res) => {
    try {
        const { studentId, firstName, lastName, studentClass, level } = req.body;

        const newStudent = new Student({
            studentId,
            firstName,
            lastName,
            class: studentClass,
            level
        });

        await newStudent.save();
        res.json('Student added!');
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// ดึงข้อมูลนักเรียนตาม ID
router.route('/:id').get(async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        res.json(student);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// อัปเดตข้อมูลนักเรียน
router.route('/update/:id').post(async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json('Student not found');
        }

        student.studentId = req.body.studentId;
        student.firstName = req.body.firstName;
        student.lastName = req.body.lastName;
        student.class = req.body.studentClass; // ใช้ studentClass แทน class เพื่อไม่ให้ชนกับ keyword
        student.level = req.body.level;

        await student.save();
        res.json('Student updated!');
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// ลบนักเรียน
router.route('/:id').delete(async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json('Student deleted.');
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

module.exports = router;