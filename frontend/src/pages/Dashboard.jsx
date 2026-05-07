import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useOutletContext } from 'react-router-dom'
import { Calendar, Users, Clock, Activity } from 'lucide-react'

export default function Dashboard() {
  const { profile } = useOutletContext() || {}
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    avgAttendance: 0,
    lastSessionDate: null,
  })
  const [studentStats, setStudentStats] = useState({
    attendancePercentage: 0,
    attendedCount: 0,
    totalCount: 0,
    rank: 'TOP 10%',
    recentAttendance: [],
    recentMaterials: []
  })
  const [todaySession, setTodaySession] = useState(null)
  const [todayAttendance, setTodayAttendance] = useState({ absent: 0, rate: 0 })

  useEffect(() => {
    if (profile?.role === 'mentor') {
      fetchMentorData()
    } else if (profile?.role === 'student') {
      fetchStudentData()
    }
  }, [profile])

  const fetchStudentData = async () => {
    setLoading(true)
    try {
      const studentId = profile.student_id

      // 1. Fetch all sessions to date
      const { data: allSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, date, topic')
        .lte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: false })

      // 2. Fetch this student's attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('session_id, present, marked_at')
        .eq('student_id', studentId)

      // 3. Fetch latest materials
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('id, title, type, url, created_at')
        .order('created_at', { ascending: false })
        .limit(3)

      if (sessionsError || attendanceError) throw (sessionsError || attendanceError)

      const attendedCount = attendance.filter(a => a.present).length
      const totalCount = allSessions.length
      const percentage = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0

      // Map attendance to sessions for the log
      const log = allSessions.slice(0, 5).map(session => {
        const record = attendance.find(a => a.session_id === session.id)
        return {
          ...session,
          present: record ? record.present : false
        }
      })

      setStudentStats({
        attendancePercentage: percentage,
        attendedCount,
        totalCount,
        rank: percentage >= 90 ? 'TOP 5%' : percentage >= 80 ? 'TOP 15%' : 'TOP 25%',
        recentAttendance: log,
        recentMaterials: materials || []
      })
    } catch (error) {
      console.error('Error fetching student dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMentorData = async () => {
    setLoading(true)
    try {
      // Fetch students count
      const { count: studentCount, error: studentError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Fetch sessions with attendance data
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id, date, topic, session_type,
          attendance ( present )
        `)
        .order('date', { ascending: false })

      if (studentError || sessionsError) throw (studentError || sessionsError)

      let totalPresents = 0
      let totalRecords = 0

      sessions.forEach(session => {
        const records = session.attendance || []
        totalPresents += records.filter(a => a.present).length
        totalRecords += records.length
      })

      const overallAvg = totalRecords > 0 ? Math.round((totalPresents / totalRecords) * 100) : 0
      const mostRecentSession = sessions[0]
      
      let lastSessionFormatted = 'NONE'
      if (mostRecentSession) {
        lastSessionFormatted = new Date(mostRecentSession.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()
      }

      setStats({
        totalStudents: studentCount || 0,
        totalSessions: sessions?.length || 0,
        avgAttendance: overallAvg,
        lastSessionDate: lastSessionFormatted
      })

      const todayString = new Date().toISOString().split('T')[0]
      const currentSession = sessions.find(s => s.date === todayString)
      
      if (currentSession) {
        setTodaySession(currentSession)
        const presentCount = (currentSession.attendance || []).filter(a => a.present).length
        setTodayAttendance({
          absent: (studentCount || 0) - presentCount,
          rate: studentCount > 0 ? Math.round((presentCount / studentCount) * 100) : 0
        })
      }
    } catch (error) {
      console.error('Error fetching mentor dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[#8A8A94] flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#4b7cc2] border-t-transparent rounded-full animate-spin"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // RENDER STUDENT VIEW
  if (profile?.role === 'student') {
    return (
      <div className="animate-fade-in w-full max-w-[1200px]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-2">
              Hello, {profile.display_name.split(' ')[0]} 👋
            </h1>
            <p className="text-[#8A8A94] text-lg">
              Track your attendance and access course materials.
            </p>
          </div>
          <div className="bg-[#111115] border border-[#222228] rounded-2xl p-4 flex items-center gap-4 min-w-[240px]">
            <div className="w-12 h-12 rounded-full bg-[#1C1C24] flex items-center justify-center text-[#4b7cc2]">
              <Users size={20} />
            </div>
            <div>
              <div className="text-white font-bold tracking-tight">{profile.display_name}</div>
              <div className="text-[10px] font-bold text-[#8A8A94] uppercase tracking-widest">{profile.role}</div>
            </div>
          </div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Attendance Circle */}
          <div className="bg-[#0A0A0E] border border-[#222228] rounded-[24px] p-8 flex flex-col items-center justify-center text-center">
            <div className="text-[11px] font-bold tracking-[0.15em] text-[#8A8A94] uppercase mb-6">ATTENDANCE</div>
            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#1C1C24]" />
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white" 
                  strokeDasharray={440} strokeDashoffset={440 - (440 * studentStats.attendancePercentage) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">{studentStats.attendancePercentage}%</span>
              </div>
            </div>
            <p className="text-[#8A8A94] text-xs font-bold uppercase tracking-widest">Minimum requirement: 75%</p>
          </div>

          {/* Session Count Card */}
          <div className="bg-[#0A0A0E] border border-[#222228] rounded-[24px] p-8 flex flex-col justify-between">
            <div className="flex items-center gap-3 text-[#8A8A94]">
              <Calendar size={20} />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase">SESSIONS</span>
            </div>
            <div className="mt-8">
              <div className="text-6xl font-bold text-white mb-2">{studentStats.attendedCount} <span className="text-3xl text-[#52525B]">/ {studentStats.totalCount}</span></div>
              <p className="text-[#8A8A94] text-xs font-bold uppercase tracking-widest">Total classes attended so far</p>
            </div>
          </div>

          {/* Rank Card */}
          <div className="bg-[#0A0A0E] border border-[#222228] rounded-[24px] p-8 flex flex-col justify-between">
            <div className="flex items-center gap-3 text-[#8A8A94]">
              <Activity size={20} />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase">RANK</span>
            </div>
            <div className="mt-8">
              <div className="text-5xl font-bold text-white mb-2">{studentStats.rank}</div>
              <p className="text-[#8A8A94] text-xs font-bold uppercase tracking-widest">Based on current attendance</p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Attendance Log */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock size={20} className="text-[#8A8A94]" /> Attendance Log
              </h3>
            </div>
            <div className="space-y-3">
              {studentStats.recentAttendance.map((log, idx) => (
                <div key={idx} className="bg-[#0A0A0E] border border-[#222228] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.present ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {log.present ? '✓' : '✕'}
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{log.topic}</div>
                      <div className="text-[#52525B] text-xs font-bold uppercase tracking-wider">{log.date}</div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${log.present ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {log.present ? 'PRESENT' : 'ABSENT'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Materials */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-[#8A8A94]" /> Learning Materials
              </h3>
            </div>
            <div className="space-y-3">
              {studentStats.recentMaterials.map((material, idx) => (
                <a key={idx} href={material.url} target="_blank" rel="noreferrer" 
                   className="bg-[#0A0A0E] border border-[#222228] rounded-2xl p-5 flex items-center gap-5 hover:border-[#4b7cc2]/50 transition-all group">
                  <div className="w-12 h-12 bg-[#111115] rounded-xl flex items-center justify-center text-[#8A8A94] group-hover:text-[#4b7cc2] transition-colors">
                    {material.type === 'link' ? '🔗' : '📄'}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm mb-1">{material.title}</div>
                    <div className="text-[#52525B] text-[10px] font-bold uppercase tracking-widest">{new Date(material.created_at).toLocaleDateString()}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // RENDER MENTOR VIEW
  return (
    <div className="animate-fade-in w-full max-w-[1200px]">
      <div className="mb-10">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">
          Welcome Back, {profile?.display_name || 'Nischay'}
        </h1>
        <p className="text-[#8A8A94] text-sm md:text-base uppercase tracking-[0.2em] font-bold">
          {profile?.role} Overview
        </p>
      </div>

      {/* Metrics Bar */}
      <div className="mb-12">
        <div className="flex flex-wrap items-center gap-6 md:gap-10 text-[11px] font-bold tracking-[0.15em] uppercase text-white mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-white" /> TOTAL SESSIONS <span className="ml-1 text-sm">{stats.totalSessions}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-white" /> OVERALL ATTENDANCE % <span className="ml-1 text-sm">{stats.avgAttendance}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-white" /> ACTIVE STUDENTS <span className="ml-1 text-sm">{stats.totalStudents}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-white" /> LAST SESSION DATE <span className="ml-1 text-sm">{stats.lastSessionDate}</span>
          </div>
        </div>
        
        <div className="h-1.5 w-full bg-[#1C1C24] rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${stats.avgAttendance || 0}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-[#222228] rounded-[24px] p-8 md:p-10 relative overflow-hidden bg-gradient-to-b from-[#0A0A0E] to-[#0D0D12] min-h-[320px] flex flex-col">
          <div className="text-[11px] font-bold tracking-[0.15em] text-[#8A8A94] uppercase mb-8 z-10">
            TODAY'S SESSION
          </div>
          {todaySession ? (
            <>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 z-10 leading-tight">
                {todaySession.topic}
              </h2>
              <p className="text-[#8A8A94] text-base max-w-[280px] z-10 capitalize">
                {todaySession.session_type} Session
              </p>
            </>
          ) : (
            <>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 z-10 leading-tight">
                No Session<br />Scheduled
              </h2>
              <p className="text-[#8A8A94] text-base max-w-[280px] z-10">
                Take a break, or prepare materials for the next class.
              </p>
            </>
          )}
          <Calendar size={240} className="absolute -bottom-16 -right-12 text-white/[0.02] z-0 pointer-events-none" />
        </div>

        <div className="border border-[#222228] rounded-[24px] p-8 md:p-10 relative overflow-hidden bg-gradient-to-b from-[#0A0A0E] to-[#0D0D12] min-h-[320px] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="text-[11px] font-bold tracking-[0.15em] text-[#8A8A94] uppercase">
              TODAY'S ATTENDANCE
            </div>
            {todaySession && (
              <div className={`text-xs font-semibold text-white border border-[#222228] rounded-full px-3 py-1 ${todayAttendance.rate >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#111115]'}`}>
                {todayAttendance.rate}%
              </div>
            )}
          </div>
          
          <div className="text-6xl md:text-7xl font-bold text-white mb-8 tracking-tighter">
            {todaySession ? todayAttendance.absent : 0} <span className="text-3xl md:text-4xl text-[#52525B] font-medium tracking-normal">/ {stats.totalStudents}</span>
          </div>
          
          <div className="text-[11px] font-bold tracking-[0.15em] text-[#8A8A94] uppercase mt-auto">
            ABSENT STUDENTS
          </div>
        </div>
      </div>
    </div>
  )
}
