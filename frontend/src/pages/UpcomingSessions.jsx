import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Clock, MapPin } from 'lucide-react'

export default function UpcomingSessions() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    fetchUpcoming()
  }, [])

  const fetchUpcoming = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .gt('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse text-[#8A8A94]">Loading upcoming sessions...</div>
  }

  return (
    <div className="animate-fade-in w-full max-w-[800px]">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Upcoming Sessions</h1>
        <p className="text-[#8A8A94]">Stay prepared for the next classes.</p>
      </div>

      <div className="space-y-6">
        {sessions.length === 0 ? (
          <div className="bg-[#0A0A0E] border border-[#222228] rounded-3xl p-12 text-center">
            <Calendar size={48} className="mx-auto text-[#1C1C24] mb-4" />
            <p className="text-[#8A8A94]">No upcoming sessions scheduled yet.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-[#0A0A0E] border border-[#222228] rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-[#4b7cc2]/50 transition-all">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#111115] border border-[#222228] flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] font-bold text-[#4b7cc2] uppercase">{new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                  <div className="text-2xl font-bold text-white">{new Date(session.date).toLocaleDateString('en-US', { day: '2-digit' })}</div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#4b7cc2] transition-colors">{session.topic}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#8A8A94] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1.5"><Clock size={14} /> {session.duration_hours || '2'} Hours</div>
                    <div className="flex items-center gap-1.5"><MapPin size={14} /> {session.session_type}</div>
                  </div>
                </div>
              </div>
              <button className="bg-[#1C1C24] hover:bg-[#222228] text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">
                Add to Calendar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
