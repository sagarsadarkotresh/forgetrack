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
  const [todaySession, setTodaySession] = useState(null)
  const [todayAttendance, setTodayAttendance] = useState({ absent: 0, rate: 0 })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
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
          id,
          date,
          topic,
          session_type,
          attendance ( present )
        `)
        .order('date', { ascending: false })

      if (studentError) throw studentError
      if (sessionsError) throw sessionsError

      let totalPresents = 0
      let totalRecords = 0

      sessions.forEach(session => {
        const attendanceRecords = session.attendance || []
        const presentCount = attendanceRecords.filter(a => a.present).length
        const totalForSession = attendanceRecords.length
        
        totalPresents += presentCount
        totalRecords += totalForSession
      })

      const overallAvg = totalRecords > 0 ? Math.round((totalPresents / totalRecords) * 100) : 0
      const mostRecentSession = sessions.length > 0 ? sessions[0] : null
      
      let lastSessionFormatted = 'NONE'
      if (mostRecentSession) {
        const d = new Date(mostRecentSession.date)
        lastSessionFormatted = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()
      }

      setStats({
        totalStudents: studentCount || 0,
        totalSessions: sessions?.length || 0,
        avgAttendance: overallAvg,
        lastSessionDate: lastSessionFormatted
      })

      // Check for today's session
      const todayString = new Date().toISOString().split('T')[0]
      const currentSession = sessions.find(s => s.date === todayString)
      
      if (currentSession) {
        setTodaySession(currentSession)
        const attendanceRecords = currentSession.attendance || []
        const presentCount = attendanceRecords.filter(a => a.present).length
        const absentCount = studentCount ? studentCount - presentCount : 0
        const rate = studentCount > 0 ? Math.round((presentCount / studentCount) * 100) : 0
        
        setTodayAttendance({
          absent: absentCount,
          rate: rate
        })
      } else {
        setTodaySession(null)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

  return (
    <div className="animate-fade-in w-full max-w-[1200px]">
      <div className="mb-10">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">
          Welcome Back, {profile?.display_name || 'Nischay'}
        </h1>
        <p className="text-[#8A8A94] text-sm md:text-base">
          Last login: Today at 09:41 AM
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
        
        {/* Progress Line */}
        <div className="h-1.5 w-full bg-[#1C1C24] rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${stats.avgAttendance || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Session Card */}
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
          
          {/* Faint background icon */}
          <Calendar size={240} className="absolute -bottom-16 -right-12 text-white/[0.02] z-0 pointer-events-none" />
        </div>

        {/* Today's Attendance Card */}
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
