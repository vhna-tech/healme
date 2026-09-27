import { useState } from 'react'
import { Link } from 'react-router-dom'
import useLocalStorage from '../store/useLocalStorage.js'
import exercises from '../data/exercises.sample.json'
import { scheduleWeek } from '../logic/scheduler.js'
import { mondayOf, addDays, toYmd, parseYmd, fmtDayMonth } from '../logic/dates.js'

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const PHASES = [
  ['warmup', 'Khởi động', '🔥'],
  ['main', 'Tập chính', '⚡'],
  ['cooldown', 'Thả lỏng', '🧘'],
]
const TIERS = { mini: 'Buổi ngắn', short: 'Buổi vừa', full: 'Buổi đầy đủ' }
const INJURY_LABELS = {
  lower_back: 'Đau lưng dưới',
  knee: 'Đau gối',
  shoulder: 'Đau vai',
  wrist: 'Đau cổ tay',
  ankle: 'Đau cổ chân',
  neck: 'Đau cổ',
}
const NAME = Object.fromEntries(exercises.map((e) => [e.id, e.name]))

function describeItem(i) {
  const amount = i.reps != null ? `${i.reps} lần` : `${i.durationSec} giây`
  const rest = i.sets > 1 ? ` · nghỉ ${i.restSec}s` : ''
  return `${i.sets} hiệp × ${amount}${rest}`
}

