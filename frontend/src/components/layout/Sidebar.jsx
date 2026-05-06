import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  BookOpen, 
  Upload, 
  UserCheck, 
  Calendar, 
  Settings, 
  LogOut,
  ChevronLeft
} from 'lucide-react'

export default function Sidebar({ role, profile }) {
  const isMentor = role === 'mentor'
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center gap-3 px-4 h-11 rounded-lg transition-colors text-body ${
          isActive 
            ? 'bg-surface-raised text-fg-primary border-l-2 border-accent-glow' 
            : 'text-fg-secondary hover:bg-surface'
        }`
      }
    >
      <Icon size={20} strokeWidth={1.75} />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <aside className="w-[260px] hidden md:flex flex-col bg-[#0A0A0E] border-r border-[#1A1A24] h-screen sticky top-0 overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-[#1A1A24]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-accent-glow flex items-center justify-center font-display font-bold text-white">F</div>
          <span className="font-display font-bold text-lg text-white">ForgeTrack</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isMentor ? (
          <>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#52525B] mb-3 px-4 uppercase">OVERVIEW</p>
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#52525B] mb-3 px-4 uppercase">ACTIVITY</p>
              <NavItem to="/attendance" icon={CheckSquare} label="Mark Attendance" />
              <NavItem to="/history" icon={Users} label="Student History" />
              <NavItem to="/materials" icon={BookOpen} label="Materials" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#52525B] mb-3 px-4 uppercase">DATA</p>
              <NavItem to="/upload" icon={Upload} label="Upload CSV" />
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#52525B] mb-3 px-4 uppercase">OVERVIEW</p>
              <NavItem to="/me/attendance" icon={UserCheck} label="My Attendance" />
              <NavItem to="/me/upcoming" icon={Calendar} label="Upcoming" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#52525B] mb-3 px-4 uppercase">RESOURCES</p>
              <NavItem to="/me/materials" icon={BookOpen} label="Materials" />
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-[#1A1A24] mt-auto">
        <button className="w-full flex items-center gap-3 px-4 h-11 rounded-lg text-fg-secondary hover:bg-white/[0.03] text-sm font-medium transition-colors">
          <Settings size={20} strokeWidth={1.75} />
          <span>Settings</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 h-11 rounded-lg text-red-500 hover:bg-red-500/5 text-sm font-medium transition-colors mt-1"
        >
          <LogOut size={20} strokeWidth={1.75} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
