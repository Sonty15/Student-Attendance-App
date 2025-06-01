// frontend/src/pages/AddStudentPage.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

function AddStudentPage() {
    const [studentId, setStudentId] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [studentClass, setStudentClass] = useState('อนุบาล 2');
    const [level, setLevel] = useState('อนุบาล');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const classes = {
        'อนุบาล': ['อนุบาล 2', 'อนุบาล 3'],
        'ประถม': ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'],
        'มัธยม': ['ม.1', 'ม.2', 'ม.3']
    };

    const handleLevelChange = (e) => {
        const newLevel = e.target.value;
        setLevel(newLevel);
        // ตั้งค่า class เป็นค่าแรกของ level นั้นๆ
        setStudentClass(classes[newLevel][0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            await axios.post(`${API_URL}/students/add`, {
                studentId,
                firstName,
                lastName,
                studentClass, // ใช้ชื่อตัวแปรที่ตรงกับ Backend
                level
            });
            setMessage('เพิ่มนักเรียนสำเร็จ!');
            // Clear form
            setStudentId('');
            setFirstName('');
            setLastName('');
            setStudentClass('อนุบาล 2');
            setLevel('อนุบาล');
        } catch (error) {
            console.error("Error adding student:", error);
            if (error.response && error.response.status === 400) {
                setMessage(`เกิดข้อผิดพลาด: ${error.response.data}`);
            } else {
                setMessage('เกิดข้อผิดพลาดในการเพิ่มนักเรียน');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto bg-white shadow-md rounded-lg">
            <h2 className="text-2xl font-bold mb-4 text-center text-gray-700">เพิ่มนักเรียนใหม่</h2>
            {message && (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Info!</strong>
                    <span className="block sm:inline ml-2">{message}</span>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="studentId" className="block text-gray-700 text-sm font-bold mb-2">รหัสนักเรียน:</label>
                    <input
                        type="text"
                        id="studentId"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="firstName" className="block text-gray-700 text-sm font-bold mb-2">ชื่อ:</label>
                    <input
                        type="text"
                        id="firstName"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="lastName" className="block text-gray-700 text-sm font-bold mb-2">นามสกุล:</label>
                    <input
                        type="text"
                        id="lastName"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="level" className="block text-gray-700 text-sm font-bold mb-2">ระดับ:</label>
                    <select
                        id="level"
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={level}
                        onChange={handleLevelChange}
                        required
                    >
                        {Object.keys(classes).map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                    </select>
                </div>
                <div className="mb-6">
                    <label htmlFor="studentClass" className="block text-gray-700 text-sm font-bold mb-2">ชั้นเรียน:</label>
                    <select
                        id="studentClass"
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        required
                    >
                        {classes[level].map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center justify-center">
                    <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        disabled={loading}
                    >
                        {loading ? 'กำลังเพิ่ม...' : 'เพิ่มนักเรียน'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AddStudentPage;