import { describe, it, expect } from 'vitest'
import {
  isQualifying, weekKey, weeklyStats, computeStreaks, weeklySeries,
  validateWeight, upsertWeight, removeWeight, weightChange,
} from './progress.js'
import { evaluateBadges, BADGES } from './badges.js'

// Hôm nay = Thứ Tư 23/09/2026 → tuần này bắt đầu 21/09
const TODAY = '2026-09-23'
const mk = (doneDate, over = {}) => ({ id: `${doneDate}-${Math.random()}`, doneDate, completedCount: 4, total: 4, actualMinutes: 30, feedback: 'just_right', ...over })
// n buổi trong tuần bắt đầu từ `monday`
const week = (monday, n, over) => Array.from({ length: n }, (_, i) => {
  const [y, m, d] = monday.split('-').map(Number)
  const dt = new Date(y, m - 1, d + i)
  return mk(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`, over)
})

describe('Buổi tập hợp lệ và gom theo tuần', () => {
  it('cần làm xong ít nhất một nửa số bài', () => {
    expect(isQualifying({ completedCount: 2, total: 4 })).toBe(true)
    expect(isQualifying({ completedCount: 1, total: 4 })).toBe(false)
    expect(isQualifying({ completedCount: 0, total: 0 })).toBe(false)
  })
  it('tuần bắt đầu từ thứ Hai, Chủ nhật vẫn thuộc tuần đó', () => {
    expect(weekKey('2026-09-27')).toBe('2026-09-21')
    expect(weekKey('2026-09-21')).toBe('2026-09-21')
    expect(weekKey('2026-09-28')).toBe('2026-09-28')
  })
  it('đếm buổi (chỉ buổi hợp lệ) và phút (mọi buổi)', () => {
    const s = weeklyStats([mk('2026-09-21'), mk('2026-09-22', { completedCount: 1 })])
    expect(s['2026-09-21']).toEqual({ sessions: 1, minutes: 60 })
  })
})

describe('Chuỗi tuần', () => {
  it('chưa có nhật ký → 0', () => {
    expect(computeStreaks([], 3, TODAY)).toMatchObject({ current: 0, longest: 0, totalSessions: 0, totalMinutes: 0, thisWeek: { count: 0, goal: 3, met: false } })
  })
  it('tuần này đủ buổi → chuỗi 1', () => {
    const r = computeStreaks(week('2026-09-21', 3), 3, TODAY)
    expect(r).toMatchObject({ current: 1, longest: 1 })
    expect(r.thisWeek).toEqual({ count: 3, goal: 3, met: true })
  })
  it('tuần này chưa đủ thì KHÔNG làm đứt chuỗi (tính đến tuần trước)', () => {
    const logs = [...week('2026-08-31', 3), ...week('2026-09-07', 3), ...week('2026-09-14', 3), ...week('2026-09-21', 1)]
    expect(computeStreaks(logs, 3, TODAY)).toMatchObject({ current: 3, longest: 3 })
  })
  it('tuần này đủ thì cộng thêm vào chuỗi', () => {
    const logs = [...week('2026-09-07', 3), ...week('2026-09-14', 3), ...week('2026-09-21', 3)]
    expect(computeStreaks(logs, 3, TODAY)).toMatchObject({ current: 3, longest: 3 })
  })
  it('bỏ lỡ một tuần thì chuỗi hiện tại về lại, chuỗi dài nhất vẫn giữ', () => {
    // 2 tuần đạt (24/8, 31/8) → tuần 7/9 bỏ lỡ → tuần 14/9 đạt → tuần này chưa đủ
    const logs = [...week('2026-08-24', 3), ...week('2026-08-31', 3), ...week('2026-09-07', 1), ...week('2026-09-14', 3)]
    expect(computeStreaks(logs, 3, TODAY)).toMatchObject({ current: 1, longest: 2 })
  })
  it('tuần trống hoàn toàn làm đứt chuỗi', () => {
    const logs = [...week('2026-08-31', 3), ...week('2026-09-14', 3)] // thiếu tuần 7/9
    expect(computeStreaks(logs, 3, TODAY)).toMatchObject({ current: 1, longest: 1 })
  })
  it('buổi làm dở không được tính', () => {
    const logs = week('2026-09-21', 3, { completedCount: 1 })
    expect(computeStreaks(logs, 3, TODAY)).toMatchObject({ current: 0, totalSessions: 0 })
  })
  it('mục tiêu 2 buổi/tuần, và mục tiêu không hợp lệ được coi là 1', () => {
    expect(computeStreaks(week('2026-09-21', 2), 2, TODAY).current).toBe(1)
    expect(computeStreaks(week('2026-09-21', 1), undefined, TODAY).current).toBe(1)
    expect(computeStreaks(week('2026-09-21', 1), 0, TODAY).current).toBe(1)
  })
  it('người tập 3 buổi/tuần vẫn có chuỗi dài (khác chuỗi "ngày liên tiếp" không thể đạt)', () => {
    const logs = ['08-03', '08-10', '08-17', '08-24', '08-31', '09-07', '09-14'].flatMap((m) => week(`2026-${m}`, 3))
    expect(computeStreaks(logs, 3, TODAY).current).toBe(7)
  })
})

describe('Chuỗi số liệu cho biểu đồ', () => {
  it('trả về đúng 8 tuần cũ → mới, tuần trống có giá trị 0', () => {
    const s = weeklySeries(week('2026-09-21', 2), TODAY, 8)
    expect(s).toHaveLength(8)
    expect(s[7]).toMatchObject({ weekStart: '2026-09-21', label: '21/09', sessions: 2, minutes: 60 })
    expect(s[0]).toMatchObject({ weekStart: '2026-08-03', sessions: 0, minutes: 0 })
  })
})

describe('Cân nặng', () => {
  it('kiểm tra hợp lệ', () => {
    expect(validateWeight('58')).toBe('')
    expect(validateWeight('')).not.toBe('')
    expect(validateWeight('5')).not.toBe('')
    expect(validateWeight('400')).not.toBe('')
    expect(validateWeight('abc')).not.toBe('')
  })
  it('cùng ngày thì thay số cũ, luôn sắp theo ngày', () => {
    let l = upsertWeight([], '2026-09-20', 60)
    l = upsertWeight(l, '2026-09-10', 61.26)
    l = upsertWeight(l, '2026-09-20', 59.5)
    expect(l).toEqual([{ date: '2026-09-10', kg: 61.3 }, { date: '2026-09-20', kg: 59.5 }])
  })
  it('xoá và tính thay đổi', () => {
    const l = [{ date: '2026-09-01', kg: 62 }, { date: '2026-09-20', kg: 60.5 }]
    expect(weightChange(l)).toEqual({ from: 62, to: 60.5, diff: -1.5 })
    expect(weightChange(l.slice(0, 1))).toBeNull()
    expect(removeWeight(l, '2026-09-01')).toHaveLength(1)
  })
})

describe('Huy hiệu', () => {
  const stats = (o) => ({ totalSessions: 0, longest: 0, ...o })
  it('chưa làm gì → chưa mở khoá cái nào', () => {
    expect(evaluateBadges(stats({})).every((b) => !b.earned)).toBe(true)
  })
  it('theo tổng số buổi', () => {
    const r = evaluateBadges(stats({ totalSessions: 5 }))
    expect(r.filter((b) => b.earned).map((b) => b.id)).toEqual(['first', 'w5'])
    expect(r.find((b) => b.id === 'w10')).toMatchObject({ earned: false, current: 5 })
  })
  it('theo chuỗi tuần dài nhất từng đạt (huy hiệu đã mở không bị mất khi đứt chuỗi)', () => {
    const r = evaluateBadges(stats({ longest: 4 }))
    expect(r.filter((b) => b.earned).map((b) => b.id)).toEqual(['s1', 's2', 's4'])
    expect(r.find((b) => b.id === 's8')).toMatchObject({ earned: false, current: 4, value: 8 })
  })
  it('mỗi huy hiệu có đủ thông tin', () => {
    for (const b of BADGES) expect(b).toMatchObject({ id: expect.any(String), title: expect.any(String), value: expect.any(Number) })
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length)
  })
})