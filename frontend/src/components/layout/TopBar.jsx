import { Search } from 'lucide-react'

export default function TopBar({ profile, user }) {
  return (
    <header className="h-[72px] border-b border-[#1A1A24] flex items-center justify-between px-8 bg-[#0A0A0E] sticky top-0 z-10">
      <div className="flex items-center text-sm font-medium">
        <span className="text-[#8A8A94]">Overview</span>
        <span className="mx-2 text-[#8A8A94]">/</span>
        <span className="text-white">Dashboard</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="h-10 pl-9 pr-4 py-1 text-sm bg-[#111115] border border-[#1A1A24] text-white placeholder-[#52525B] w-64 rounded-full focus:outline-none focus:border-[#4b7cc2]"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-white">{user?.email || 'nischay@theboringpeople.in'}</div>
            <div className="text-sm text-[#8A8A94] capitalize">{profile?.role || 'Mentor'}</div>
          </div>
          <div className="w-10 h-10 rounded-full border border-[#2A2A35] flex items-center justify-center font-medium text-white bg-[#111115]">
            {profile?.display_name?.charAt(0)?.toUpperCase() || 'N'}
          </div>
        </div>
      </div>
    </header>
  )
}
