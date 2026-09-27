import { useState } from 'react'
import { useAuth } from '../store/useAuth.js'

const AVATARS = ['🌿', '🏃‍♂️', '🏋️‍♀️', '🥑', '🧘‍♀️', '⚡', '🍎', '🔥']

export default function AuthModal({ isOpen, onClose }) {
  const { user, users, login, register, switchAccount, isGuest } = useAuth()
  const [tab, setTab] = useState(isGuest ? 'register' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('🌿')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !email.includes('@')) {
      return setError('Vui lòng nhập địa chỉ Email hợp lệ.')
    }
    if (!password || password.length < 4) {
      return setError('Mật khẩu tối thiểu 4 ký tự.')
    }

    if (tab === 'register') {
      if (!name.trim()) return setError('Vui lòng nhập họ và tên của bạn.')
      const res = register(name, email, password, avatar)
      if (!res.success) return setError(res.message)
      setSuccess('Đăng ký tài khoản thành công! Đang chuyển trang...')
      setTimeout(() => {
        onClose()
      }, 600)
    } else {
      login(email, password)
      setSuccess('Đăng nhập thành công!')
      setTimeout(() => {
        onClose()
      }, 600)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center font-bold text-sm"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-3xl mb-2">
            {avatar}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {tab === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản cá nhân'}
          </h2>
          <p className="text-xs text-slate-500">
            Lưu trữ lịch tập, chỉ số cơ thể và đồng bộ dữ liệu riêng của bạn
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/60">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); setSuccess('') }}
            className={`flex-1 rounded-xl py-2 text-xs sm:text-sm font-bold transition-all ${
              tab === 'login' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); setSuccess('') }}
            className={`flex-1 rounded-xl py-2 text-xs sm:text-sm font-bold transition-all ${
              tab === 'register' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đăng ký mới
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Chọn Avatar đại diện</label>
              <div className="flex items-center justify-between gap-1 p-2 rounded-2xl bg-slate-50 border border-slate-200/80">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`h-9 w-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      avatar === a ? 'bg-emerald-500 text-white scale-110 shadow-xs ring-2 ring-emerald-300' : 'hover:bg-slate-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Họ và tên của bạn</label>
              <input
                type="text"
                placeholder="VD: Minh Thảo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Địa chỉ Email</label>
            <input
              type="email"
              placeholder="VD: ban@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
              ✓ {success}
            </div>
          )}

          <button
            type="submit"
            className="btn-tactile w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700"
          >
            {tab === 'login' ? 'Đăng nhập ngay' : 'Hoàn tất đăng ký'}
          </button>
        </form>

        {/* Switch to other registered profiles on this browser */}
        {users.length > 1 && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Chuyển nhanh tài khoản trên máy này:
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    switchAccount(u.id)
                    onClose()
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors ${
                    user.id === u.id ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{u.avatar}</span>
                    <span>{u.name} ({u.email})</span>
                  </div>
                  {user.id === u.id && <span className="text-emerald-600 font-bold">Đang dùng ✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
