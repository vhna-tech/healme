import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth.js'
import AuthModal from './AuthModal.jsx'

const links = [
  {
    to: '/',
    label: 'Trang chủ',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/onboarding',
    label: 'Hồ sơ',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/schedule',
    label: 'Lịch tuần',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/workout',
    label: 'Tập luyện',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/progress',
    label: 'Tiến độ',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export default function Layout() {
  const { user, isAuthOpen, setIsAuthOpen, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-[#F4F9F6] text-slate-900 antialiased font-sans">
      {/* 1. Left Sidebar Navigation (Desktop / Tablet) */}
      <aside className="hidden lg:flex w-64 flex-col justify-between bg-[#0A4D2E] text-white p-5 sticky top-0 h-screen select-none shadow-xl z-30 shrink-0">
        <div className="space-y-8">
          {/* Brand Logo */}
          <NavLink to="/" className="flex items-center gap-3 px-2 pt-2 transition-transform hover:scale-105">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm text-white text-2xl shadow-inner">
              🍃
            </div>
            <span className="text-2xl font-black tracking-tight text-white drop-shadow-xs">
              Healthy
            </span>
          </NavLink>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#156B43] text-white shadow-md shadow-black/10'
                      : 'text-emerald-100/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="shrink-0">{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Decorative Quote at Bottom of Sidebar */}
        <div className="relative overflow-hidden rounded-2xl bg-white/5 p-4 border border-white/10 text-emerald-100/90 text-xs space-y-2">
          <div className="absolute -right-2 -bottom-2 text-5xl opacity-10 text-white select-none pointer-events-none">
            🌿
          </div>
          <p className="italic leading-relaxed font-medium">
            &ldquo;Sức khỏe hôm nay là nền tảng cho cuộc sống tốt đẹp hơn ngày mai!&rdquo;
          </p>
          <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
            <span>💚</span>
            <span>BeHealthy Team</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content & Top Header */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-emerald-900/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xs">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 pointer-events-none text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm bài tập, lịch, chỉ số..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-4 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
            />
          </div>

          {/* Mobile Logo on small screens */}
          <div className="lg:hidden flex items-center gap-2">
            <span className="text-xl">🍃</span>
            <span className="text-lg font-black text-[#0A4D2E]">Healthy</span>
          </div>

          {/* Right: Notifications & User Profile Menu */}
          <div className="flex items-center gap-3 relative">
            {/* Notification Bell */}
            <button
              type="button"
              title="Thông báo"
              className="btn-tactile relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm"
            >
              🔔
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
            </button>

            {/* User Profile Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="btn-tactile flex items-center gap-2.5 rounded-full bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-200/80 py-1.5 px-3 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A4D2E] text-white text-xs font-bold">
                  {user.avatar || '👤'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[10px] text-slate-500 font-semibold leading-none">Xin chào,</p>
                  <p className="text-xs font-extrabold text-slate-900 leading-tight">{user.name}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-bold ml-0.5">▼</span>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 z-50 animate-fade-in space-y-1">
                  <div className="p-3 border-b border-slate-100 rounded-xl bg-slate-50">
                    <p className="text-xs font-bold text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/onboarding')
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 text-left transition-colors"
                  >
                    <span>👤</span>
                    <span>Hồ sơ & Chỉ số BMI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false)
                      setIsAuthOpen(true)
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 text-left transition-colors"
                  >
                    <span>🔄</span>
                    <span>Đổi / Tạo tài khoản mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left transition-colors"
                  >
                    <span>🚪</span>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. Page Content */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto pb-28 lg:pb-12">
          <Outlet />

          <footer className="mt-12 border-t border-slate-200/80 pt-6 text-center text-xs text-slate-400">
            Nội dung mang tính tham khảo, không thay thế tư vấn y tế hoặc bác sĩ chuyên khoa.
          </footer>
        </main>
      </div>

      {/* 4. Mobile Bottom Navigation */}
      <nav className="glass-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/90 shadow-xl lg:hidden">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold transition-all ${
                isActive ? 'text-[#0A4D2E] scale-105' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative flex items-center justify-center rounded-xl p-1.5 ${isActive ? 'bg-emerald-100/70 text-[#0A4D2E]' : ''}`}>
                  {l.icon}
                  {isActive && <span className="absolute -bottom-1 h-1 w-3 rounded-full bg-[#0A4D2E]" />}
                </div>
                <span className="mt-0.5 leading-tight">{l.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 5. Account & Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  )
}