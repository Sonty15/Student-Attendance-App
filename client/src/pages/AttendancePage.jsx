// frontend/src/pages/AttendancePage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale'; // สำหรับภาษาไทย

const API_URL = import.meta.env.VITE_API_URL;

function AttendancePage() {
    const [selectedClass, setSelectedClass] = useState('อนุบาล 2');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [students, setStudents] = useState([]);
    const [attendanceStatus, setAttendanceStatus] = useState({}); // { studentId: status }
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const classes = [
        'อนุบาล 2', 'อนุบาล 3',
        'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
        'ม.1', 'ม.2', 'ม.3'
    ];

    useEffect(() => {
        fetchStudentsAndAttendance();
    }, [selectedClass, selectedDate]);

    const fetchStudentsAndAttendance = async () => {
        setLoading(true);
        setMessage('');
        try {
            // ดึงข้อมูลนักเรียนในชั้นเรียนที่เลือก
            const studentsRes = await axios.get(`${API_URL}/students?class=${selectedClass}`);
            setStudents(studentsRes.data);

            // ดึงข้อมูลการเช็คชื่อสำหรับวันที่และชั้นเรียนที่เลือก
            const attendanceRes = await axios.get(`${API_URL}/attendance/daily/${selectedClass}/${selectedDate}`);
            const currentAttendance = {};
            attendanceRes.data.forEach(att => {
                currentAttendance[att.student.studentId] = att.status;
            });
            setAttendanceStatus(currentAttendance);

        } catch (error) {
            console.error("Error fetching data:", error);
            setMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendanceStatus(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleSubmitAttendance = async (studentId) => {
        const status = attendanceStatus[studentId];
        if (!status) {
            setMessage(`กรุณาเลือกสถานะสำหรับนักเรียน ID: ${studentId}`);
            return;
        }

        try {
            await axios.post(`${API_URL}/attendance/add`, {
                studentId,
                date: selectedDate,
                status
            });
            setMessage(`บันทึกการเช็คชื่อนักเรียน ID: ${studentId} สำเร็จ!`);
            // โหลดข้อมูลใหม่เพื่ออัปเดต UI (ถ้าจำเป็น)
            fetchStudentsAndAttendance();
        } catch (error) {
            console.error("Error saving attendance:", error);
            if (error.response && error.response.status === 409) {
                setMessage(`นักเรียน ID: ${studentId} ถูกเช็คชื่อไปแล้วสำหรับวันที่ ${selectedDate}`);
            } else {
                setMessage(`เกิดข้อผิดพลาดในการบันทึกการเช็คชื่อนักเรียน ID: ${studentId}`);
            }
        }
    };

    const displayDate = format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy', { locale: th });

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4 text-center">เช็คชื่อนักเรียน</h2>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/2">
                    <label htmlFor="class-select" className="block text-gray-700 text-sm font-bold mb-2">เลือกชั้นเรียน:</label>
                    <select
                        id="class-select"
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        {classes.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full md:w-1/2">
                    <label htmlFor="date-select" className="block text-gray-700 text-sm font-bold mb-2">เลือกวันที่:</label>
                    <input
                        type="date"
                        id="date-select"
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            </div>

            <p className="text-lg font-semibold mb-4 text-center">
                ชั้นเรียน: {selectedClass} วันที่: {displayDate}
            </p>

            {message && (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Info!</strong>
                    <span className="block sm:inline ml-2">{message}</span>
                </div>
            )}

            {loading ? (
                <p className="text-center text-gray-500">กำลังโหลดข้อมูล...</p>
            ) : (
                <div className="space-y-4">
                    {students.length > 0 ? (
                        students.map(student => (
                            <div key={student._id} className="bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center">
                                <div className="mb-2 sm:mb-0 sm:w-1/2">
                                    <p className="text-lg font-medium">{student.firstName} {student.lastName} ({student.studentId})</p>
                                    <p className="text-sm text-gray-500">ชั้น: {student.class}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 sm:w-1/2 justify-end">
                                    {['มา', 'ป่วย', 'ลา', 'ขาด'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(student.studentId, status)}
                                            className={`py-2 px-4 rounded-md text-sm font-semibold
                                                ${attendanceStatus[student.studentId] === status
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handleSubmitAttendance(student.studentId)}
                                        className="py-2 px-4 rounded-md text-sm font-semibold bg-green-500 text-white hover:bg-green-600 ml-2"
                                    >
                                        บันทึก
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500">ไม่พบข้อมูลนักเรียนในชั้นเรียนนี้</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default AttendancePage;