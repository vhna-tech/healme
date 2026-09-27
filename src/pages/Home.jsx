import { Link, useNavigate } from 'react-router-dom'
import useLocalStorage from '../store/useLocalStorage.js'
import exercises from '../data/exercises.sample.json'
import { getTodayState, unsafeItems } from '../logic/today.js'
import { computeStreaks } from '../logic/progress.js'
import { toYmd, parseYmd, fmtDayMonth } from '../logic/dates.js'

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const TIERS = { mini: 'Buổi ngắn', short: 'Buổi vừa', full: 'Buổi đầy đủ' }

const sessionTitle = (s) => (s ? `${DAY_NAMES[s.dayOfWeek - 1]} ${fmtDayMonth(parseYmd(s.date))}` : '')

function greetingInfo(hour) {
  if (hour < 11) return { text: 'Chào buổi sáng!', sub: 'Hãy bắt đầu ngày mới với một lối sống lành mạnh hơn nhé!', icon: '☀️' }
  if (hour < 14) return { text: 'Chào buổi trưa!', sub: 'Tiếp thêm năng lượng tích cực cho buổi tập hôm nay nhé!', icon: '☀️' }
  if (hour < 18) return { text: 'Chào buổi chiều!', sub: 'Thời điểm lý tưởng để vận động và giải tỏa căng thẳng!', icon: '🌇' }
  return { text: 'Chào buổi tối!', sub: 'Thư giãn cơ bắp và hoàn thành mục tiêu sức khỏe hôm nay nhé!', icon: '🌙' }
}

