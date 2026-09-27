import { useEffect, useRef, useState } from 'react'
import { remainingMs, isFinished, pauseTimer, resumeTimer, addSeconds, formatClock } from '../logic/workout.js'
import { beep } from './sound.js'

/**
 * Bảng đồng hồ đếm ngược (nghỉ giữa hiệp hoặc đếm ngược thời gian tập).
 * timer: xem startTimer() trong logic/workout.js. Có timer.kind = 'work' | 'rest'.
 */
export default function TimerPanel({ timer, soundOn, onChange, onFinish, onSkip }) {
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef(false)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  })

  // Mỗi khi có đồng hồ mới: cập nhật giờ hiện tại và cho phép báo hết giờ một lần
  useEffect(() => {
    firedRef.current = false
    setNow(Date.now())
  }, [timer])

  // Chỉ dùng setInterval để "gõ nhịp" làm mới màn hình; thời gian còn lại luôn tính từ Date.now()
  useEffect(() => {
    if (!timer) return undefined
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (!firedRef.current && isFinished(timer, t)) {
        firedRef.current = true
        if (soundOn) beep()
        onFinishRef.current(timer)
      }
    }, 250)
    return () => clearInterval(id)
  }, [timer, soundOn])

  if (!timer) return null

  const finished = isFinished(timer, now)
  const isWork = timer.kind === 'work'
  
  const gradient = finished
    ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/25'
    : isWork
      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-500/25'
      : 'bg-gradient-to-r from-sky-600 to-indigo-700 shadow-sky-500/25'

  const btnClass = 'btn-tactile inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/20 px-4 py-2.5 text-xs sm:text-sm font-bold text-white backdrop-blur-sm hover:bg-white/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 min-h-[40px]'

  return (
    <div
      role="timer"
      className={`sticky top-2 z-20 rounded-3xl p-5 text-white shadow-xl backdrop-blur-md md:top-20 transition-all duration-300 ${gradient}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
          <p className="text-xs sm:text-sm font-semibold tracking-wide uppercase opacity-95">
            {finished && !isWork ? 'Hết giờ nghỉ, chuẩn bị hiệp tiếp!' : timer.label}
          </p>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">
          {isWork ? 'Đang tập' : finished ? 'Hết giờ' : 'Thời gian nghỉ'}
        </span>
      </div>

      <div className="my-2 flex items-baseline justify-between">
        <p className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums drop-shadow-sm">
          {formatClock(remainingMs(timer, now))}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!finished && (
          <button
            type="button"
            className={btnClass}
            onClick={() => onChange(timer.paused ? resumeTimer(timer, Date.now()) : pauseTimer(timer, Date.now()))}
          >
            {timer.paused ? (
              <>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Tiếp tục</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span>Tạm dừng</span>
              </>
            )}
          </button>
        )}

        {!finished && !isWork && (
          <button
            type="button"
            className={btnClass}
            onClick={() => onChange(addSeconds(timer, Date.now(), 15))}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+15s nghỉ</span>
          </button>
        )}

        {!finished && (
          <button type="button" className={btnClass} onClick={() => onSkip(timer)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span>{isWork ? 'Xong sớm' : 'Bỏ qua nghỉ'}</span>
          </button>
        )}

        {finished && (
          <button type="button" className={`${btnClass} bg-white text-amber-900 hover:bg-amber-50`} onClick={() => onChange(null)}>
            <span>Đóng đồng hồ</span>
          </button>
        )}
      </div>
    </div>
  )
}