// frontend/src/pages/ReportPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx'; // สำหรับ Excel
import { saveAs } from 'file-saver'; // สำหรับบันทึกไฟล์
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL;

function ReportPage() {
    const [selectedClass, setSelectedClass] = useState('อนุบาล 2');
    const [reportType, setReportType] = useState('daily'); // 'daily' or 'yearly'
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')); // ต้นปี
    const [endDate, setEndDate] = useState(format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd')); // สิ้นปี
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const classes = [
        'อนุบาล 2', 'อนุบาล 3',
        'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
        'ม.1', 'ม.2', 'ม.3'
    ];

    const generateDailyReport = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await axios.get(`${API_URL}/attendance/daily/${selectedClass}/${selectedDate}`);
            const attendances = response.data;

            if (attendances.length === 0) {
                setMessage(`ไม่พบข้อมูลการเช็คชื่อสำหรับชั้น ${selectedClass} วันที่ ${format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: th })}`);
                setLoading(false);
                return;
            }

            const data = [
                ["รายงานการเช็คชื่อรายวัน", `ชั้น: ${selectedClass}`, `วันที่: ${format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: th })}`],
                [], // เว้นบรรทัด
                ["รหัสนักเรียน", "ชื่อ", "นามสกุล", "สถานะ"]
            ];

            attendances.forEach(att => {
                data.push([
                    att.student.studentId,
                    att.student.firstName,
                    att.student.lastName,
                    att.status
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "รายงานรายวัน");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `รายงานเช็คชื่อรายวัน_${selectedClass}_${selectedDate}.xlsx`);
            setMessage("สร้างรายงานรายวันสำเร็จ!");

        } catch (error) {
            console.error("Error generating daily report:", error);
            setMessage("เกิดข้อผิดพลาดในการสร้างรายงานรายวัน");
        } finally {
            setLoading(false);
        }
    };

    const generateYearlyReport = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await axios.get(`${API_URL}/attendance/report/${selectedClass}?startDate=${startDate}&endDate=${endDate}`);
            const attendances = response.data;

            if (attendances.length === 0) {
                setMessage(`ไม่พบข้อมูลการเช็คชื่อสำหรับชั้น ${selectedClass} ในช่วงวันที่ ${format(parseISO(startDate), 'dd MMM yy')} - ${format(parseISO(endDate), 'dd MMM yy')}`);
                setLoading(false);
                return;
            }

            // รวบรวมข้อมูลนักเรียนที่ไม่ซ้ำกันและวันที่เช็คชื่อ
            const studentMap = new Map(); // Map<studentId, {firstName, lastName, attendanceData: Map<date, status>}>
            const uniqueDates = new Set();

            attendances.forEach(att => {
                const studentId = att.student.studentId;
                const date = format(parseISO(att.date), 'yyyy-MM-dd', { locale: th }); // Format date to YYYY-MM-DD for consistency
                uniqueDates.add(date);

                if (!studentMap.has(studentId)) {
                    studentMap.set(studentId, {
                        firstName: att.student.firstName,
                        lastName: att.student.lastName,
                        attendanceData: new Map()
                    });
                }
                studentMap.get(studentId).attendanceData.set(date, att.status);
            });

            const sortedDates = Array.from(uniqueDates).sort();

            const header = ["รหัสนักเรียน", "ชื่อ", "นามสกุล", ...sortedDates.map(d => format(parseISO(d), 'dd/MM/yyyy'))];
            const data = [
                ["รายงานการเช็คชื่อ 1 ปีการศึกษา", `ชั้น: ${selectedClass}`, `ช่วงวันที่: ${format(parseISO(startDate), 'dd MMMM yyyy', { locale: th })} - ${format(parseISO(endDate), 'dd MMMM yyyy', { locale: th })}`],
                [], // เว้นบรรทัด
                header
            ];

            studentMap.forEach((studentInfo, studentId) => {
                const row = [studentId, studentInfo.firstName, studentInfo.lastName];
                sortedDates.forEach(date => {
                    row.push(studentInfo.attendanceData.get(date) || 'ไม่เช็ค'); // ถ้าไม่มีข้อมูล ให้เป็น 'ไม่เช็ค'
                });
                data.push(row);
            });

            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "รายงานทั้งปี");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `รายงานเช็คชื่อทั้งปี_${selectedClass}_${format(parseISO(startDate), 'yyyy')}-${format(parseISO(endDate), 'yyyy')}.xlsx`);
            setMessage("สร้างรายงาน 1 ปีการศึกษาสำเร็จ!");

        } catch (error) {
            console.error("Error generating yearly report:", error);
            setMessage("เกิดข้อผิดพลาดในการสร้างรายงาน 1 ปีการศึกษา");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4 text-center text-gray-700">รายงานการเช็คชื่อ</h2>

            <div className="mb-6">
                <label htmlFor="class-select" className="block text-gray-700 text-sm font-bold mb-2">เลือกชั้นเรียน:</label>
                <select
                    id="class-select"
                    className="shadow border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                >
                    {classes.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>
            </div>

            <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">ประเภทรายงาน:</label>
                <div className="flex gap-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio"
                            name="reportType"
                            value="daily"
                            checked={reportType === 'daily'}
                            onChange={() => setReportType('daily')}
                        />
                        <span className="ml-2 text-gray-700">รายงานรายวัน</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio"
                            name="reportType"
                            value="yearly"
                            checked={reportType === 'yearly'}
                            onChange={() => setReportType('yearly')}
                        />
                        <span className="ml-2 text-gray-700">รายงานทั้งหมด 1 ปีการศึกษา</span>
                    </label>
                </div>
            </div>

            {reportType === 'daily' && (
                <div className="mb-6">
                    <label htmlFor="daily-date" className="block text-gray-700 text-sm font-bold mb-2">เลือกวันที่:</label>
                    <input
                        type="date"
                        id="daily-date"
                        className="shadow border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            )}

            {reportType === 'yearly' && (
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="w-full md:w-1/2">
                        <label htmlFor="start-date" className="block text-gray-700 text-sm font-bold mb-2">วันที่เริ่มต้น:</label>
                        <input
                            type="date"
                            id="start-date"
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-1/2">
                        <label htmlFor="end-date" className="block text-gray-700 text-sm font-bold mb-2">วันที่สิ้นสุด:</label>
                        <input
                            type="date"
                            id="end-date"
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <button
                onClick={reportType === 'daily' ? generateDailyReport : generateYearlyReport}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full md:w-auto"
                disabled={loading}
            >
                {loading ? 'กำลังสร้างรายงาน...' : 'Export รายงาน Excel'}
            </button>

            {message && (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mt-4" role="alert">
                    <strong className="font-bold">Info!</strong>
                    <span className="block sm:inline ml-2">{message}</span>
                </div>
            )}
        </div>
    );
}

export default ReportPage;