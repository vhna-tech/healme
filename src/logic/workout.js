// Logic cho màn hình tập: đồng hồ đếm ngược, tiến độ, và tạo nhật ký buổi tập.
import { toYmd } from './dates.js'

// ---------- Đồng hồ: tính theo MỐC THỜI GIAN THỰC (Date.now), không cộng dồn ----------
// Nhờ vậy khi chuyển tab hoặc khoá màn hình, đồng hồ vẫn đúng khi quay lại.

/** Bắt đầu đếm ngược `durationSec` giây tính từ `nowMs`. `meta` là thông tin kèm theo (loại, nhãn...). */
export function startTimer(nowMs, durationSec, meta = {}) {
  return { ...meta, durationSec, endAt: nowMs + durationSec * 1000, paused: false, remainingMs: null }
}

/** Số mili-giây còn lại. */
export function remainingMs(t, nowMs) {
  return t.paused ? t.remainingMs : Math.max(0, t.endAt - nowMs)
}

export const isFinished = (t, nowMs) => !t.paused && nowMs >= t.endAt

export function pauseTimer(t, nowMs) {
  return t.paused ? t : { ...t, paused: true, remainingMs: remainingMs(t, nowMs) }
}

export function resumeTimer(t, nowMs) {
  return t.paused ? { ...t, paused: false, endAt: nowMs + t.remainingMs, remainingMs: null } : t
}

/** Cộng thêm giây (dùng cho nút "+15 giây" khi nghỉ). */
export function addSeconds(t, nowMs, sec) {
  if (t.paused) return { ...t, remainingMs: t.remainingMs + sec * 1000 }
  return { ...t, endAt: Math.max(t.endAt, nowMs) + sec * 1000 }
}

/** 65000 ms → "1:05" (làm tròn lên để không hiện 0:00 khi còn vài trăm ms) */
export function formatClock(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ---------- Tiến độ buổi tập ----------
// progress = { [exerciseId]: số hiệp đã xong }

export const countDone = (items, progress) =>
  items.filter((i) => (progress[i.exerciseId] ?? 0) >= i.sets).length

export const countSetsDone = (progress) => Object.values(progress).reduce((s, n) => s + n, 0)

/** "2 hiệp × 10 lần · nghỉ 60 giây" */
export function describeItem(i) {
  const amount = i.reps != null ? `${i.reps} lần` : `${i.durationSec} giây`
  const rest = i.sets > 1 ? ` · nghỉ ${i.restSec} giây` : ''
  return `${i.sets} hiệp × ${amount}${rest}`
}

// ---------- Nhật ký ----------

/**
 * Tạo bản ghi nhật ký cho một buổi tập.
 * @param session   phần tử của weekPlan.sessions
 * @param progress  { [exerciseId]: số hiệp đã xong }
 */
export function buildLog({ session, progress, feedback, note = '', startedAtMs, nowMs }) {
  const items = session.session.items
  const exercises = items.map((i) => ({
    exerciseId: i.exerciseId,
    name: i.name,
    phase: i.phase,
    sets: i.sets,
    setsDone: Math.min(progress[i.exerciseId] ?? 0, i.sets),
  }))
  return {
    id: `log_${nowMs}`,
    sessionDate: session.date,                 // ngày buổi tập được xếp trong lịch
    doneDate: toYmd(new Date(nowMs)),          // ngày thực tế tập (giờ địa phương), dùng cho streak
    startedAt: new Date(startedAtMs).toISOString(),
    completedAt: new Date(nowMs).toISOString(),
    plannedMinutes: session.minutes,
    actualMinutes: Math.max(1, Math.round((nowMs - startedAtMs) / 60000)),
    feedback,
    note: note.trim(),
    exercises,
    completedCount: exercises.filter((e) => e.setsDone >= e.sets).length,
    total: items.length,
  }
}

/**
 * Đầu vào cho thuật toán điều chỉnh độ khó.
 * Buổi mới làm dưới một nửa số bài mà chấm "Quá dễ" thì không đáng tin → tính là "Vừa sức".
 * (Chấm "Quá khó" khi bỏ dở thì giữ nguyên, vì đó là tín hiệu quan trọng.)
 */
export function logsForAdaptation(logs) {
  return logs.map((l) =>
    l.feedback === 'too_easy' && l.total > 0 && l.completedCount / l.total < 0.5
      ? { ...l, feedback: 'just_right' }
      : l,
  )
}