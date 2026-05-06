import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Papa from 'papaparse'
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles, Database } from 'lucide-react'

export default function UploadCSV() {
  const [file, setFile] = useState(null)
  const [data, setData] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseFile(selectedFile)
    }
  }

  const parseFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data)
        setHeaders(Object.keys(results.data[0]))
        suggestMapping(Object.keys(results.data[0]))
      }
    })
  }

  const suggestMapping = async (csvHeaders) => {
    setLoading(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        // Fallback to manual if no API key
        setMapping({ usn: csvHeaders[0], status: csvHeaders[1] })
        return
      }

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-pro" })
      
      const prompt = `
        I have a CSV with these headers: [${csvHeaders.join(', ')}].
        I need to map these to my database fields: "usn" (student ID) and "status" (presence).
        Which CSV headers most likely correspond to "usn" and "status"?
        Return ONLY a JSON object like {"usn": "header_name", "status": "header_name"}.
      `
      
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      const jsonStr = text.match(/\{.*\}/s)[0]
      setMapping(JSON.parse(jsonStr))
    } catch (error) {
      console.error('AI Mapping failed:', error)
      setMapping({ usn: csvHeaders[0], status: csvHeaders[1] })
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!mapping) return
    setUploading(true)
    setStatus({ type: 'info', text: 'Processing upload...' })

    try {
      // 1. We need a session to link this attendance to.
      // For simplicity in this demo, we'll create a "CSV Import" session for today.
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          topic: `Import: ${file.name}`,
          date: new Date().toISOString().split('T')[0],
          month_number: new Date().getMonth() + 1,
          session_type: 'offline'
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // 2. Fetch all students to match USN -> ID
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, usn')

      if (studentsError) throw studentsError

      // 3. Prepare attendance records
      const attendanceToInsert = data.map(row => {
        const student = students.find(s => s.usn.toLowerCase() === row[mapping.usn]?.toLowerCase())
        if (!student) return null
        
        // Presence logic (case insensitive check for 'present', 'p', '1', 'yes')
        const statusVal = row[mapping.status]?.toLowerCase()
        const isPresent = ['present', 'p', '1', 'yes', 'y'].includes(statusVal)
        
        return {
          student_id: student.id,
          session_id: session.id,
          present: isPresent,
          marked_by: 'ai-importer'
        }
      }).filter(Boolean)

      if (attendanceToInsert.length === 0) throw new Error('No matching students found in CSV.')

      // 4. Batch Insert
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(attendanceToInsert)

      if (insertError) throw insertError

      setStatus({ type: 'success', text: `Successfully imported ${attendanceToInsert.length} records!` })
    } catch (error) {
      console.error('Upload failed:', error)
      setStatus({ type: 'error', text: error.message || 'Upload failed.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Sparkles className="text-accent-glow" size={32} />
          AI Attendance Importer
        </h1>
        <p className="text-fg-secondary mt-1">Upload an attendance sheet and let AI handle the mapping.</p>
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-[#222228] rounded-[32px] p-20 flex flex-col items-center justify-center bg-[#111115]/50 hover:bg-[#111115] hover:border-accent-glow/50 transition-all cursor-pointer relative group">
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="bg-[#0A0A0E] p-6 rounded-[24px] mb-6 group-hover:scale-110 transition-transform">
            <Upload size={40} className="text-accent-glow" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Select CSV File</h3>
          <p className="text-fg-tertiary text-sm">Drag and drop your attendance sheet here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mapping Card */}
          <div className="bg-[#111115] border border-[#222228] rounded-[24px] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#0A0A0E] rounded-2xl border border-[#222228]">
                  <FileText className="text-accent-glow" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{file.name}</h3>
                  <p className="text-xs text-fg-tertiary">{(file.size / 1024).toFixed(1)} KB • {data.length} rows</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="text-fg-tertiary hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Change File</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8A8A94] uppercase mb-4 ml-1">Detected Mapping</label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0A0A0E] border border-[#222228] rounded-2xl">
                    <span className="text-xs text-fg-secondary">USN / Roll No</span>
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {loading ? '...' : mapping?.usn}
                      {mapping && <CheckCircle2 size={14} className="text-emerald-500" />}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#0A0A0E] border border-[#222228] rounded-2xl">
                    <span className="text-xs text-fg-secondary">Attendance Status</span>
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {loading ? '...' : mapping?.status}
                      {mapping && <CheckCircle2 size={14} className="text-emerald-500" />}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <button 
                  onClick={handleUpload}
                  disabled={uploading || !mapping}
                  className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Database size={20} />
                  )}
                  {uploading ? 'Importing Data...' : 'Confirm & Import'}
                </button>
              </div>
            </div>
          </div>

          {status && (
            <div className={`p-6 rounded-[24px] border flex items-center gap-4 ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
              {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <p className="text-sm font-medium">{status.text}</p>
            </div>
          )}

          {/* Preview Table */}
          <div className="bg-[#111115] border border-[#222228] rounded-[24px] overflow-hidden">
            <div className="p-6 border-b border-[#222228]">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest">Preview (First 5 Rows)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0A0A0E] text-fg-tertiary text-[10px] font-bold tracking-widest uppercase">
                  <tr>
                    {headers.map(h => <th key={h} className="px-6 py-4">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  {data.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.01]">
                      {headers.map(h => <td key={h} className="px-6 py-4 text-fg-secondary">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
