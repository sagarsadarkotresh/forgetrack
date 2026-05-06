import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from './layout/Shell'

export default function RoleGuard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const location = useLocation()

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const [profileError, setProfileError] = useState(null)

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('role, display_name, student_id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error("Error fetching profile:", error)
      setProfileError(error.message)
    } else if (data) {
      setProfile(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-void flex items-center justify-center text-fg-secondary">Loading...</div>
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center text-red-500 p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Error loading profile</h2>
        <p>{profileError}</p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="mt-4 px-4 py-2 bg-white text-black rounded">Sign Out</button>
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = profile.role

  // Handle root redirect based on role
  if (location.pathname === '/') {
    return <Navigate to={role === 'mentor' ? '/dashboard' : '/me/attendance'} replace />
  }

  // Mentor routes protection
  const mentorRoutes = ['/dashboard', '/attendance', '/history', '/materials', '/upload']
  if (mentorRoutes.some(route => location.pathname.startsWith(route)) && role !== 'mentor') {
    return <Navigate to="/403" replace />
  }

  // Student routes protection
  const studentRoutes = ['/me/attendance', '/me/upcoming', '/me/materials']
  if (studentRoutes.some(route => location.pathname.startsWith(route)) && role !== 'student') {
    return <Navigate to="/403" replace />
  }

  // If passed all guards, render the shell with the nested route
  return <Shell role={role} profile={profile} user={user} />
}
