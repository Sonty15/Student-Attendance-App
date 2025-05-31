// backend/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    class: { type: String, required: true }, // เช่น "อนุบาล 2", "ป.1", "ม.3"
    level: { type: String, required: true } // เช่น "อนุบาล", "ประถม", "มัธยม"
}, {
    timestamps: true // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
});

const Student = mongoose.model('student', studentSchema);

module.exports = Student;