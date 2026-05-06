import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Check, X, Calendar as CalendarIcon, Save, Plus } from 'lucide-react'

export default function MarkAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [session, setSession] = useState(null)
  const [students, setStudents] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Session form state
  const [topic, setTopic] = useState('')
  const [sessionType, setSessionType] = useState('offline')

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    setMessage(null)
    try {
      // 1. Fetch all active students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, usn')
        .eq('is_active', true)
        .order('name')

      if (studentsError) throw studentsError
      setStudents(studentsData)

      // 2. Fetch session for the selected date
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', selectedDate)
        .maybeSingle()

      if (sessionError) throw sessionError

      if (sessionData) {
        setSession(sessionData)
        setTopic(sessionData.topic)
        setSessionType(sessionData.session_type)

        // 3. Fetch existing attendance for this session
        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from('attendance')
          .select('student_id, present')
          .eq('session_id', sessionData.id)

        if (attendanceError) throw attendanceError

        const map = {}
        // Initialize map with current attendance
        attendanceRecords.forEach(rec => {
          map[rec.student_id] = rec.present
        })
        // Ensure all students are in the map
        studentsData.forEach(s => {
          if (map[s.id] === undefined) map[s.id] = false
        })
        setAttendanceMap(map)
      } else {
        setSession(null)
        setTopic('')
        // Default to all present for a new session
        const map = {}
        studentsData.forEach(s => {
          map[s.id] = true
        })
        setAttendanceMap(map)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage({ type: 'error', text: 'Failed to load data.' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (studentId) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      let sessionId = session?.id

      // 1. If no session exists, create one
      if (!sessionId) {
        const { data: newSession, error: createError } = await supabase
          .from('sessions')
          .insert({
            date: selectedDate,
            topic: topic || 'General Session',
            session_type: sessionType,
            month_number: new Date(selectedDate).getMonth() + 1
          })
          .select()
          .single()

        if (createError) throw createError
        sessionId = newSession.id
        setSession(newSession)
      } else if (topic !== session.topic || sessionType !== session.session_type) {
        // Update session details if changed
        const { error: updateError } = await supabase
          .from('sessions')
          .update({ topic, session_type: sessionType })
          .eq('id', sessionId)
        
        if (updateError) throw updateError
      }

      // 2. Batch upsert attendance
      const attendanceToUpsert = students.map(s => ({
        student_id: s.id,
        session_id: sessionId,
        present: attendanceMap[s.id] || false,
        marked_by: 'mentor' // In a real app, this would be the mentor's name/ID
      }))

      const { error: upsertError } = await supabase
        .from('attendance')
        .upsert(attendanceToUpsert, { onConflict: 'student_id, session_id' })

      if (upsertError) throw upsertError

      setMessage({ type: 'success', text: 'Attendance saved successfully!' })
    } catch (error) {
      console.error('Error saving attendance:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save attendance.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-glow border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Mark Attendance</h1>
          <p className="text-fg-secondary mt-1">Select a date and record student presence.</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold tracking-widest text-fg-secondary uppercase ml-1">Select Date</label>
          <div className="relative">
            <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#111115] border border-[#222228] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-glow transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Session Details Form */}
        <div className="lg:col-span-1">
          <div className="bg-[#111115] border border-[#222228] rounded-[24px] p-6 space-y-6 sticky top-24">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CalendarIcon size={18} className="text-accent-glow" />
              Session Info
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8A8A94] uppercase mb-2">Topic</label>
                <input 
                  type="text"
                  placeholder="e.g. Intro to LLMs"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-glow"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8A8A94] uppercase mb-2">Type</label>
                <select 
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-glow appearance-none"
                >
                  <option value="offline">Offline (In-Person)</option>
                  <option value="online">Online (Remote)</option>
                </select>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-medium ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {message.text}
              </div>
            )}

            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-white text-black font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50 mt-4"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              {session ? 'Update Everything' : 'Create & Save'}
            </button>
          </div>
        </div>

        {/* Students List */}
        <div className="lg:col-span-2">
          <div className="bg-[#111115] border border-[#222228] rounded-[24px] overflow-hidden">
            <div className="p-6 border-b border-[#222228] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Student List</h2>
              <div className="text-xs text-fg-secondary">
                {Object.values(attendanceMap).filter(v => v).length} / {students.length} Present
              </div>
            </div>

            <div className="divide-y divide-[#222228]">
              {students.map((student) => (
                <div 
                  key={student.id} 
                  className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{student.name}</span>
                    <span className="text-[10px] text-fg-tertiary font-mono">{student.usn}</span>
                  </div>
                  
                  <button
                    onClick={() => handleToggle(student.id)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors relative ${attendanceMap[student.id] ? 'bg-emerald-500' : 'bg-[#222228]'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${attendanceMap[student.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
