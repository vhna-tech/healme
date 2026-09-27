import { useState } from 'react'
import { Link } from 'react-router-dom'
import useLocalStorage from '../store/useLocalStorage.js'
import TimerPanel from '../components/TimerPanel.jsx'
import { unlockAudio } from '../components/sound.js'
import exercises from '../data/exercises.sample.json'
import { evaluateAdaptation } from '../logic/adaptive.js'
import { startTimer, countDone, countSetsDone, describeItem, buildLog, logsForAdaptation } from '../logic/workout.js'
import { toYmd, fmtDayMonth, parseYmd } from '../logic/dates.js'

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const PHASES = [
  ['warmup', 'Khởi động', '🔥'],
  ['main', 'Tập chính', '⚡'],
  ['cooldown', 'Thả lỏng', '🧘'],
]
const TIERS = { mini: 'Buổi ngắn', short: 'Buổi vừa', full: 'Buổi đầy đủ' }

const TYPE_CONFIG = {
  cardio: { label: 'Cardio', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: '🏃' },
  strength: { label: 'Sức mạnh', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🏋️' },
  hiit: { label: 'HIIT', bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: '⚡' },
  mobility: { label: 'Linh hoạt', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🤸' },
  stretch: { label: 'Giãn cơ', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: '🧘' },
}

const MUSCLE_NAMES = {
  full_body: 'Toàn thân',
  shoulders: 'Vai',
  back: 'Lưng',
  legs: 'Chân',
  glutes: 'Mông',
  chest: 'Ngực',
  core: 'Bụng & Lõi',
  hamstrings: 'Đùi sau',
  neck: 'Cổ',
}

const FEEDBACK = [
  { value: 'too_easy', label: 'Quá dễ', desc: 'Mình còn nhiều sức, tập rất thoải mái', icon: '🟢' },
  { value: 'just_right', label: 'Vừa sức', desc: 'Đủ mệt, hoàn thành tốt tất cả các bài', icon: '🟡' },
  { value: 'too_hard', label: 'Quá khó', desc: 'Rất mệt, không theo kịp hoặc đuối sức', icon: '🔴' },
]

const EX = Object.fromEntries(exercises.map((e) => [e.id, e]))

const primaryBtn = 'btn-tactile inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-center font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2'
const ghostBtn = 'btn-tactile inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'

const sessionTitle = (s) => `${DAY_NAMES[s.dayOfWeek - 1]} ${fmtDayMonth(parseYmd(s.date))}`

function SafetyBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 shadow-xs">
      <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <span className="font-bold">An toàn là trên hết: </span>
        Dừng lại ngay nếu bạn thấy đau nhói, chóng mặt, buồn nôn hoặc khó thở.
      </div>
    </div>
  )
}

