import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, User, Grid } from 'lucide-react'

export default function StudentHistory() {
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState(null)

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

      // 2. Fetch all sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: true }) // Ascending for heatmap timeline
      
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
      if (processed.length > 0) {
        setSelectedStudentId(processed[0].id)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-glow border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white">Student History</h1>
        <p className="text-fg-secondary mt-1">Track individual attendance performance across all sessions.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-[#111115] border border-[#222228] rounded-[24px] p-4 flex flex-col">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
            <input 
              type="text" 
              placeholder="Search USN or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0A0A0E] border border-[#222228] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-glow w-full transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-4 pr-1">
            {filteredStudents.length === 0 ? (
              <div className="text-center text-fg-secondary text-sm py-4">No students found.</div>
            ) : filteredStudents.map((student) => (
              <div 
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`p-4 rounded-xl cursor-pointer transition-colors ${selectedStudentId === student.id ? 'bg-[#1C1C24] border border-[#3b2d63]' : 'bg-[#0A0A0E] border border-[#222228] hover:border-[#3b2d63]'}`}
              >
                <div className="font-medium text-white truncate">{student.name}</div>
                <div className="text-xs text-fg-secondary font-mono truncate">{student.usn}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-[#111115] border border-[#222228] rounded-[24px] p-6 overflow-y-auto flex flex-col">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-[#0A0A0E] border border-[#222228] rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-16 h-16 rounded-full bg-[#1C1C24] flex items-center justify-center text-white shrink-0">
                  <User size={32} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-white">{selectedStudent.name}</h2>
                  <p className="text-fg-secondary font-mono">{selectedStudent.usn} • {selectedStudent.branch_code || 'CS'}</p>
                  
                  <div className="flex gap-4 mt-4 justify-center sm:justify-start">
                    <div className="bg-[#1C1C24] border border-[#222228] rounded-xl p-4 flex-1 max-w-[150px]">
                      <div className="text-xs text-fg-tertiary uppercase font-bold tracking-wider">Attendance</div>
                      <div className="text-2xl font-bold text-white mt-1">{selectedStudent.percentage}%</div>
                    </div>
                    <div className="bg-[#1C1C24] border border-[#222228] rounded-xl p-4 flex-1 max-w-[150px]">
                      <div className="text-xs text-fg-tertiary uppercase font-bold tracking-wider">Present</div>
                      <div className="text-2xl font-bold text-white mt-1">{selectedStudent.presentCount} / {selectedStudent.totalSessions}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Heatmap Section */}
              <div className="bg-[#0A0A0E] border border-[#222228] rounded-2xl p-6 flex-1">
                <h3 className="text-sm font-bold text-white mb-6">Attendance Heatmap</h3>
                
                {sessions.length === 0 ? (
                  <div className="text-center text-fg-secondary py-8">No sessions found.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sessions.map(session => {
                      const att = attendanceRecords.find(a => a.student_id === selectedStudent.id && a.session_id === session.id);
                      const isPresent = att?.present;
                      
                      return (
                        <div 
                          key={session.id}
                          className={`w-6 h-6 rounded-md border transition-all cursor-pointer ${isPresent ? 'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/40' : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/30'}`}
                          title={`${new Date(session.date).toLocaleDateString()}: ${session.topic} (${isPresent ? 'Present' : 'Absent'})`}
                        />
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-6 text-xs text-fg-tertiary">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/40 rounded-sm"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-500/10 border border-red-500/20 rounded-sm"></div>
                    <span>Absent</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-fg-secondary">
              Select a student to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
