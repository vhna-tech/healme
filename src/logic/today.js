// Quyết định Trang chủ nên hiện gì hôm nay. Hàm thuần: không đọc localStorage, không dùng giờ hệ thống.
import { toYmd, parseYmd, addDays } from './dates.js'

/** Số ngày từ ngày `fromYmd` đến ngày `toYmdStr` (làm tròn để không lệch khi đổi giờ mùa hè) */
export const diffDays = (fromYmd, toYmdStr) => Math.round((parseYmd(toYmdStr) - parseYmd(fromYmd)) / 86400000)

/**
 * kind:
 *  'welcome' : chưa có hồ sơ (người dùng mới)
 *  'active'  : đang có buổi tập làm dở → mời tiếp tục
 *  'setup'   : có hồ sơ nhưng chưa có lịch còn hiệu lực → hướng dẫn bước tiếp theo
 *  'today'   : hôm nay có buổi tập chưa làm
 *  'done'    : hôm nay đã tập xong
 *  'rest'    : hôm nay không có buổi tập
 */
export function getTodayState({ profile, busySlots, plan, logs = [], active, todayYmd }) {
  if (!profile) return { kind: 'welcome' }

  const lastDone = logs.reduce((m, l) => (l.doneDate > m ? l.doneDate : m), '')
  const base = {
    needsDoctorCheck: !!profile.needsDoctorCheck,
    daysSinceLast: lastDone ? Math.max(0, diffDays(lastDone, todayYmd)) : null,
  }

  if (active) return { ...base, kind: 'active', session: active.session }

  const planCurrent = !!plan && toYmd(addDays(parseYmd(plan.weekStart), 6)) >= todayYmd
  if (!planCurrent) {
    return {
      ...base,
      kind: 'setup',
      expired: !!plan,
      checklist: { hasBusy: busySlots != null, hasPlan: false, hasLogs: logs.length > 0 },
    }
  }

  const isDone = (s) => logs.some((l) => l.sessionDate === s.date)
  const sessions = [...plan.sessions].sort((a, b) => a.date.localeCompare(b.date))
  const today = sessions.find((s) => s.date === todayYmd)
  const next = sessions.find((s) => !isDone(s) && s.date > todayYmd) ?? null
  // Buổi chưa tập gần nhất trong 7 ngày qua (để mời tập bù, không trách móc)
  const missed = [...sessions].reverse().find((s) => {
    const ago = diffDays(s.date, todayYmd)
    return !isDone(s) && ago >= 1 && ago <= 7
  }) ?? null

  return {
    ...base,
    kind: !today ? 'rest' : isDone(today) ? 'done' : 'today',
    session: today ?? null,
    next,
    missed,
    planStartsLater: plan.weekStart > todayYmd,
  }
}

/**
 * Các bài trong một buổi tập mà chấn thương HIỆN TẠI của người dùng chống chỉ định.
 * Cần thiết vì hồ sơ có thể đã đổi SAU khi lịch được tạo.
 * Bài không còn trong kho hoặc chưa gắn nhãn an toàn cũng bị coi là không an toàn (giống lọc cứng).
 * @returns mảng tên bài không phù hợp (rỗng nếu buổi tập an toàn)
 */
export function unsafeItems(session, injuries = [], exercises = []) {
  const bad = new Set(injuries)
  const byId = Object.fromEntries(exercises.map((e) => [e.id, e]))
  return session.session.items
    .filter((i) => {
      const ex = byId[i.exerciseId]
      return !ex || !Array.isArray(ex.avoidIfInjury) || ex.avoidIfInjury.some((x) => bad.has(x))
    })
    .map((i) => i.name)
}