import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as XLSX from 'xlsx'
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles, Database, ChevronDown, ArrowRight, Calendar } from 'lucide-react'

export default function UploadCSV() {
  const [step, setStep] = useState(1) // 1: Upload, 2: Configure, 3: Mapping/Preview
  const [file, setFile] = useState(null)
  const [workbook, setWorkbook] = useState(null)
  const [sheets, setSheets] = useState([])
  const [selectedSheets, setSelectedSheets] = useState([])
  const [classSchedule, setClassSchedule] = useState('Monday, Wednesday, Friday')
  const [referenceDate, setReferenceDate] = useState('2026-05-10')
  const [data, setData] = useState({}) // { sheetName: jsonData }
  const [mapping, setMapping] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sessionDates, setSessionDates] = useState({}) // { sessionLabel: dateString }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseFile(selectedFile)
      setStep(2)
    }
  }

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setSelectedSheets([]); // Force user to select sheets
        
        const allData = {};
        wb.SheetNames.forEach(name => {
          const sheet = wb.Sheets[name];
          allData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        });
        setData(allData);
      } catch (error) {
        console.error('Error parsing file:', error);
        setStatus({ type: 'error', text: 'Failed to parse Excel file. Is it a valid file?' });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const toggleSheetSelection = (name) => {
    setSelectedSheets(prev => 
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  }

  const handleAnalyzeSheets = async () => {
    if (selectedSheets.length === 0) {
      setStatus({ type: 'error', text: 'Please select at least one sheet.' });
      return;
    }
    setStatus(null);
    setStep(3);
    suggestMapping();
  }

  const suggestMapping = async () => {
    setLoading(true);
    setMapping(null);
    setSessionDates({});
    let responseText = '';
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setStatus({ type: 'error', text: 'Gemini API Key missing.' });
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      
      // Use sample from the first selected sheet for simplicity
      const activeSheet = selectedSheets[0];
      const sampleRows = data[activeSheet]?.slice(0, 10) || [];
      
      const prompt = `
        I have a spreadsheet sheet with these first few rows: ${JSON.stringify(sampleRows)}.
        I need to map columns to my database fields:
        1. "usn" (student ID column).
        2. "name" (student name column).
        3. "branch_code" (student branch code column, e.g., CS, IS, EC).
        4. "email" (student email column).
        5. Attendance sessions (columns representing a class session).
        
        The class schedule is: ${classSchedule}.
        The reference start date is: ${referenceDate}.
        
        The attendance columns might have dates in the header (e.g., "30/04/26" or numbers like 46238) or they might be named like "Day 1", "Day 2".
        
        Please analyze the structure and return a JSON object with:
        {
          "usnIndex": 3, // index of USN column
          "nameIndex": 4, // index of Name column
          "branchIndex": 5, // index of Branch column
          "emailIndex": 6, // index of Email column
          "sessions": [
            // IMPORTANT: Include EVERY single column that represents a class session/attendance. 
            // Do NOT truncate or summarize. If there are 50 sessions, return 50 items in this array!
            { "columnIndex": 7, "label": "30/04/26", "isDate": true },
            { "columnIndex": 8, "label": "Day 1", "isDate": false }
          ]
        }
        Return ONLY the JSON object.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      responseText = response.text();
      const jsonStr = responseText.match(/\{.*\}/s)[0];
      const parsedMapping = JSON.parse(jsonStr);
      
      // Override sessions with JS auto-detection to prevent AI truncation
      const sheetRows = data[activeSheet] || [];
      const headerRow = sheetRows[1] || []; // Row 2 is headers (index 1)
      const dataRows = sheetRows.slice(2, 7); // Check next 5 rows for attendance values
      const detectedSessions = [];
      
      headerRow.forEach((cell, index) => {
        // Skip mapped columns
        if (index === parsedMapping.usnIndex || index === parsedMapping.nameIndex || 
            index === parsedMapping.emailIndex || index === parsedMapping.branchIndex) {
          return;
        }
        
        // Skip SL NO
        if (cell && cell.toString().toLowerCase().includes('sl no')) return;
        
        const label = cell ? cell.toString().trim() : `Column ${index}`;
        
        // Check if header looks like a date
        const numLabel = Number(label);
        const isDate = (!isNaN(numLabel) && numLabel > 40000) || /[-/]/.test(label);
        
        // Check if data rows contain attendance values
        let hasAttendanceData = false;
        for (const row of dataRows) {
          const val = row[index];
          if (val !== undefined && val !== null) {
            const valStr = val.toString().trim().toLowerCase();
            if (['true', 'false', 'present', 'absent', 'p', 'a'].includes(valStr) || val === true || val === false) {
              hasAttendanceData = true;
              break;
            }
          }
        }
        
        if (isDate || label.toLowerCase().startsWith('day') || hasAttendanceData) {
          detectedSessions.push({
            columnIndex: index,
            label: label,
            isDate: isDate
          });
        }
      });
      
      parsedMapping.sessions = detectedSessions;
      setMapping(parsedMapping);
      
      // Initialize dates for sessions
      const initialDates = {};
      parsedMapping.sessions.forEach(s => {
        if (s.isDate) {
          const numLabel = Number(s.label);
          if (!isNaN(numLabel) && numLabel > 40000) {
            const date = new Date((numLabel - 25569) * 86400 * 1000);
            initialDates[s.label] = date.toISOString().split('T')[0];
          } else {
            const parts = s.label.split(/[-/]/);
            if (parts.length === 3) {
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              const month = parts[1].padStart(2, '0');
              const day = parts[0].padStart(2, '0');
              initialDates[s.label] = `${year}-${month}-${day}`;
            } else {
              initialDates[s.label] = s.label; // Fallback
            }
          }
        } else {
          // If not a date (e.g., "Day 1"), calculate based on schedule and reference date
          const index = parsedMapping.sessions.indexOf(s);
          const date = new Date(referenceDate);
          date.setDate(date.getDate() + index * 2); // Assume every 2 days for demo
          initialDates[s.label] = date.toISOString().split('T')[0];
        }
      });
      setSessionDates(initialDates);
    } catch (error) {
      console.error('AI Mapping failed:', error);
      let errorText = `AI Mapping failed: ${error.message}`;
      if (responseText) {
        errorText += `. Raw AI Output: ${responseText.substring(0, 200)}...`;
      }
      setStatus({ type: 'error', text: errorText });
    } finally {
      setLoading(false);
    }
  }

  const handleDateChange = (label, date) => {
    setSessionDates(prev => ({ ...prev, [label]: date }));
  }

  const handleUpload = async () => {
    const activeSheet = selectedSheets[0];
    const sheetData = data[activeSheet];
    
    if (!mapping || !sheetData) return;
    
    setUploading(true);
    setStatus({ type: 'info', text: 'Processing upload...' });

    try {
      const datesToCheck = Object.values(sessionDates);
      const { data: existingSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, date')
        .in('date', datesToCheck);

      if (sessionsError) throw sessionsError;

      if (existingSessions.length > 0) {
        const dupDates = existingSessions.map(s => s.date).join(', ');
        const proceed = confirm(`Sessions already exist for dates: ${dupDates}. Do you want to proceed?`);
        if (!proceed) {
          setStatus({ type: 'info', text: 'Upload cancelled.' });
          setUploading(false);
          return;
        }
      }

      const startRow = 2; 
      const rowsToProcess = sheetData.slice(startRow);
      
      // Extract and upsert students
      const studentsToInsert = [];
      rowsToProcess.forEach(row => {
        const usn = row[mapping.usnIndex];
        const name = row[mapping.nameIndex];
        const email = row[mapping.emailIndex];
        const branch = row[mapping.branchIndex] || 'CS'; // Fallback
        
        let finalUsn = usn;
        if (!usn && email) {
          finalUsn = email.toString().trim();
        }
        
        if (finalUsn && name) {
          studentsToInsert.push({
            usn: finalUsn.toString().trim(),
            name: name.toString().trim(),
            branch_code: branch.toString().trim(),
            email: email ? email.toString().trim() : null,
            is_active: true
          });
        }
      });

      const { data: upsertedStudents, error: studentsError } = await supabase
        .from('students')
        .upsert(studentsToInsert, { onConflict: 'usn' })
        .select('id, usn');

      if (studentsError) throw studentsError;

      const attendanceToInsert = [];
      const insertedDates = {}; // Track dates inserted in this run

      for (const s of mapping.sessions) {
        const dateStr = sessionDates[s.label];
        let sessionId;
        const existing = existingSessions.find(es => es.date === dateStr);
        
        if (existing) {
          sessionId = existing.id;
        } else if (insertedDates[dateStr]) {
          sessionId = insertedDates[dateStr];
        } else {
          const { data: newSession, error: nsError } = await supabase
            .from('sessions')
            .insert({
              topic: s.label,
              date: dateStr,
              month_number: new Date(dateStr).getMonth() + 1,
              session_type: 'offline'
            })
            .select()
            .single();
          
          if (nsError) throw nsError;
          sessionId = newSession.id;
          insertedDates[dateStr] = sessionId; // Save for this run
        }

        for (const row of rowsToProcess) {
          const usn = row[mapping.usnIndex];
          const email = row[mapping.emailIndex];
          
          let finalUsn = usn;
          if (!usn && email) {
            finalUsn = email.toString().trim();
          }
          
          if (!finalUsn) continue;

          const student = upsertedStudents.find(std => std.usn.toLowerCase() === finalUsn.toLowerCase());
          if (!student) continue;

          const statusVal = row[s.columnIndex];
          const valStr = statusVal?.toString().trim().toLowerCase();
          const isPresent = ['present', 'p', '1', 'yes', 'y', 'true'].includes(valStr) || statusVal === true;

          attendanceToInsert.push({
            student_id: student.id,
            session_id: sessionId,
            present: isPresent,
            marked_by: 'ai-importer'
          });
        }
      }

      if (attendanceToInsert.length === 0) throw new Error('No matching records found.');

      const { error: insertError } = await supabase
        .from('attendance')
        .upsert(attendanceToInsert, { onConflict: 'student_id,session_id' });

      if (insertError) throw insertError;

      setStatus({ type: 'success', text: `Successfully imported attendance for ${mapping.sessions.length} sessions!` });
    } catch (error) {
      console.error('Upload failed:', error);
      setStatus({ type: 'error', text: error.message || 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bulk Attendance Upload</h1>
          <p className="text-fg-secondary mt-1">Powered by ForgeTrack AI Agent</p>
        </div>
        {/* Progress Indicator */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i} 
              className={`h-1 w-8 rounded-full ${i <= step ? 'bg-accent-glow' : 'bg-[#222228]'}`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="border-2 border-dashed border-[#222228] rounded-[32px] p-20 flex flex-col items-center justify-center bg-[#111115]/50 hover:bg-[#111115] hover:border-accent-glow/50 transition-all cursor-pointer relative group">
          <input 
            type="file" 
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="bg-[#0A0A0E] p-6 rounded-[24px] mb-6 group-hover:scale-110 transition-transform">
            <Upload size={40} className="text-accent-glow" />
          </div>
          <h3 className="text-xl font-bold mb-2">Upload Attendance File</h3>
          <p className="text-fg-tertiary text-sm mb-6">Excel (.xlsx) or CSV files supported</p>
          <button className="bg-white text-black font-bold py-3 px-6 rounded-2xl hover:bg-gray-100 transition-all">
            Select File
          </button>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div className="bg-[#111115] border border-[#222228] rounded-[24px] p-8 space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <FileText className="text-accent-glow" size={24} />
            <h2 className="text-lg font-bold">Configure Import</h2>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold tracking-widest text-[#8A8A94] uppercase">Select Sheets to Import</label>
              <span className="text-xs text-fg-tertiary">Found {sheets.length} sheets</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sheets.map(name => (
                <button
                  key={name}
                  onClick={() => toggleSheetSelection(name)}
                  className={`py-2 px-4 rounded-full text-sm font-medium transition-all border ${selectedSheets.includes(name) ? 'border-accent-glow bg-accent-glow/10 text-white' : 'border-[#222228] text-fg-secondary hover:border-fg-tertiary'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-[#8A8A94] uppercase mb-2">Class Schedule</label>
              <input 
                type="text" 
                value={classSchedule}
                onChange={(e) => setClassSchedule(e.target.value)}
                className="w-full bg-[#0A0A0E] border border-[#222228] rounded-2xl p-4 text-white focus:outline-none focus:border-accent-glow"
                placeholder="e.g., Monday, Wednesday, Friday"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-[#8A8A94] uppercase mb-2">Reference Date (Start)</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  className="w-full bg-[#0A0A0E] border border-[#222228] rounded-2xl p-4 text-white focus:outline-none focus:border-accent-glow"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-tertiary pointer-events-none" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleAnalyzeSheets}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all"
          >
            <ArrowRight size={20} />
            Analyze Sheets
          </button>
        </div>
      )}

      {/* Step 3: Mapping / Preview */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-[#111115] border border-[#222228] rounded-[24px] p-8">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-3 border-accent-glow border-t-transparent rounded-full animate-spin" />
                <span className="ml-4 text-white">AI analyzing structure...</span>
              </div>
            ) : mapping ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Detected Mapping</h2>
                  <button onClick={() => setStep(2)} className="text-fg-tertiary hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Back</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-[#0A0A0E] border border-[#222228] rounded-2xl">
                    <span className="text-xs text-fg-secondary">USN Column Index</span>
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {mapping.usnIndex}
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#0A0A0E] border border-[#222228] rounded-2xl">
                    <span className="text-xs text-fg-secondary">Detected Sessions</span>
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {mapping.sessions.length}
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8A8A94] uppercase mb-2">Session Dates (AI Suggested)</label>
                  <div className="space-y-2">
                    {mapping.sessions.map(s => (
                      <div key={s.label} className="flex items-center justify-between p-4 bg-[#0A0A0E] border border-[#222228] rounded-2xl">
                        <span className="text-xs text-fg-secondary">{s.label}</span>
                        <input 
                          type="date" 
                          value={sessionDates[s.label] || ''} 
                          onChange={(e) => handleDateChange(s.label, e.target.value)}
                          className="bg-[#111115] border border-[#222228] rounded-lg p-2 text-white text-sm focus:outline-none focus:border-accent-glow"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleUpload}
                  disabled={uploading}
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
            ) : null}
          </div>

          {status && (
            <div className={`p-6 rounded-[24px] border flex items-center gap-4 ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : status.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {status.type === 'success' ? <CheckCircle2 size={24} /> : status.type === 'info' ? <AlertCircle size={24} /> : <AlertCircle size={24} />}
              <p className="text-sm font-medium">{status.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
