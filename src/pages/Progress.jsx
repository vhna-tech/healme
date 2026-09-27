import { useState } from 'react'
import { Link } from 'react-router-dom'
import useLocalStorage from '../store/useLocalStorage.js'
import { WeightChart, WeeklyChart } from '../components/Charts.jsx'
import {
  computeStreaks, weeklySeries, upsertWeight, removeWeight, validateWeight, weightChange, isQualifying,
} from '../logic/progress.js'
import { evaluateBadges } from '../logic/badges.js'
import { toYmd, parseYmd, fmtDayMonth } from '../logic/dates.js'

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const FEEDBACK = {
  too_easy: ['Quá dễ 🟢', 'bg-sky-50 text-sky-700 border-sky-200'],
  just_right: ['Vừa sức 🟡', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  too_hard: ['Quá khó 🔴', 'bg-orange-50 text-orange-700 border-orange-200'],
}

const dayLabel = (ymd) => {
  const d = parseYmd(ymd)
  return `${DAY_NAMES[(d.getDay() + 6) % 7]} · ${fmtDayMonth(d)}`
}

const fmtTotalTime = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} giờ ${m} phút` : `${m} phút`
}

const cardBase = 'rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm'
const primaryBtn = 'btn-tactile inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-center font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2'

function StatCard({ label, value, sub, icon, bg = 'bg-slate-50 text-slate-700' }) {
  return (
    <div className="card-hover rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-base ${bg}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs font-semibold text-slate-600">{sub}</p>}
      </div>
    </div>
  )
}

export default function Progress() {
  const [logs] = useLocalStorage('logs', [])
  const [weights, setWeights] = useLocalStorage('weights', [])
  const [profile] = useLocalStorage('profile', null)

  const todayYmd = toYmd(new Date())
  const [weightInput, setWeightInput] = useState('')
  const [dateInput, setDateInput] = useState(todayYmd)
  const [weightError, setWeightError] = useState('')
  const [mode, setMode] = useState('sessions')
  const [showAll, setShowAll] = useState(false)

  const goal = profile?.daysPerWeek ?? 3
  const stats = computeStreaks(logs, goal, todayYmd)
  const badges = evaluateBadges(stats)
  const earned = badges.filter((b) => b.earned).length
  const series = weeklySeries(logs, todayYmd, 8)
  const change = weightChange(weights)
  const sortedLogs = [...logs].sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
  const shownLogs = showAll ? sortedLogs : sortedLogs.slice(0, 10)

  function saveWeight(e) {
    e.preventDefault()
    const err = validateWeight(weightInput)
    if (err) return setWeightError(err)
    if (!dateInput || dateInput > todayYmd) return setWeightError('Hãy chọn một ngày không nằm trong tương lai.')
    setWeightError('')
    setWeights(upsertWeight(weights, dateInput, weightInput))
    setWeightInput('')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 mb-2 border border-emerald-200/60">
          <span>📈</span> Thống kê hiệu suất
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Tiến độ tập luyện</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Theo dõi chuỗi thói quen kiên trì, biểu đồ vận động và chỉ số cơ thể.
        </p>
      </div>

      {/* 4 Stat Hero Cards */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Chuỗi hiện tại"
            value={`${stats.current} tuần`}
            sub="Đạt mục tiêu liên tiếp"
            icon="🔥"
            bg="bg-orange-50 text-orange-600"
          />
          <StatCard
            label="Tuần này"
            value={`${stats.thisWeek.count}/${stats.thisWeek.goal}`}
            sub={stats.thisWeek.met ? 'Đã hoàn thành! 🎉' : 'Đang cố gắng'}
            icon="🎯"
            bg="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Kỷ lục chuỗi"
            value={`${stats.longest} tuần`}
            sub="Thành tích cao nhất"
            icon="🏆"
            bg="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Tổng cộng"
            value={`${stats.totalSessions} buổi`}
            sub={fmtTotalTime(stats.totalMinutes)}
            icon="⚡"
            bg="bg-sky-50 text-sky-600"
          />
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed pl-1">
          * Chuỗi tuần là số tuần liên tiếp bạn tập đủ mục tiêu ({goal} buổi). Buổi tập làm dưới 50% số bài sẽ không tính vào chuỗi (thời gian tập vẫn được bảo lưu).
        </p>
      </section>

      {/* Badges Showcase */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏅</span>
            <h2 className="text-lg font-bold text-slate-900">Bộ sưu tập huy hiệu</h2>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
            {earned}/{badges.length} đã mở
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((b) => (
            <li
              key={b.id}
              className={`card-hover flex flex-col items-center justify-between rounded-3xl border p-4 text-center transition-all ${
                b.earned
                  ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/70 to-white shadow-xs'
                  : 'border-slate-200/60 bg-slate-50/60 opacity-60'
              }`}
              data-earned={b.earned}
            >
              <div className="py-2">
                <p className={`text-4xl transition-transform ${b.earned ? 'scale-110 drop-shadow-sm' : 'grayscale opacity-70'}`} aria-hidden="true">
                  {b.icon}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">{b.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-tight">{b.desc}</p>
              </div>

              <div className="mt-2 w-full pt-2 border-t border-slate-100">
                <span className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[11px] font-extrabold ${b.earned ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/70 text-slate-600'}`}>
                  {b.earned ? 'Đã đạt ✓' : `${b.current}/${b.value}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 8-Week Trend Chart */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="text-lg font-bold text-slate-900">Hoạt động 8 tuần gần nhất</h2>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60 self-start sm:self-auto">
            {[
              ['sessions', 'Số buổi tập'],
              ['minutes', 'Tổng số phút'],
            ].map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={mode === v}
                onClick={() => setMode(v)}
                className={`btn-tactile rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  mode === v
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {logs.length ? (
          <div className={cardBase}>
            <WeeklyChart series={series} mode={mode} goal={goal} />
            {mode === 'sessions' && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500 border-t border-slate-100 pt-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Cột màu xanh đậm biểu thị tuần đạt chỉ tiêu {goal} buổi.</span>
              </div>
            )}
          </div>
        ) : (
          <div className={`${cardBase} text-center space-y-3 py-8`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              🏃
            </div>
            <p className="text-sm font-semibold text-slate-700">Chưa có dữ liệu buổi tập nào.</p>
            <p className="text-xs text-slate-400">Hoàn thành buổi tập đầu tiên để kích hoạt biểu đồ tiến độ nhé!</p>
            <div className="pt-2">
              <Link to="/workout" className={primaryBtn}>
                Đi tập ngay
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Weight Tracker */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <h2 className="text-lg font-bold text-slate-900">Theo dõi cân nặng</h2>
        </div>

        <form onSubmit={saveWeight} noValidate className={`${cardBase} space-y-4`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="weight" className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">
                Cân nặng hiện tại (kg)
              </label>
              <input
                id="weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder={String(weights[weights.length - 1]?.kg ?? profile?.weightKg ?? 60)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="wdate" className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">
                Ngày ghi nhận
              </label>
              <input
                id="wdate"
                type="date"
                value={dateInput}
                max={todayYmd}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[44px]"
              />
            </div>
          </div>

          {weightError && (
            <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              ⚠️ {weightError}
            </div>
          )}

          <button type="submit" className={`${primaryBtn} w-full`}>
            Lưu chỉ số cân nặng
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            💡 Mẹo: Nên cân vào buổi sáng sau khi thức dậy và đi vệ sinh để có kết quả nhất quán nhất.
          </p>
        </form>

        {weights.length ? (
          <div className={`${cardBase} space-y-4`}>
            <WeightChart weights={weights} />

            {change && (
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 border border-slate-100 text-xs sm:text-sm">
                <span className="font-semibold text-slate-600">Thay đổi tổng thể:</span>
                <span className="font-bold text-slate-900">
                  {change.from} kg → {change.to} kg (
                  <span className={change.diff < 0 ? 'text-emerald-600' : change.diff > 0 ? 'text-orange-600' : 'text-slate-600'}>
                    {change.diff > 0 ? '+' : ''}{change.diff} kg
                  </span>)
                </span>
              </div>
            )}

            <details className="group text-xs sm:text-sm">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-700 select-none py-1">
                <span>Lịch sử các lần cân ({weights.length})</span>
                <svg className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <ul className="mt-3 divide-y divide-slate-100 pt-1">
                {[...weights].reverse().map((w) => (
                  <li key={w.date} className="flex items-center justify-between py-2.5">
                    <span className="text-slate-700 font-medium">
                      {dayLabel(w.date)}: <strong className="text-slate-900 font-bold">{w.kg} kg</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setWeights(removeWeight(weights, w.date))}
                      aria-label={`Xoá cân nặng ngày ${w.date}`}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      Xoá
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2">
            Chưa có dữ liệu cân nặng. Nhập số đầu tiên để bắt đầu theo dõi biểu đồ.
          </p>
        )}
      </section>

      {/* Workout Log Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <h2 className="text-lg font-bold text-slate-900">Nhật ký các buổi tập</h2>
          </div>
          {sortedLogs.length > 0 && (
            <span className="text-xs font-semibold text-slate-400">
              Tổng {sortedLogs.length} buổi
            </span>
          )}
        </div>

        {sortedLogs.length === 0 ? (
          <div className={`${cardBase} text-center py-6 text-xs sm:text-sm text-slate-500`}>
            Nhật ký chi tiết sẽ tự động hiển thị tại đây sau buổi tập đầu tiên của bạn.
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-2.5">
              {shownLogs.map((l) => {
                const [fbLabel, fbColor] = FEEDBACK[l.feedback] ?? ['', '']
                const qualifying = isQualifying(l)

                return (
                  <li key={l.id} className="card-hover rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{dayLabel(l.doneDate)}</p>
                          {!qualifying && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                              Làm dở
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 font-medium">
                          {l.completedCount}/{l.total} bài tập · {l.actualMinutes} phút
                        </p>
                      </div>

                      {fbLabel && (
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${fbColor}`}>
                          {fbLabel}
                        </span>
                      )}
                    </div>

                    {l.note && (
                      <p className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 italic border border-slate-100">
                        &ldquo;{l.note}&rdquo;
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>

            {sortedLogs.length > 10 && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  className="btn-tactile inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-slate-50 shadow-xs"
                >
                  <span>{showAll ? 'Thu gọn danh sách' : `Xem tất cả ${sortedLogs.length} buổi tập`}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}