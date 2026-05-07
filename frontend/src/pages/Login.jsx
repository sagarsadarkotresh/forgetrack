import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [activeTab, setActiveTab] = useState('mentor') // 'mentor' | 'student'
  const [emailOrUsn, setEmailOrUsn] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const cleanInput = emailOrUsn.trim()
      const cleanPassword = password.trim()
      let loginEmail = cleanInput
      
      if (activeTab === 'student' && !cleanInput.includes('@')) {
        loginEmail = `${cleanInput}@forge.local`
      }

      // Attempt Login
      let { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: cleanPassword,
      })

      // Auto-Registration for Students
      if (authError && activeTab === 'student' && (authError.message.toLowerCase().includes('invalid login') || authError.message.toLowerCase().includes('not found'))) {
        console.log('Student account not found. Attempting auto-registration...')
        
        const { data: studentData } = await supabase
          .from('students')
          .select('id, name')
          .eq('usn', cleanInput)
          .single()

        if (studentData) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: loginEmail,
            password: cleanPassword,
            options: {
              data: {
                role: 'student',
                display_name: studentData.name,
                student_id: studentData.id.toString()
              }
            }
          })

          if (!signUpError) {
            if (signUpData.session) {
              navigate('/')
              return
            } else {
               const retry = await supabase.auth.signInWithPassword({
                 email: loginEmail,
                 password: cleanPassword,
               })
               if (!retry.error) {
                 navigate('/')
                 return
               } else {
                 throw new Error('Account created but login failed: ' + retry.error.message)
               }
            }
          } else {
            throw signUpError
          }
        } else {
          throw new Error('USN ' + cleanInput + ' not found in Student List. Please check the USN.')
        }
      }

      if (authError) throw authError

      navigate('/')
    } catch (err) {
      console.error('Login Process Error:', err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-[#111115] rounded-[24px] p-8 sm:p-10 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3b2d63] to-[#4b7cc2] flex items-center justify-center shadow-inner mb-4 overflow-hidden relative">
            {/* Simple abstract shape to mimic the icon */}
            <div className="absolute top-1 right-1 w-4 h-4 bg-white/20 rounded-full blur-[2px]"></div>
            <div className="absolute bottom-0 left-0 w-6 h-4 bg-white/30 rounded-tr-full transform -rotate-12"></div>
            <div className="absolute top-[30%] left-[20%] w-4 h-[2px] bg-white transform rotate-45 rounded"></div>
          </div>
          <h1 className="text-white text-xl font-medium tracking-wide">ForgeTrack</h1>
        </div>

        <div className="flex bg-[#0A0A0E] p-1.5 rounded-xl mb-8">
          <button 
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'mentor' ? 'bg-[#1C1C24] text-white shadow-sm' : 'text-[#8A8A94] hover:text-white'}`}
            onClick={() => setActiveTab('mentor')}
            type="button"
          >
            Mentor Login
          </button>
          <button 
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'student' ? 'bg-[#1C1C24] text-white shadow-sm' : 'text-[#8A8A94] hover:text-white'}`}
            onClick={() => setActiveTab('student')}
            type="button"
          >
            Student Login
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-[11px] font-bold tracking-[0.1em] text-[#8A8A94] uppercase mb-2 ml-1">
              {activeTab === 'mentor' ? 'Email' : 'USN'}
            </label>
            <input 
              type={activeTab === 'mentor' ? 'email' : 'text'}
              className={`w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#4b7cc2] focus:ring-1 focus:ring-[#4b7cc2]/50 transition-colors ${error ? '!border-red-500' : ''}`}
              placeholder={activeTab === 'mentor' ? 'nischay@theboringpeople.in' : '4SH24CS001'}
              value={emailOrUsn}
              onChange={(e) => setEmailOrUsn(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold tracking-[0.1em] text-[#8A8A94] uppercase mb-2 ml-1">
              Password
            </label>
            <input 
              type="password"
              className={`w-full bg-[#0A0A0E] border border-[#222228] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#4b7cc2] focus:ring-1 focus:ring-[#4b7cc2]/50 transition-colors ${error ? '!border-red-500' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 mt-2 text-center">{error}</p>
          )}

          <button 
            type="submit" 
            className="w-full bg-white text-black font-semibold rounded-xl py-3.5 mt-8 hover:bg-gray-100 transition-colors disabled:opacity-70"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