function ExerciseDetails({ ex }) {
  const steps = ex?.steps ?? []
  const mistakes = ex?.commonMistakes ?? []
  const notes = ex?.safetyNotes ?? []

  return (
    <details className="group mt-3 text-xs sm:text-sm border-t border-slate-100 pt-2.5">
      <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-600 hover:text-emerald-700 select-none">
        <span className="inline-flex items-center gap-1.5">
          <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Hướng dẫn thực hiện & lưu ý an toàn
        </span>
        <svg className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="mt-3 space-y-3 pt-1 text-slate-700">
        {steps.length ? (
          <div className="space-y-1.5">
            <p className="font-bold text-slate-900">Các bước thực hiện:</p>
            <ol className="space-y-1.5 pl-1">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-slate-500 italic">Thực hiện đúng tư thế, giữ nhịp thở đều đặn.</p>
        )}

        {mistakes.length > 0 && (
          <div className="rounded-xl bg-orange-50/80 p-3 border border-orange-200/60">
            <p className="font-bold text-orange-950 flex items-center gap-1.5">
              <span>⚠️</span> Lỗi thường gặp:
            </p>
            <ul className="mt-1 space-y-1 pl-5 list-disc text-orange-900">
              {mistakes.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        <div className="rounded-xl bg-amber-50/80 p-3 border border-amber-200/60 text-amber-950">
          {notes.map((s, i) => <p key={i} className="font-medium">{s}</p>)}
          <p className="mt-1 text-xs text-amber-800">Dừng lại ngay nếu cảm thấy đau nhói hoặc khó chịu bất thường.</p>
        </div>
      </div>
    </details>
  )
}

// ---------- Màn hình chọn buổi tập ----------
function SessionPicker({ plan, logs, todayYmd, onStart }) {
  if (!plan) {
    return (
      <div className="card-hover mx-auto max-w-lg rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
          📅
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Bạn chưa có lịch tập</h1>
        <p className="text-sm text-slate-600">
          Hãy tạo lịch tuần để hệ thống tự động sắp xếp các bài tập phù hợp với thời gian rảnh của bạn.
        </p>
        <div className="pt-2">
          <Link to="/schedule" className={primaryBtn}>
            <span>Đến trang Lịch tuần</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    )
  }

  const todo = plan.sessions
    .filter((s) => !logs.some((l) => l.sessionDate === s.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  const today = todo.find((s) => s.date === todayYmd)
  const others = todo.filter((s) => s !== today)

  const renderSessionCard = (s, highlight) => (
    <li
      key={s.date}
      className={`card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 shadow-xs transition-all ${
        highlight
          ? 'border-emerald-500 bg-gradient-to-br from-emerald-50/60 to-white ring-1 ring-emerald-500/20 shadow-md shadow-emerald-500/10'
          : 'border-slate-200/80 bg-white'
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {highlight && (
            <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
              Hôm nay
            </span>
          )}
          <p className="font-extrabold text-slate-900">
            {sessionTitle(s)}
            {s.date < todayYmd && <span className="ml-1 text-xs font-semibold text-amber-600">(Có thể tập bù)</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-md">⏰ {s.startTime}</span>
          <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-md">⏱️ {s.minutes} phút</span>
          <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-md">📋 {TIERS[s.session.tier]}</span>
          <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-md">{s.session.items.length} bài</span>
        </div>
      </div>

      <button type="button" onClick={() => onStart(s)} className={`${primaryBtn} py-2.5 px-5 text-sm shrink-0`}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span>Bắt đầu</span>
      </button>
    </li>
  )

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Chọn buổi tập</h1>
        <p className="text-xs sm:text-sm text-slate-500">Chọn buổi tập trong lịch để bắt đầu bấm giờ và ghi nhận tiến độ.</p>
      </div>

      {today ? (
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700">Buổi tập đề xuất hôm nay</h2>
          <ul className="space-y-2">{renderSessionCard(today, true)}</ul>
        </section>
      ) : (
        todo.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs sm:text-sm text-slate-600">
            Hôm nay bạn không có lịch tập. Bạn có thể chọn tập trước một buổi bên dưới nếu rảnh!
          </div>
        )
      )}

      {others.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Các buổi khác trong tuần</h2>
          <ul className="space-y-2.5">{others.map((s) => renderSessionCard(s, false))}</ul>
        </section>
      )}

      {todo.length === 0 && (
        <div className="rounded-3xl border border-emerald-300 bg-emerald-50/80 p-6 text-center space-y-2">
          <span className="text-3xl">🎉</span>
          <h2 className="text-lg font-bold text-emerald-900">Chúc mừng! Bạn đã hoàn thành toàn bộ lịch tập tuần này.</h2>
          <p className="text-xs sm:text-sm text-emerald-800">Hãy tiếp tục duy trì thói quen tốt nhé!</p>
        </div>
      )}

      <div className="text-center pt-2">
        <Link to="/schedule" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
          <span>Xem chi tiết toàn bộ lịch tuần</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

// ---------- Màn hình kết quả sau khi lưu ----------
function DoneScreen({ result, onAnother }) {
  const { log, adaptation } = result
  const verdict = adaptation.delta > 0
    ? 'Tăng nhẹ độ khó cho các buổi sau'
    : adaptation.delta < 0
      ? 'Giảm nhẹ độ khó cho các buổi sau'
      : 'Giữ nguyên mức tập hiện tại'

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Hero card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20 text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl">
          🏆
        </div>
        <h1 className="text-2xl font-black">Hoàn thành buổi tập!</h1>
        <p className="text-sm font-medium text-emerald-50">
          Bạn đã hoàn thành <strong className="text-white font-bold">{log.completedCount}/{log.total} bài tập</strong> trong <strong className="text-white font-bold">{log.actualMinutes} phút</strong>.
        </p>
      </div>

      {/* Adaptive result box */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold text-sm">
            🤖
          </span>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Đánh giá thích ứng tự động</h2>
            <p className="font-extrabold text-slate-900">{verdict}</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 rounded-xl bg-slate-50 p-3.5 border border-slate-100 leading-relaxed">
          {adaptation.reason}
        </p>

        {adaptation.decision === 'hold' && adaptation.average === null && (
          <p className="text-xs text-slate-400">
            Hệ thống sẽ tiếp tục ghi nhận thêm 1–2 buổi phản hồi để tự động điều chỉnh chính xác nhất.
          </p>
        )}

        {adaptation.delta !== 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 font-medium">
            💡 Gợi ý: Hãy vào <b>Lịch tuần</b> và bấm &quot;Tạo lại lịch&quot; để áp dụng mức tải mới vào các buổi tập sắp tới.
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/schedule" className={`${primaryBtn} flex-1`}>
          <span>Xem lại lịch tuần</span>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
        <button type="button" onClick={onAnother} className={ghostBtn}>
          Tập thêm buổi khác
        </button>
      </div>
    </div>
  )
}

// ---------- Trang chính ----------
export default function Workout() {
  const [plan] = useLocalStorage('weekPlan', null)
  const [logs, setLogs] = useLocalStorage('logs', [])
  const [adapt, setAdapt] = useLocalStorage('adaptState', { step: 0, lastAdjustedLogId: null })
  const [active, setActive] = useLocalStorage('activeWorkout', null)
  const [soundOn, setSoundOn] = useLocalStorage('soundOn', true)
  const [timer, setTimer] = useState(null)
  const [stage, setStage] = useState('work') // 'work' | 'feedback' | 'done'
  const [feedback, setFeedback] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)

  const todayYmd = toYmd(new Date())

  if (stage === 'done' && result) {
    return <DoneScreen result={result} onAnother={() => { setStage('work'); setResult(null) }} />
  }

  function startSession(s) {
    setActive({ date: s.date, startedAt: Date.now(), session: s, progress: {} })
    setTimer(null)
    setStage('work')
    setFeedback('')
    setNote('')
  }

  if (!active) {
    return <SessionPicker plan={plan} logs={logs} todayYmd={todayYmd} onStart={startSession} />
  }

  const s = active.session
  const items = s.session.items
  const progress = active.progress
  const doneCount = countDone(items, progress)
  const setsDone = countSetsDone(progress)
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0

  const setSets = (id, n) => setActive({ ...active, progress: { ...progress, [id]: n } })

  function startRest(item, doneSets) {
    setTimer(startTimer(Date.now(), item.restSec, {
      kind: 'rest',
      exerciseId: item.exerciseId,
      label: `Nghỉ sau hiệp ${doneSets}/${item.sets}: ${item.name}`,
    }))
  }

  function completeSet(item) {
    const done = progress[item.exerciseId] ?? 0
    if (done >= item.sets) return
    unlockAudio()
    setSets(item.exerciseId, done + 1)
    if (done + 1 < item.sets) startRest(item, done + 1)
    else setTimer(null)
  }

  function startWork(item) {
    const done = progress[item.exerciseId] ?? 0
    unlockAudio()
    setTimer(startTimer(Date.now(), item.durationSec, {
      kind: 'work',
      exerciseId: item.exerciseId,
      label: `${item.name}: hiệp ${done + 1}/${item.sets}`,
    }))
  }

  function toggleItem(item) {
    const isDone = (progress[item.exerciseId] ?? 0) >= item.sets
    setSets(item.exerciseId, isDone ? 0 : item.sets)
    if (timer && timer.exerciseId === item.exerciseId) setTimer(null)
  }

  // Hết giờ đếm ngược tập → tự tính là xong hiệp đó và chuyển sang nghỉ
  function handleTimerEnd(t) {
    if (t.kind !== 'work') return
    const item = items.find((i) => i.exerciseId === t.exerciseId)
    if (item) completeSet(item)
  }

  function skipTimer(t) {
    if (t.kind === 'work') handleTimerEnd(t)
    else setTimer(null)
  }

  function cancelWorkout() {
    if (window.confirm('Huỷ buổi tập đang làm dở? Tiến độ này sẽ không được lưu.')) {
      setActive(null)
      setTimer(null)
    }
  }

  function saveWorkout() {
    const nowMs = Date.now()
    const log = buildLog({ session: s, progress, feedback, note, startedAtMs: active.startedAt, nowMs })
    const newLogs = [...logs, log]
    const adaptation = evaluateAdaptation(logsForAdaptation(newLogs), adapt)
    setLogs(newLogs)
    setAdapt(adaptation.state)
    setActive(null)
    setTimer(null)
    setResult({ log, adaptation })
    setStage('done')
  }

  // ---------- Bước đánh giá cảm nhận ----------
  if (stage === 'feedback') {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Buổi tập vừa rồi thế nào?</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Bạn đã hoàn thành <b>{doneCount}/{items.length} bài</b>. Hãy đánh giá cảm nhận thật lòng để BeHealthy điều chỉnh mức tập cho bạn.
          </p>
        </div>

        <div className="grid gap-3">
          {FEEDBACK.map((f) => {
            const isSelected = feedback === f.value
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setFeedback(f.value)}
                className={`btn-tactile flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500 font-semibold text-emerald-950 shadow-sm'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <span className="block font-bold text-slate-900">{f.label}</span>
                    <span className="block text-xs text-slate-500 font-normal">{f.desc}</span>
                  </div>
                </div>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                  {isSelected && '✓'}
                </div>
              </button>
            )
          })}
        </div>

        <div>
          <label htmlFor="note" className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">
            Ghi chú buổi tập (tuỳ chọn)
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="VD: Khởi động kỹ, hơi mỏi vai sau hiệp 3, tinh thần rất tốt..."
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setStage('work')} className={ghostBtn}>
            Quay lại
          </button>
          <button type="button" onClick={saveWorkout} disabled={!feedback} className={`${primaryBtn} flex-1`}>
            Lưu buổi tập
          </button>
        </div>
      </div>
    )
  }

  // ---------- Đang tập ----------
  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* Session Title & Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Buổi {sessionTitle(s)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {s.startTime} · {s.minutes} phút · {TIERS[s.session.tier]}
          </p>
        </div>
        <button
          type="button"
          onClick={cancelWorkout}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200"
        >
          Huỷ buổi
        </button>
      </div>

      <SafetyBanner />

      {/* Floating Timer Panel */}
      <TimerPanel timer={timer} soundOn={soundOn} onChange={setTimer} onFinish={handleTimerEnd} onSkip={skipTimer} />

      {/* Progress Bar Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-700">
          <span>Tiến độ buổi tập</span>
          <span className="font-bold text-emerald-600">{doneCount}/{items.length} bài ({percent}%)</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        
        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soundOn}
              onChange={(e) => setSoundOn(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Âm thanh thông báo hết giờ</span>
          </label>
          <span className="text-[11px] text-slate-400">Đã hoàn thành {setsDone} hiệp</span>
        </div>
      </div>

      {/* Exercise List Grouped by Phase */}
      <div className="space-y-6">
        {PHASES.map(([phase, title, icon]) => {
          const list = items.filter((i) => i.phase === phase)
          if (!list.length) return null

          return (
            <section key={phase} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">{title}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                  {list.length} bài
                </span>
              </div>

              <ol className="space-y-3">
                {list.map((item) => {
                  const ex = EX[item.exerciseId]
                  const done = progress[item.exerciseId] ?? 0
                  const finished = done >= item.sets
                  const running = timer && timer.kind === 'work' && timer.exerciseId === item.exerciseId
                  const typeInfo = TYPE_CONFIG[ex?.type] ?? { label: ex?.type ?? 'Tập', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: '⚡' }

                  return (
                    <li
                      key={item.exerciseId}
                      className={`card-hover rounded-2xl border p-4 shadow-xs transition-all ${
                        finished
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : running
                            ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/30'
                            : 'border-slate-200/80 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Checkbox */}
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={finished}
                            onChange={() => toggleItem(item)}
                            aria-label={`Hoàn thành tất cả hiệp của ${item.name}`}
                            className="h-6 w-6 rounded-lg border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                          />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${typeInfo.bg}`}>
                              <span>{typeInfo.icon}</span>
                              <span>{typeInfo.label}</span>
                            </span>
                            {ex?.primaryMuscle && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                {MUSCLE_NAMES[ex.primaryMuscle] ?? ex.primaryMuscle}
                              </span>
                            )}
                          </div>

                          <p className={`font-bold text-sm sm:text-base text-slate-900 ${finished ? 'text-emerald-800 line-through' : ''}`}>
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">{describeItem(item)}</p>

                          {/* Sets Tracker Pill */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              <span>Hiệp: </span>
                              <span className={done > 0 ? 'text-emerald-700' : 'text-slate-700'}>{done}</span>
                              <span className="text-slate-400">/{item.sets}</span>
                            </div>
                            {finished && (
                              <span className="text-xs font-bold text-emerald-600">✓ Đã xong</span>
                            )}
                          </div>

                          {/* Action Button for Current Set */}
                          {!finished && (
                            <div className="mt-3">
                              {item.durationSec != null ? (
                                <button
                                  type="button"
                                  disabled={running}
                                  onClick={() => startWork(item)}
                                  className={`${primaryBtn} py-2 px-4 text-xs sm:text-sm font-semibold min-h-[44px]`}
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                  <span>{running ? 'Đang bấm giờ...' : `Bắt đầu hiệp ${done + 1} (${item.durationSec}s)`}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => completeSet(item)}
                                  className={`${primaryBtn} py-2 px-4 text-xs sm:text-sm font-semibold min-h-[44px]`}
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Xong hiệp {done + 1}</span>
                                </button>
                              )}
                            </div>
                          )}

                          <ExerciseDetails ex={ex} />
                        </div>

                        {/* Exercise Illustration avatar */}
                        {ex?.image ? (
                          <img src={ex.image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-slate-200" />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-xl font-black text-slate-400 border border-slate-200/60"
                          >
                            {typeInfo.icon}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="sticky bottom-20 z-20 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md md:bottom-6">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => setStage('feedback')}
            disabled={setsDone === 0}
            className={`${primaryBtn} w-full sm:flex-1 text-base py-3.5`}
          >
            <span>Kết thúc buổi tập</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
        {setsDone === 0 && (
          <p className="mt-2 text-center text-xs text-slate-500">
            Hãy hoàn thành ít nhất 1 hiệp để mở khoá kết thúc buổi tập.
          </p>
        )}
      </div>
    </div>
  )
}