// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AttendancePage from './pages/AttendancePage';
import ReportPage from './pages/ReportPage';
import AddStudentPage from './pages/AddStudentPage'; // สำหรับเพิ่มนักเรียน (Admin)

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-blue-600 p-4 text-black shadow-md">
          <ul className="flex justify-around">
            <li>
              <Link to="/attendance" className="hover:underline text-lg text-white">เช็คชื่อ</Link>
            </li>
            <li>
              <Link to="/report" className="hover:underline text-lg text-white">รายงาน</Link>
            </li>
            <li>
              <Link to="/add-student" className="hover:underline text-lg text-white">เพิ่มนักเรียน</Link>
            </li>
          </ul>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/add-student" element={<AddStudentPage />} />
            <Route path="/" element={<h1 className="text-2xl font-bold text-center text-gray-700">ยินดีต้อนรับสู่ระบบเช็คชื่อนักเรียน</h1>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;