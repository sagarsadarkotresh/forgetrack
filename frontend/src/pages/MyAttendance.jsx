import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOutletContext } from 'react-router-dom'
import { Calendar, CheckCircle2, XCircle } from 'lucide-react'

export default function MyAttendance() {
  const { profile } = useOutletContext()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({ percentage: 0, present: 0, total: 0 })

  useEffect(() => {
    fetchAttendance()
  }, [profile])

  const fetchAttendance = async () => {
    if (!profile?.student_id) return
    setLoading(true)
    try {
      // 1. Fetch all sessions to date
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, date, topic, session_type')
        .lte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: false })

      // 2. Fetch student's attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('session_id, present')
        .eq('student_id', profile.student_id)

      if (sessionsError || attendanceError) throw (sessionsError || attendanceError)

      // Map them together
      const fullHistory = sessions.map(session => {
        const record = attendance.find(a => a.session_id === session.id)
        return {
          ...session,
          status: record ? (record.present ? 'present' : 'absent') : 'not_marked'
        }
      })

      const presentCount = fullHistory.filter(h => h.status === 'present').length
      const totalCount = fullHistory.length
      const percent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

      setHistory(fullHistory)
      setStats({ percentage: percent, present: presentCount, total: totalCount })
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse text-[#8A8A94]">Loading your attendance history...</div>
  }

  return (
    <div className="animate-fade-in w-full max-w-[1000px]">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">My Attendance</h1>
        <p className="text-[#8A8A94]">A complete log of your session presence.</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-[#0A0A0E] border border-[#222228] p-6 rounded-2xl">
          <div className="text-[10px] font-bold text-[#8A8A94] uppercase tracking-widest mb-1">PERCENTAGE</div>
          <div className="text-3xl font-bold text-white">{stats.percentage}%</div>
        </div>
        <div className="bg-[#0A0A0E] border border-[#222228] p-6 rounded-2xl">
          <div className="text-[10px] font-bold text-[#8A8A94] uppercase tracking-widest mb-1">PRESENT</div>
          <div className="text-3xl font-bold text-emerald-400">{stats.present} <span className="text-sm text-[#52525B]">Days</span></div>
        </div>
        <div className="bg-[#0A0A0E] border border-[#222228] p-6 rounded-2xl">
          <div className="text-[10px] font-bold text-[#8A8A94] uppercase tracking-widest mb-1">TOTAL SESSIONS</div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
        </div>
      </div>

      <div className="bg-[#0A0A0E] border border-[#222228] rounded-[24px] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#222228] bg-[#111115]/50">
              <th className="px-6 py-4 text-[10px] font-bold text-[#8A8A94] uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#8A8A94] uppercase tracking-widest">Topic</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#8A8A94] uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#8A8A94] uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222228]">
            {history.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-[#52525B]">No attendance records found yet.</td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="hover:bg-[#111115] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="text-white font-medium text-sm">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                  </td>
                  <td className="px-6 py-5 text-sm text-[#8A8A94] group-hover:text-white transition-colors">{item.topic}</td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-bold bg-[#1C1C24] text-[#8A8A94] px-2 py-1 rounded uppercase">{item.session_type}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      {item.status === 'present' ? (
                        <><CheckCircle2 size={16} className="text-emerald-500" /> <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Present</span></>
                      ) : item.status === 'absent' ? (
                        <><XCircle size={16} className="text-red-500" /> <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Absent</span></>
                      ) : (
                        <><Calendar size={16} className="text-[#52525B]" /> <span className="text-xs font-bold text-[#52525B] uppercase tracking-widest">Not Marked</span></>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
