// client/src/pages/ReportPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format, parseISO, startOfMonth, endOfMonth, getYear, getMonth } from 'date-fns';
import { th } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL;

function ReportPage() {
    // ลบ selectedClass ออกจาก state เริ่มต้น เพราะรายงานรายวันจะไม่ใช้
    const [reportType, setReportType] = useState('daily'); // 'daily', 'monthly'
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd')); // สำหรับรายงานรายวัน
    const [selectedClassForMonthly, setSelectedClassForMonthly] = useState('อนุบาล 2'); // เพิ่ม state ใหม่สำหรับรายงานรายเดือน
    const [selectedMonth, setSelectedMonth] = useState(getMonth(new Date())); // เดือนปัจจุบัน (0-11)
    const [selectedYear, setSelectedYear] = useState(getYear(new Date()));     // ปีปัจจุบัน
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const classes = [
        'อนุบาล 2', 'อนุบาล 3',
        'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
        'ม.1', 'ม.2', 'ม.3'
    ];

    const months = [
        { value: 0, name: 'มกราคม' }, { value: 1, name: 'กุมภาพันธ์' },
        { value: 2, name: 'มีนาคม' }, { value: 3, name: 'เมษายน' },
        { value: 4, name: 'พฤษภาคม' }, { value: 5, name: 'มิถุนายน' },
        { value: 6, name: 'กรกฎาคม' }, { value: 7, name: 'สิงหาคม' },
        { value: 8, name: 'กันยายน' }, { value: 9, name: 'ตุลาคม' },
        { value: 10, name: 'พฤศจิกายน' }, { value: 11, name: 'ธันวาคม' }
    ];

    const years = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - 2 + i); // 2 ปีที่แล้ว, ปีปัจจุบัน, 2 ปีข้างหน้า


    const generateDailyReport = async () => {
        setLoading(true);
        setMessage('');
        try {
            // เรียก API ใหม่ที่ดึงข้อมูลรวมทุกชั้นสำหรับรายงานรายวัน
            const response = await axios.get(`${API_URL}/attendance/dailyReportAllClasses/${selectedDate}`);
            const reportData = response.data; // Backend จะส่งข้อมูลที่จัดรูปแบบมาให้แล้ว

            if (!reportData || Object.keys(reportData).length === 0) {
                setMessage(`ไม่พบข้อมูลการเช็คชื่อสำหรับทุกชั้นเรียน วันที่ ${format(parseISO(selectedDate), 'dd MMMMyyyy', { locale: th })}`);
                setLoading(false);
                return;
            }

            const data = [
                ["สถิติการมาเรียนของนักเรียน โรงเรียนบ้านบึงบอน รายวัน"], // Title
                [`ประจำวัน ศุกร์ ที่ ${format(parseISO(selectedDate), 'dd', { locale: th })} เดือน ${format(parseISO(selectedDate), 'MMMM', { locale: th })} พ.ศ. ${format(parseISO(selectedDate), 'yyyy', { locale: th }).slice(-4)}`], // Adjusted date format
                [], // เว้นบรรทัด
                ["ชั้น", "จำนวนเต็ม", "", "", "มาเรียน", "", "", "สาเหตุที่ไม่มาเรียน", "", "", "รวม", "หมายเหตุ"],
                ["", "ชาย", "หญิง", "รวม", "ชาย", "หญิง", "รวม", "ป่วย", "ลา", "ขาด", "", ""], // Sub-header
            ];

            const mergeCells = [
                { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } }, // จำนวนเต็ม
                { s: { r: 3, c: 4 }, e: { r: 3, c: 6 } }, // มาเรียน
                { s: { r: 3, c: 7 }, e: { r: 3, c: 9 } }, // สาเหตุที่ไม่มาเรียน
                { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // ชั้น
                { s: { r: 3, c: 10 }, e: { r: 4, c: 10 } }, // รวม
                { s: { r: 3, c: 11 }, e: { r: 4, c: 11 } }, // หมายเหตุ
                { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // Title
                { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }, // Date
            ];


            // Add class data
            classes.forEach(cls => {
                const classData = reportData.classes[cls] || {
                    totalMale: 0, totalFemale: 0, totalCombined: 0,
                    presentMale: 0, presentFemale: 0, presentCombined: 0,
                    sick: 0, leave: 0, absent: 0,
                    totalNotPresent: 0
                };
                data.push([
                    cls,
                    classData.totalMale,
                    classData.totalFemale,
                    classData.totalCombined,
                    classData.presentMale,
                    classData.presentFemale,
                    classData.presentCombined,
                    classData.sick,
                    classData.leave,
                    classData.absent,
                    classData.totalNotPresent,
                    '' // หมายเหตุ
                ]);
            });

            // Add total row
            data.push([
                "รวมทั้งสิ้น",
                reportData.overallTotals.totalMale,
                reportData.overallTotals.totalFemale,
                reportData.overallTotals.totalCombined,
                reportData.overallTotals.presentMale,
                reportData.overallTotals.presentFemale,
                reportData.overallTotals.presentCombined,
                reportData.overallTotals.sick,
                reportData.overallTotals.leave,
                reportData.overallTotals.absent,
                reportData.overallTotals.totalNotPresent,
                ''
            ]);

            // Add percentage row
            data.push([
                '', '', '', '', '', '',
                `มาเรียนคิดเป็นร้อยละ ${reportData.overallTotals.attendancePercentage.toFixed(2)}%`,
                '', '', '', '', ''
            ]);
            
            // Merge cells for percentage row (adjust row index based on the total rows before it)
            mergeCells.push({ s: { r: data.length - 1, c: 6 }, e: { r: data.length - 1, c: 11 } }); // "มาเรียนคิดเป็นร้อยละ"

            const ws = XLSX.utils.aoa_to_sheet(data);

            // Apply merges
            ws['!merges'] = mergeCells;

            // Set column widths (optional, for better formatting)
            ws['!cols'] = [
                { wch: 10 }, // ชั้น
                { wch: 8 },  // ชาย
                { wch: 8 },  // หญิง
                { wch: 8 },  // รวม
                { wch: 8 },  // ชาย
                { wch: 8 },  // หญิง
                { wch: 8 },  // รวม
                { wch: 8 },  // ป่วย
                { wch: 8 },  // ลา
                { wch: 8 },  // ขาด
                { wch: 8 },  // รวม
                { wch: 15 }  // หมายเหตุ
            ];


            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "รายงานรายวัน");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `สถิติการมาเรียนของนักเรียน_โรงเรียนบ้านบึงบอน_รายวัน_${selectedDate}.xlsx`);
            setMessage("สร้างรายงานรายวันสำเร็จ!");

        } catch (error) {
            console.error("Error generating daily report:", error);
            setMessage("เกิดข้อผิดพลาดในการสร้างรายงานรายวัน");
        } finally {
            setLoading(false);
        }
    };

    const generateMonthlyReport = async () => {
        setLoading(true);
        setMessage('');

        try {
            const startOfMonthDate = format(startOfMonth(new Date(selectedYear, selectedMonth, 1)), 'yyyy-MM-dd');
            const endOfMonthDate = format(endOfMonth(new Date(selectedYear, selectedMonth, 1)), 'yyyy-MM-dd');

            const response = await axios.get(`${API_URL}/attendance/report/${selectedClassForMonthly}?startDate=${startOfMonthDate}&endDate=${endOfMonthDate}`); // ใช้ selectedClassForMonthly
            const attendances = response.data;

            if (attendances.length === 0) {
                setMessage(`ไม่พบข้อมูลการเช็คชื่อสำหรับชั้น ${selectedClassForMonthly} ในเดือน ${months[selectedMonth].name} ${selectedYear + 543}`);
                setLoading(false);
                return;
            }

            const studentMap = new Map();
            const uniqueDates = new Set();

            attendances.forEach(att => {
                const studentId = att.student.studentId;
                const date = format(parseISO(att.date), 'yyyy-MM-dd');
                uniqueDates.add(date);

                if (!studentMap.has(studentId)) {
                    studentMap.set(studentId, {
                        firstName: att.student.firstName,
                        lastName: att.student.lastName,
                        attendanceData: new Map(),
                        // เพิ่มตัวนับสำหรับแต่ละสถานะ
                        totalPresent: 0,
                        totalSick: 0,
                        totalLeave: 0,
                        totalAbsent: 0
                    });
                }
                const studentInfo = studentMap.get(studentId);
                studentInfo.attendanceData.set(date, att.status);

                // นับสถานะ
                if (att.status === 'มา') {
                    studentInfo.totalPresent++;
                } else if (att.status === 'ป่วย') {
                    studentInfo.totalSick++;
                } else if (att.status === 'ลา') {
                    studentInfo.totalLeave++;
                } else if (att.status === 'ขาด') {
                    studentInfo.totalAbsent++;
                }
            });

            const sortedDates = Array.from(uniqueDates).sort();

            // ปรับ header และ supheader ให้มีคอลัมน์สำหรับผลรวม
            const header = ["เลขที่", "ชื่อ", "นามสกุล", ...sortedDates.map(d => format(parseISO(d), 'EE', { locale: th })), "รวม", "", "", ""]; // Header รวมจะถูก merge
            const supheader = ["", "", "", ...sortedDates.map(d => format(parseISO(d), 'dd')), "มา", "ป่วย", "ลา", "ขาด"]; // Supheader สำหรับ มา ป่วย ลา ขาด

            const data = [
                ["สถิติการมาเรียนของนักเรียน โรงเรียนบ้านบึงบอน รายเดือน"],
                [`ชั้น ${selectedClassForMonthly}`],
                [`ปี ${selectedYear + 543}`, `เดือน ${months[selectedMonth].name}`],
                header,
                supheader
            ];

            studentMap.forEach((studentInfo, studentId) => {
                const row = [studentId, studentInfo.firstName, studentInfo.lastName];
                let rowTotalCheckedDays = 0; // นับรวมวันที่เช็คชื่อทั้งหมด (มา ป่วย ลา ขาด)
                sortedDates.forEach(date => {
                    const status = studentInfo.attendanceData.get(date) || '-';
                    row.push(status);
                    if (status !== '-') { // นับเฉพาะวันที่เช็คชื่อแล้ว
                        rowTotalCheckedDays++;
                    }
                });

                // เพิ่มผลรวมที่ท้ายแถว (totalCheckedDays, totalPresent, totalSick, totalLeave, totalAbsent)
                row.push(studentInfo.totalPresent); // ใช้ totalPresent
                row.push(studentInfo.totalSick);    // ใช้ totalSick
                row.push(studentInfo.totalLeave);   // ใช้ totalLeave
                row.push(studentInfo.totalAbsent);  // ใช้ totalAbsent
                
                data.push(row);
            });

            // กำหนด mergeCells ใหม่
            const mergeCells = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: supheader.length - 1 } }, // Title
                { s: { r: 1, c: 0 }, e: { r: 1, c: supheader.length - 1 } }, // Class
                { s: { r: 2, c: 0 }, e: { r: 2, c: supheader.length - 1 } }, // Year and Month
                { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // เลขที่ (merge row 3 and 4)
                { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, // ชื่อ (merge row 3 and 4)
                { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } }, // นามสกุล (merge row 3 and 4)
                // Merge "รวม" header
                { s: { r: 3, c: sortedDates.length + 3 }, e: { r: 3, c: sortedDates.length + 6 } } // "รวม" header. (+3 for เลขที่,ชื่อ,นามสกุล)
            ];

            const ws = XLSX.utils.aoa_to_sheet(data);
            // Apply merges
            ws['!merges'] = mergeCells;

            // Set column widths (optional, for better formatting)
            ws['!cols'] = [
                { wch: 10 }, // เลขที่
                { wch: 15 }, // ชื่อ
                { wch: 15 }, // นามสกุล
                ...sortedDates.map(() => ({ wch: 5 })), // วันที่ (dd)
                { wch: 8 },  // มา
                { wch: 8 },  // ป่วย
                { wch: 8 },  // ลา
                { wch: 8 }   // ขาด
            ];

            // ตั้งค่าจัดกลางให้ cell header และ border
            const headerStyle = {
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                }
            };

            // ตั้งค่า cell style สำหรับ Header (แถวที่ 4 และ 5)
            // แถวที่ 4: เลขที่, ชื่อ, นามสกุล, ... (merged), รวม
            for (let c = 0; c < 3; c++) { // สำหรับ เลขที่, ชื่อ, นามสกุล
                const cellRef = XLSX.utils.encode_cell({ r: 3, c: c });
                if (!ws[cellRef]) ws[cellRef] = {};
                Object.assign(ws[cellRef], { s: headerStyle });
            }
            // สำหรับหัวข้อรวม
            const totalHeaderColStart = sortedDates.length + 3; // คอลัมน์ที่ "รวม" เริ่มต้น (หลังจาก เลขที่, ชื่อ, นามสกุล และ วันที่)
            const totalHeaderCellRef = XLSX.utils.encode_cell({ r: 3, c: totalHeaderColStart });
            if (!ws[totalHeaderCellRef]) ws[totalHeaderCellRef] = {};
            Object.assign(ws[totalHeaderCellRef], { s: headerStyle, v: 'รวม' }); // กำหนดค่าเซลล์เป็น 'รวม'


            // แถวที่ 5: วันที่, มา, ป่วย, ลา, ขาด
            for (let c = 0; c < supheader.length; c++) {
                const cellRef = XLSX.utils.encode_cell({ r: 4, c: c });
                if (!ws[cellRef]) ws[cellRef] = {};
                Object.assign(ws[cellRef], { s: headerStyle });
            }

            // ตั้งค่า cell style สำหรับข้อมูล
            const dataStyle = {
                alignment: { horizontal: 'center' },
                border: {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                }
            };

            // เริ่มจากแถวที่มีข้อมูลนักเรียน (แถวที่ 6)
            for (let r = 5; r < data.length; r++) {
                for (let c = 0; c < data[r].length; c++) {
                    const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
                    if (!ws[cellRef]) ws[cellRef] = {};
                    Object.assign(ws[cellRef], { s: dataStyle });
                }
            }

            // จัดกลางหัวข้อหลัก
            const titleStyle = {
                font: { bold: true, size: 16 },
                alignment: { horizontal: 'center', vertical: 'middle' }
            };
            const classStyle = {
                font: { bold: true, size: 14 },
                alignment: { horizontal: 'center', vertical: 'middle' }
            };
            const yearMonthStyle = {
                font: { bold: true, size: 12 },
                alignment: { horizontal: 'center', vertical: 'middle' }
            };
            if (ws['A1']) ws['A1'].s = titleStyle;
            if (ws['A2']) ws['A2'].s = classStyle;
            if (ws['A3']) ws['A3'].s = yearMonthStyle;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "รายงานรายเดือน");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `รายงานเช็คชื่อรายเดือน_${selectedClassForMonthly}_${months[selectedMonth].name}_${selectedYear}.xlsx`);
            setMessage("สร้างรายงานรายเดือนสำเร็จ!");

        } catch (error) {
            console.error("Error generating monthly report:", error);
            setMessage("เกิดข้อผิดพลาดในการสร้างรายงานรายเดือน");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4 text-center text-gray-700">รายงานการเช็คชื่อ</h2>

                        <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">ประเภทรายงาน:</label>
                <div className="flex gap-4 flex-wrap">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio"
                            name="reportType"
                            value="daily"
                            checked={reportType === 'daily'}
                            onChange={() => setReportType('daily')}
                        />
                        <span className="ml-2 text-gray-700">รายงานรายวัน (รวมทุกชั้น)</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio"
                            name="reportType"
                            value="monthly"
                            checked={reportType === 'monthly'}
                            onChange={() => setReportType('monthly')}
                        />
                        <span className="ml-2 text-gray-700">รายงานรายเดือน (ตามชั้น)</span>
                    </label>
                </div>
            </div>

            {/* ส่วนเลือกชั้นเรียนสำหรับรายงานรายวันจะถูกซ่อน */}
            {reportType === 'monthly' && (
                <div className="mb-6">
                    <label htmlFor="class-select" className="block text-gray-700 text-sm font-bold mb-2">เลือกชั้นเรียน:</label>
                    <select
                        id="class-select"
                        className="shadow border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                        value={selectedClassForMonthly}
                        onChange={(e) => setSelectedClassForMonthly(e.target.value)}
                    >
                        {classes.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>
            )}

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

            {reportType === 'monthly' && (
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="w-full md:w-1/2">
                        <label htmlFor="month-select" className="block text-gray-700 text-sm font-bold mb-2">เลือกเดือน:</label>
                        <select
                            id="month-select"
                            className="shadow border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {months.map(month => (
                                <option key={month.value} value={month.value}>{month.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-1/2">
                        <label htmlFor="year-select" className="block text-gray-700 text-sm font-bold mb-2">เลือกปี:</label>
                        <select
                            id="year-select"
                            className="shadow border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year + 543}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <button
                onClick={
                    reportType === 'daily'
                        ? generateDailyReport
                        : generateMonthlyReport
                }
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