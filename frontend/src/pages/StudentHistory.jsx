import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, ChevronDown, ChevronUp, User, Activity, ArrowUpDown } from 'lucide-react'

export default function StudentHistory() {
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('name')
      
      if (studentsError) throw studentsError

      // 2. Fetch all sessions (to know total possible sessions)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false })
      
      if (sessionsError) throw sessionsError
      setSessions(sessionsData)

      // 3. Fetch all attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
      
      if (attendanceError) throw attendanceError
      setAttendanceRecords(attendanceData)

      // Process students with stats
      const processed = studentsData.map(student => {
        const studentAttendance = attendanceData.filter(a => a.student_id === student.id)
        const presentCount = studentAttendance.filter(a => a.present).length
        const totalSessions = sessionsData.length
        const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0

        return {
          ...student,
          presentCount,
          totalSessions,
          percentage
        }
      })

      setStudents(processed)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedStudents = [...students]
    .filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.usn.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-glow border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Student History</h1>
          <p className="text-fg-secondary mt-1">Track individual attendance performance across all sessions.</p>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
          <input 
            type="text" 
            placeholder="Search by name or USN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#111115] border border-[#222228] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-glow w-full md:w-80 transition-colors"
          />
        </div>
      </div>

      <div className="bg-[#111115] border border-[#222228] rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0A0A0E] text-fg-secondary text-[10px] font-bold tracking-widest uppercase border-b border-[#222228]">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Student <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4">USN</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('percentage')}>
                  <div className="flex items-center gap-2">Attendance <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-fg-secondary italic">No students found matching your search.</td>
                </tr>
              ) : sortedStudents.map((student) => (
                <>
                  <tr 
                    key={student.id} 
                    className={`hover:bg-white/[0.02] transition-colors ${expandedStudent === student.id ? 'bg-white/[0.03]' : ''}`}
                  >
                    <td className="px-6 py-4 font-medium text-white">{student.name}</td>
                    <td className="px-6 py-4 text-fg-secondary font-mono">{student.usn}</td>
                    <td className="px-6 py-4 text-fg-secondary">{student.branch_code}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-[#0A0A0E] rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${student.percentage >= 80 ? 'bg-emerald-500' : student.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${student.percentage}%` }}
                          />
                        </div>
                        <span className="text-white font-medium">{student.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                        className="text-accent-glow hover:text-white transition-colors flex items-center gap-1 ml-auto"
                      >
                        {expandedStudent === student.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {expandedStudent === student.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedStudent === student.id && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 bg-[#0A0A0E]/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {sessions.map(session => {
                            const att = attendanceRecords.find(a => a.student_id === student.id && a.session_id === session.id)
                            return (
                              <div key={session.id} className="bg-[#111115] border border-[#222228] p-4 rounded-2xl flex items-center justify-between">
                                <div>
                                  <div className="text-[10px] font-bold text-fg-tertiary uppercase">{new Date(session.date).toLocaleDateString()}</div>
                                  <div className="text-xs text-white font-medium truncate max-w-[120px]">{session.topic}</div>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${att?.present ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                  {att?.present ? 'Present' : 'Absent'}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
