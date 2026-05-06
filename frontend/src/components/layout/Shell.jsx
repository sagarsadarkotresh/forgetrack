import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { Outlet } from 'react-router-dom'

export default function Shell({ role, profile, user }) {
  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar role={role} profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar profile={profile} user={user} />
        {/* The cosmic glow wrapper */}
        <main className="flex-1 overflow-y-auto app-main">
          <div className="max-w-[1440px] mx-auto px-6 py-8 md:px-12 md:py-12 relative z-10">
            <Outlet context={{ profile, user, role }} />
          </div>
        </main>
      </div>
    </div>
  )
}