export default function Home() {
  const navigate = useNavigate()
  const [profile] = useLocalStorage('profile', null)
  const [busySlots] = useLocalStorage('busySlots', null)
  const [plan] = useLocalStorage('weekPlan', null)
  const [logs] = useLocalStorage('logs', [])
  const [active, setActive] = useLocalStorage('activeWorkout', null)

  const now = new Date()
  const todayYmd = toYmd(now)
  const state = getTodayState({ profile, busySlots, plan, logs, active, todayYmd })
  const greeting = greetingInfo(now.getHours())

  const goal = profile?.daysPerWeek ?? 3
  const stats = computeStreaks(logs, goal, todayYmd)
  const weekPct = Math.min(100, Math.round((stats.thisWeek.count / stats.thisWeek.goal) * 100))

  // Bắt đầu một chạm: ghi sẵn buổi đang tập rồi chuyển sang trang Tập
  function start(s) {
    if (!s) return
    setActive({ date: s.date, startedAt: Date.now(), session: s, progress: {} })
    navigate('/workout')
  }

  const canStart = state.kind !== 'active'
  const unsafe = (s) => (s ? unsafeItems(s, profile?.injuries, exercises) : [])
  const todayUnsafe = state.kind === 'today' ? unsafe(state.session) : []
  const missedUnsafe = state.missed ? unsafe(state.missed) : []

  // Format today's string: "Thứ 3, 22/09/2026"
  const dayIndex = (now.getDay() + 6) % 7
  const todayFormatted = `${DAY_NAMES[dayIndex]}, ${fmtDayMonth(now)}/${now.getFullYear()}`

  // Next session details
  const nextSession = state.next || (plan?.sessions && plan.sessions.length > 0 ? plan.sessions[0] : null)
  const nextSessionItems = nextSession?.session?.items?.filter((i) => i.phase === 'main').map((i) => i.name) || [
    'Squat không tạ',
    'Nâng hông (Glute bridge)',
    'Chống đẩy quỳ gối',
    'Plank',
  ]

  return (
    <div className="space-y-6">
      {/* 1. TOP PANORAMIC HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#E6F7ED] via-[#DCF3E6] to-[#C8EED7] border border-emerald-100 shadow-sm">
        {/* Background artwork on right side */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 lg:w-1/2 bg-no-repeat bg-right bg-cover opacity-90 mix-blend-multiply pointer-events-none"
          style={{
            backgroundImage: `url('/hero_morning.jpg')`,
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 30%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 30%, black 100%)'
          }}
        />

        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[220px]">
          {/* Top Leaf Badge */}
          <div className="flex items-center justify-between">
            <span className="text-2xl text-emerald-800">🍃</span>
            <span className="font-serif italic text-emerald-900/80 font-bold text-base sm:text-xl drop-shadow-xs">
              Khỏe mạnh là hạnh phúc ♡
            </span>
          </div>

          {/* Banner Main Content */}
          <div className="max-w-md space-y-3 mt-4">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0A4D2E]">
              {greeting.text}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-950/80 font-medium leading-relaxed">
              {greeting.sub}
            </p>
            <div className="pt-2">
              {state.kind === 'today' ? (
                <button
                  type="button"
                  onClick={() => start(state.session)}
                  className="btn-tactile inline-flex items-center gap-2 rounded-full bg-[#0A4D2E] hover:bg-[#0D5C36] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-950/20 transition-all"
                >
                  <span>☀️ Xem kế hoạch hôm nay</span>
                  <span>→</span>
                </button>
              ) : state.kind === 'active' ? (
                <Link
                  to="/workout"
                  className="btn-tactile inline-flex items-center gap-2 rounded-full bg-[#0A4D2E] hover:bg-[#0D5C36] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-950/20 transition-all"
                >
                  <span>🔥 Tiếp tục bài tập đang diễn ra</span>
                  <span>→</span>
                </Link>
              ) : (
                <Link
                  to={profile ? '/schedule' : '/onboarding'}
                  className="btn-tactile inline-flex items-center gap-2 rounded-full bg-[#0A4D2E] hover:bg-[#0D5C36] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-950/20 transition-all"
                >
                  <span>☀️ Xem kế hoạch hôm nay</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. THREE QUICK ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Hồ sơ sức khỏe */}
        <Link
          to="/onboarding"
          className="card-hover group flex items-center justify-between rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F7ED] text-[#0A4D2E] text-2xl group-hover:bg-[#0A4D2E] group-hover:text-white transition-colors duration-200">
              📋
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0A4D2E] transition-colors">
                Hồ sơ sức khỏe
              </h2>
              <p className="text-xs text-slate-500 leading-snug mt-0.5">
                Theo dõi chỉ số và tình trạng sức khỏe của bạn
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-[#0A4D2E] group-hover:text-white transition-all ml-2">
            →
          </div>
        </Link>

        {/* Card 2: Lịch tuần */}
        <Link
          to="/schedule"
          className="card-hover group flex items-center justify-between rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F7ED] text-[#0A4D2E] text-2xl group-hover:bg-[#0A4D2E] group-hover:text-white transition-colors duration-200">
              📅
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0A4D2E] transition-colors">
                Lịch tuần
              </h2>
              <p className="text-xs text-slate-500 leading-snug mt-0.5">
                Xem lịch tập luyện và nhắc nhở hằng ngày
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-[#0A4D2E] group-hover:text-white transition-all ml-2">
            →
          </div>
        </Link>

        {/* Card 3: Tập luyện */}
        <Link
          to="/workout"
          className="card-hover group flex items-center justify-between rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F7ED] text-[#0A4D2E] text-2xl group-hover:bg-[#0A4D2E] group-hover:text-white transition-colors duration-200">
              🏋️
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0A4D2E] transition-colors">
                Tập luyện
              </h2>
              <p className="text-xs text-slate-500 leading-snug mt-0.5">
                Tạo thói quen vận động và cải thiện thể lực
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-[#0A4D2E] group-hover:text-white transition-all ml-2">
            →
          </div>
        </Link>
      </div>

      {/* 3. MAIN DASHBOARD SECTION (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Section "Hôm nay" & Missed / Next Session (2 cols span) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header "Hôm nay" */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                  Hôm nay
                </h2>
                <span className="text-xs text-slate-500 font-medium">{todayFormatted}</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0A4D2E] border border-emerald-200/70 shadow-2xs">
              <span>☀️</span>
              <span>Ngày tuyệt vời để chăm sóc bản thân!</span>
            </div>
          </div>

          {/* Doctor Warning if applicable */}
          {state.needsDoctorCheck && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 shadow-xs">
              <span className="text-lg">⚠️</span>
              <div>
                <span className="font-bold">Lưu ý sức khoẻ: </span>
                Bạn có câu trả lời &quot;Có&quot; ở phần sàng lọc. Hãy tham khảo ý kiến bác sĩ trước khi tập.
              </div>
            </div>
          )}

          {/* Missed Workout or Today's Workout Alert Bar */}
          {state.missed && canStart && state.kind !== 'setup' ? (
            <div className="rounded-2xl bg-[#EAF7EE] border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 text-lg shadow-2xs border border-emerald-100">
                  🗓️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Buổi {sessionTitle(state.missed)} chưa tập
                  </h3>
                  <p className="text-xs text-slate-600">Muốn tập buổi hôm nay không?</p>
                </div>
              </div>

              {missedUnsafe.length > 0 ? (
                <Link
                  to="/schedule"
                  className="btn-tactile inline-flex items-center justify-center rounded-full bg-[#0A4D2E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D5C36]"
                >
                  Tạo lại lịch
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => start(state.missed)}
                  className="btn-tactile inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0A4D2E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D5C36] shadow-xs"
                >
                  <span>▷</span>
                  <span>Tập bù</span>
                </button>
              )}
            </div>
          ) : state.kind === 'today' ? (
            <div className="rounded-2xl bg-[#EAF7EE] border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 text-lg shadow-2xs border border-emerald-100">
                  🔥
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Buổi {sessionTitle(state.session)} đã sẵn sàng!
                  </h3>
                  <p className="text-xs text-slate-600">
                    {state.session.minutes} phút · {TIERS[state.session.session.tier]} · {state.session.session.items.length} bài
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => start(state.session)}
                className="btn-tactile inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0A4D2E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D5C36] shadow-xs"
              >
                <span>▷</span>
                <span>Bắt đầu tập</span>
              </button>
            </div>
          ) : state.kind === 'active' ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Buổi tập đang diễn ra
                  </h3>
                  <p className="text-xs text-slate-600">Tiếp tục hoàn thành mục tiêu hôm nay nhé!</p>
                </div>
              </div>

              <Link
                to="/workout"
                className="btn-tactile inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0A4D2E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D5C36] shadow-xs"
              >
                <span>▷</span>
                <span>Tiếp tục tập</span>
              </Link>
            </div>
          ) : state.kind === 'done' ? (
            <div className="rounded-2xl bg-[#EAF7EE] border border-emerald-200 p-4 flex items-center gap-3 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 text-lg shadow-2xs">
                🎉
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Bạn đã hoàn thành buổi tập hôm nay!
                </h3>
                <p className="text-xs text-slate-600">Tuyệt vời! Hãy uống đủ nước và nghỉ ngơi nhé.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#F0F8F3] border border-emerald-100 p-4 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 text-lg shadow-2xs">
                  🌿
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Hôm nay là ngày nghỉ phục hồi
                  </h3>
                  <p className="text-xs text-slate-500">Giữ thói quen uống nước đều và giãn cơ nhẹ nhé.</p>
                </div>
              </div>
              <Link
                to="/schedule"
                className="text-xs font-bold text-[#0A4D2E] hover:underline"
              >
                Xem lịch tuần →
              </Link>
            </div>
          )}

          {/* BUỔI TIẾP THEO Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="space-y-2 max-w-lg">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  BUỔI TIẾP THEO
                </p>

                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {nextSession ? sessionTitle(nextSession) : 'Thứ 4, kế hoạch tuần'}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                    ⏱️ {nextSession?.startTime || '06:00'} · {nextSession?.minutes || 30} phút · {TIERS[nextSession?.session?.tier] || 'Buổi đầy đủ'} · {nextSession?.session?.items?.length || 13} bài
                  </span>
                </div>

                <div className="text-xs text-slate-500 leading-relaxed pt-1">
                  <span className="font-semibold text-slate-700">📍 Gồm: </span>
                  {nextSessionItems.slice(0, 4).join(', ')}
                  {nextSessionItems.length > 4 ? ` và +${nextSessionItems.length - 4} bài khác` : ''}
                </div>
              </div>

              {/* Right side illustration and arrow button */}
              <div className="flex flex-col items-end justify-between h-full pl-3 shrink-0">
                <div className="hidden sm:block text-slate-300">
                  {/* Stylized exercise plank / fitness vector */}
                  <svg className="h-10 w-16 text-emerald-600/60" viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="52" cy="10" r="4" fill="currentColor" />
                    <path d="M12 26 L22 20 L40 14 L48 10" />
                    <path d="M22 20 L26 26" />
                    <path d="M40 14 L44 26" />
                  </svg>
                </div>

                <Link
                  to={nextSession ? '/workout' : '/schedule'}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#0A4D2E] hover:text-white transition-colors mt-4"
                  title="Xem chi tiết"
                >
                  →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Progress & Motivation Cards (1 col span) */}
        <div className="space-y-4">
          {/* Card 1: Tiến độ tuần */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg text-emerald-700">📊</span>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Tiến độ tuần
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {stats.thisWeek.count}/{stats.thisWeek.goal} buổi
              </span>
            </div>

            {/* Progress Bar Track */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#0A4D2E] transition-all duration-500"
                style={{ width: `${weekPct}%` }}
                role="progressbar"
                aria-valuenow={weekPct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-600 font-medium">
                Chuỗi hiện tại: <strong className="text-slate-900">{stats.current} tuần</strong>
              </span>
              <Link
                to="/progress"
                className="font-bold text-[#0A4D2E] hover:text-[#0D5C36] hover:underline"
              >
                Xem tiến độ →
              </Link>
            </div>
          </div>

          {/* Card 2: Wellness Motivation Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E6F7ED] to-[#DCF3E4] p-5 border border-emerald-100 shadow-xs flex flex-col justify-between min-h-[165px]">
            {/* Background Image of Apple / Yoga Mat */}
            <div 
              className="absolute right-0 bottom-0 top-0 w-1/2 bg-no-repeat bg-right-bottom bg-contain opacity-85 mix-blend-multiply pointer-events-none"
              style={{
                backgroundImage: `url('/wellness_mat.jpg')`,
              }}
            />

            <div className="relative z-10 space-y-2 max-w-[58%]">
              <span className="text-xl text-emerald-800">🍃</span>
              <p className="font-serif italic text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed">
                &ldquo;Mỗi bước nhỏ đều tạo nên sự thay đổi lớn.&rdquo;
              </p>
            </div>

            <div className="relative z-10 text-emerald-800 text-xs font-bold pt-2">
              🌱 BeHealthy
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}