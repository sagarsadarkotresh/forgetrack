import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RoleGuard from './components/RoleGuard'

// Pages
import Login from './pages/Login'
import Forbidden from './pages/Forbidden'
import Dashboard from './pages/Dashboard'
import MarkAttendance from './pages/MarkAttendance'
import StudentHistory from './pages/StudentHistory'
import Materials from './pages/Materials'
import UploadCSV from './pages/UploadCSV'
import MyAttendance from './pages/MyAttendance'
import UpcomingSessions from './pages/UpcomingSessions'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/403" element={<Forbidden />} />

        {/* Protected Routes (RoleGuard handles the Shell layout internally) */}
        <Route element={<RoleGuard />}>
          {/* Root redirect is handled inside RoleGuard based on role */}
          <Route path="/" element={<div>Redirecting...</div>} />
          
          {/* Mentor Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<MarkAttendance />} />
          <Route path="/history" element={<StudentHistory />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/upload" element={<UploadCSV />} />

          {/* Student Routes */}
          <Route path="/me/attendance" element={<MyAttendance />} />
          <Route path="/me/upcoming" element={<UpcomingSessions />} />
          <Route path="/me/materials" element={<Materials />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