export default function WeekPlan() {
  const [profile] = useLocalStorage('profile', null)
  const [busySlots] = useLocalStorage('busySlots', null)
  const [adapt] = useLocalStorage('adaptState', { step: 0, lastAdjustedLogId: null })
  const [plan, setPlan] = useLocalStorage('weekPlan', null)
  const [error, setError] = useState('')

  const today = new Date()
  const thisMonday = mondayOf(today)
  const nextMonday = addDays(thisMonday, 7)
  const [which, setWhich] = useState(() => (plan && plan.weekStart === toYmd(nextMonday) ? 'next' : 'this'))
  const weekStart = toYmd(which === 'next' ? nextMonday : thisMonday)
  const step = adapt?.step ?? 0

  if (!profile) {
    return (
      <section className="card-hover rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
          👤
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Bạn chưa thiết lập hồ sơ</h2>
        <p className="mx-auto max-w-md text-xs sm:text-sm text-slate-600">
          Hãy hoàn thành hồ sơ thể trạng (mục tiêu, trình độ, chấn thương...) để hệ thống tính toán lịch tập an toàn và tối ưu cho bạn.
        </p>
        <div className="pt-2">
          <Link
            to="/onboarding"
            className="btn-tactile inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
          >
            <span>Tạo hồ sơ ngay</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </section>
    )
  }

  const inputsKey = JSON.stringify([profile, busySlots ?? [], step, weekStart])
  const stale = plan && plan.inputsKey !== inputsKey

  function generate() {
    setError('')
    try {
      const r = scheduleWeek({
        profile,
        busySlots: busySlots ?? [],
        exercises,
        weekStart,
        loadStep: step,
      })
      setPlan({
        weekStart,
        generatedAt: new Date().toISOString(),
        inputsKey,
        sessions: r.sessions,
        warnings: r.warnings,
        excluded: r.excluded.map((x) => ({ id: x.exercise.id, name: x.exercise.name, reason: x.reason })),
      })
    } catch (e) {
      setError(`Không tạo được lịch: ${e.message}`)
    }
  }

  const todayYmd = toYmd(today)
  const planMonday = plan ? parseYmd(plan.weekStart) : null

  // Gom các bài bị loại vì chấn thương
  const byInjury = {}
  for (const x of plan?.excluded ?? []) {
    if (x.reason === 'chưa gắn nhãn an toàn') continue
    ;(byInjury[x.reason] ??= []).push(x.name)
  }

  const weekBtn = (value, label, monday) => {
    const isSelected = which === value
    return (
      <button
        type="button"
        onClick={() => setWhich(value)}
        aria-pressed={isSelected}
        className={`btn-tactile flex-1 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all min-h-[44px] ${
          isSelected
            ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/60'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {label} ({fmtDayMonth(monday)} – {fmtDayMonth(addDays(monday, 6))})
      </button>
    )
  }

  return (
    <section className="space-y-6">
      {/* Top Controls & Alerts */}
      <div className="space-y-4">
        {profile.needsDoctorCheck && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 shadow-xs">
            <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-bold">Lưu ý sức khoẻ: </span>
              Bạn có câu trả lời &quot;Có&quot; ở phần sàng lọc. Hãy hỏi ý kiến bác sĩ trước khi tập theo lịch này.
            </div>
          </div>
        )}

        {busySlots === null && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 shadow-xs">
            <span className="text-lg">⏰</span>
            <div>
              <span>Bạn chưa lưu lịch bận. Nếu tạo lịch ngay, hệ thống sẽ coi như bạn rảnh cả tuần. </span>
              <a href="#busy" className="font-bold text-amber-900 underline hover:text-amber-950">
                Khai báo lịch bận ngay bên dưới
              </a>
            </div>
          </div>
        )}

        {/* Week Toggle Switch */}
        <div className="flex rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/60">
          {weekBtn('this', 'Tuần này', thisMonday)}
          {weekBtn('next', 'Tuần sau', nextMonday)}
        </div>

        {step !== 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-800 border border-purple-100">
            <span>🤖</span>
            <span>Mức tải tự động: <strong>{step > 0 ? `+${step}` : step} bậc</strong> (dựa trên phản hồi gần nhất của bạn)</span>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={generate}
          className="btn-tactile flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 min-h-[48px]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{plan ? 'Tạo lại lịch tuần' : 'Tạo lịch tuần tự động'}</span>
        </button>

        {error && (
          <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-xs sm:text-sm font-medium text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {stale && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 font-medium">
            ⚠️ Hồ sơ, giờ bận hoặc tuần đã chọn có thay đổi. Hãy bấm &quot;Tạo lại lịch&quot; để áp dụng các thay đổi mới nhất.
          </div>
        )}
      </div>

      {/* Generated Plan Content */}
      {plan && (
        <div className="space-y-6">
          {plan.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 space-y-1">
              <p className="font-bold">Lưu ý khi xếp lịch:</p>
              <ul className="space-y-1 pl-4 list-disc text-amber-900">
                {plan.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Daily list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Chi tiết lịch từng ngày</h3>
              <span className="text-xs font-semibold text-slate-600">{plan.sessions.length} buổi tập</span>
            </div>

            <ul className="space-y-3">
              {DAY_NAMES.map((dayName, i) => {
                const date = addDays(planMonday, i)
                const dateYmd = toYmd(date)
                const isToday = dateYmd === todayYmd
                const past = dateYmd < todayYmd
                const s = plan.sessions.find((x) => x.dayOfWeek === i + 1)

                return (
                  <li
                    key={dayName}
                    className={`card-hover rounded-2xl border p-5 shadow-xs transition-all ${
                      isToday
                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-50/60 to-white ring-2 ring-emerald-500/20'
                        : past
                          ? 'border-slate-200/60 bg-slate-50/70 opacity-70'
                          : 'border-slate-200/80 bg-white'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900">{dayName}</span>
                        <span className="text-xs font-semibold text-slate-600">{fmtDayMonth(date)}</span>
                        {isToday && (
                          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            Hôm nay
                          </span>
                        )}
                      </div>
                      {past && (
                        <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          Đã qua
                        </span>
                      )}
                    </div>

                    {/* Workout Details or Rest */}
                    {s ? (
                      <div className="mt-3 space-y-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            ⏰ {s.startTime}–{s.endTime}
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            ⏱️ {s.minutes} phút
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            📋 {TIERS[s.session.tier]}
                          </span>
                        </div>

                        {/* Phases */}
                        <div className="space-y-3 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
                          {PHASES.map(([phase, title, icon]) => {
                            const items = s.session.items.filter((it) => it.phase === phase)
                            if (!items.length) return null

                            return (
                              <div key={phase} className="space-y-1.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                                  <span>{icon}</span> {title}
                                </p>
                                <ol className="space-y-1.5 text-xs sm:text-sm pl-1">
                                  {items.map((it) => (
                                    <li key={it.exerciseId} className="flex flex-col text-slate-700">
                                      <div className="flex items-baseline justify-between gap-2">
                                        <span className="font-semibold text-slate-900">• {it.name}</span>
                                        <span className="text-xs text-slate-500 font-medium shrink-0">
                                          {describeItem(it)}
                                        </span>
                                      </div>
                                      {it.replacedFrom && (
                                        <span className="text-[11px] text-amber-700 pl-3">
                                          ↳ Bản nhẹ hơn thay cho &quot;{NAME[it.replacedFrom] ?? it.replacedFrom}&quot;
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500">
                        <span>🌿</span>
                        <span>Ngày nghỉ ngơi phục hồi cơ bắp</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Excluded Exercises Disclosure */}
          {Object.keys(byInjury).length > 0 && (
            <details className="group rounded-2xl border border-slate-200/80 bg-white p-4 text-xs sm:text-sm shadow-xs">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-700 select-none">
                <span className="flex items-center gap-2">
                  <span>🛡️</span> Vì sao một số bài không xuất hiện trong lịch?
                </span>
                <svg className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 space-y-2 pt-1 text-slate-600">
                {Object.entries(byInjury).map(([inj, names]) => (
                  <div key={inj} className="rounded-xl bg-amber-50/60 p-3 border border-amber-200/40">
                    Vì bạn chọn <strong className="text-amber-950">{INJURY_LABELS[inj] ?? inj}</strong>, hệ thống đã loại bỏ: {names.join(', ')}.
                  </div>
                ))}
                <p className="text-[11px] text-slate-400 pt-1">
                  Ngoài ra, các bài tập yêu cầu dụng cụ bạn không có hoặc vượt quá thể trạng cũng sẽ tự động được lọc bỏ.
                </p>
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}