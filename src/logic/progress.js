// Thống kê tiến độ: chuỗi tuần, số buổi mỗi tuần, cân nặng.
// Mọi ngày đều là chuỗi 'YYYY-MM-DD' theo GIỜ ĐỊA PHƯƠNG (xem dates.js).
import { toYmd, parseYmd, mondayOf, addDays, fmtDayMonth } from './dates.js'

// Một buổi chỉ được tính là "buổi tập" khi làm xong ít nhất một nửa số bài.
// (Cùng ngưỡng với lớp bảo vệ ở logsForAdaptation trong workout.js)
export const MIN_COMPLETION = 0.5

export const isQualifying = (log) => log.total > 0 && log.completedCount / log.total >= MIN_COMPLETION

/** 'YYYY-MM-DD' → ngày thứ Hai của tuần chứa ngày đó */
export const weekKey = (ymd) => toYmd(mondayOf(parseYmd(ymd)))

/** { [thứ Hai của tuần]: { sessions, minutes } } — sessions chỉ đếm buổi đạt ngưỡng, minutes đếm mọi buổi */
export function weeklyStats(logs) {
  const map = {}
  for (const l of logs) {
    const w = (map[weekKey(l.doneDate)] ??= { sessions: 0, minutes: 0 })
    if (isQualifying(l)) w.sessions += 1
    w.minutes += l.actualMinutes ?? 0
  }
  return map
}

/**
 * Chuỗi tuần = số tuần LIÊN TIẾP (thứ Hai → Chủ nhật) tập đủ `goal` buổi.
 * - Tuần hiện tại chưa đủ buổi thì chưa làm đứt chuỗi (vẫn còn thời gian), nhưng cũng chưa được cộng.
 * - Tuần không có buổi nào thì làm đứt chuỗi.
 */
export function computeStreaks(logs, goal, todayYmd) {
  const g = Math.max(1, Number(goal) || 1)
  const stats = weeklyStats(logs)
  const count = (k) => stats[k]?.sessions ?? 0
  const met = (k) => count(k) >= g
  const thisWeek = weekKey(todayYmd)

  const keys = Object.keys(stats).sort()
  let longest = 0
  if (keys.length) {
    const last = keys[keys.length - 1] > thisWeek ? keys[keys.length - 1] : thisWeek
    let run = 0
    for (let d = parseYmd(keys[0]); toYmd(d) <= last; d = addDays(d, 7)) {
      if (met(toYmd(d))) {
        run += 1
        longest = Math.max(longest, run)
      } else {
        run = 0
      }
    }
  }

  let current = 0
  let d = parseYmd(thisWeek)
  if (!met(thisWeek)) d = addDays(d, -7) // tuần này chưa đủ: chuỗi tính đến tuần trước
  while (met(toYmd(d))) {
    current += 1
    d = addDays(d, -7)
  }

  return {
    current,
    longest,
    thisWeek: { count: count(thisWeek), goal: g, met: met(thisWeek) },
    totalSessions: logs.filter(isQualifying).length,
    totalMinutes: logs.reduce((s, l) => s + (l.actualMinutes ?? 0), 0),
  }
}

/** `n` tuần gần nhất (cũ → mới), kể cả tuần không tập (giá trị 0). */
export function weeklySeries(logs, todayYmd, n = 8) {
  const stats = weeklyStats(logs)
  const thisMonday = parseYmd(weekKey(todayYmd))
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const monday = addDays(thisMonday, -7 * i)
    const k = toYmd(monday)
    out.push({ weekStart: k, label: fmtDayMonth(monday), sessions: stats[k]?.sessions ?? 0, minutes: stats[k]?.minutes ?? 0 })
  }
  return out
}

// ---------- Cân nặng ----------

export function validateWeight(kg) {
  const n = Number(kg)
  if (kg === '' || kg == null || !(n >= 20 && n <= 300)) return 'Cân nặng cần từ 20 đến 300 kg.'
  return ''
}

/** Mỗi ngày chỉ giữ một số cân: ghi lại cùng ngày sẽ thay số cũ. Kết quả sắp theo ngày tăng dần. */
export function upsertWeight(list, date, kg) {
  const entry = { date, kg: Math.round(Number(kg) * 10) / 10 }
  return [...list.filter((w) => w.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date))
}

export const removeWeight = (list, date) => list.filter((w) => w.date !== date)

/** Thay đổi từ lần cân đầu đến lần cân gần nhất (null nếu chưa đủ 2 lần) */
export function weightChange(list) {
  if (list.length < 2) return null
  const first = list[0]
  const last = list[list.length - 1]
  return { from: first.kg, to: last.kg, diff: Math.round((last.kg - first.kg) * 10) / 10 }
}