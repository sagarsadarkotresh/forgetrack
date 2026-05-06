import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link2, FileText, Video, Plus, ExternalLink, Trash2, X } from 'lucide-react'

export default function Materials() {
  const [materials, setMaterials] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState('slides')
  const [sessionId, setSessionId] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select(`
          *,
          sessions ( topic, date )
        `)
        .order('created_at', { ascending: false })
      
      if (materialsError) throw materialsError
      setMaterials(materialsData)

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, topic, date')
        .order('date', { ascending: false })
      
      if (sessionsError) throw sessionsError
      setSessions(sessionsData)
    } catch (error) {
      console.error('Error fetching materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMaterial = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase
        .from('materials')
        .insert({
          title,
          url,
          type,
          session_id: sessionId || null,
          description
        })

      if (error) throw error
      
      // Reset form and refresh
      setTitle('')
      setUrl('')
      setType('slides')
      setSessionId('')
      setDescription('')
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      console.error('Error adding material:', error)
      alert('Failed to add material')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return
    try {
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
      setMaterials(materials.filter(m => m.id !== id))
    } catch (error) {
      console.error('Error deleting material:', error)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'recording': return <Video size={18} className="text-purple-400" />
      case 'assignment': return <FileText size={18} className="text-orange-400" />
      default: return <Link2 size={18} className="text-blue-400" />
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
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Class Materials</h1>
          <p className="text-fg-secondary mt-1">Manage and share learning resources with students.</p>
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-white text-black font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-100 transition-colors"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? 'Cancel' : 'Add Material'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-[#111115] border border-border-glow p-8 rounded-[24px] animate-slide-up shadow-2xl shadow-accent-glow/5">
          <form onSubmit={handleAddMaterial} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-fg-secondary uppercase mb-2 ml-1">Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Week 1 Slides - React Fundamentals"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-glow"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-fg-secondary uppercase mb-2 ml-1">Link URL</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-glow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-fg-secondary uppercase mb-2 ml-1">Type</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-glow appearance-none"
                  >
                    <option value="slides">Slides</option>
                    <option value="recording">Recording</option>
                    <option value="assignment">Assignment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-fg-secondary uppercase mb-2 ml-1">Link to Session</label>
                  <select 
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-glow appearance-none"
                  >
                    <option value="">None / General</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{new Date(s.date).toLocaleDateString()} - {s.topic}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex flex-col">
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-fg-secondary uppercase mb-2 ml-1">Description (Optional)</label>
                <textarea 
                  rows="4"
                  placeholder="Short summary of what this covers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-glow resize-none"
                />
              </div>
              <button 
                type="submit"
                disabled={saving}
                className="mt-auto w-full bg-accent-glow text-white font-bold rounded-xl py-3 hover:shadow-lg hover:shadow-accent-glow/20 transition-all disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Save Material'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[#111115] border border-[#222228] rounded-[24px]">
            <div className="text-fg-secondary mb-2">No materials found.</div>
            <button onClick={() => setShowAddForm(true)} className="text-accent-glow text-sm font-semibold hover:underline">Upload your first resource</button>
          </div>
        ) : materials.map((material) => (
          <div 
            key={material.id} 
            className="group bg-[#111115] border border-[#222228] rounded-[24px] p-6 hover:border-accent-glow/30 transition-all flex flex-col relative"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-[#0A0A0E] p-3 rounded-2xl border border-[#222228] group-hover:border-accent-glow/20 transition-colors">
                {getTypeIcon(material.type)}
              </div>
              <div className="flex items-center gap-1">
                <a 
                  href={material.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2 text-fg-tertiary hover:text-white transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
                <button 
                  onClick={() => handleDelete(material.id)}
                  className="p-2 text-fg-tertiary hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{material.title}</h3>
              {material.description && (
                <p className="text-xs text-fg-secondary mb-4 line-clamp-2 leading-relaxed">{material.description}</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#222228] flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-fg-tertiary">
              <div className="flex items-center gap-1">
                <CalendarIcon size={12} className="inline" />
                {material.sessions?.date ? new Date(material.sessions.date).toLocaleDateString() : 'GENERAL'}
              </div>
              <div className="text-fg-secondary">{material.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarIcon({ size, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
