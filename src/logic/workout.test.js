import { describe, it, expect } from 'vitest'
import {
  startTimer, remainingMs, isFinished, pauseTimer, resumeTimer, addSeconds, formatClock,
  countDone, countSetsDone, describeItem, buildLog, logsForAdaptation,
} from './workout.js'

describe('Đồng hồ đếm ngược', () => {
  it('đếm đúng theo mốc thời gian thực', () => {
    const t = startTimer(1000, 30)
    expect(remainingMs(t, 1000)).toBe(30000)
    expect(remainingMs(t, 11000)).toBe(20000)
    expect(isFinished(t, 30999)).toBe(false)
    expect(isFinished(t, 31000)).toBe(true)
    expect(remainingMs(t, 99999)).toBe(0)
  })
  it('tạm dừng thì đứng yên, tiếp tục thì chạy tiếp từ chỗ cũ', () => {
    let t = startTimer(0, 30)
    t = pauseTimer(t, 10000)
    expect(remainingMs(t, 50000)).toBe(20000)
    expect(isFinished(t, 999999)).toBe(false)
    t = resumeTimer(t, 60000)
    expect(remainingMs(t, 65000)).toBe(15000)
    expect(isFinished(t, 80000)).toBe(true)
  })
  it('cộng thêm giây (đang chạy và đang tạm dừng)', () => {
    expect(remainingMs(addSeconds(startTimer(0, 30), 10000, 15), 10000)).toBe(35000)
    expect(remainingMs(addSeconds(pauseTimer(startTimer(0, 30), 10000), 10000, 15), 99999)).toBe(35000)
  })
  it('định dạng mm:ss, làm tròn lên', () => {
    expect(formatClock(65000)).toBe('1:05')
    expect(formatClock(30000)).toBe('0:30')
    expect(formatClock(200)).toBe('0:01')
    expect(formatClock(0)).toBe('0:00')
  })
  it('giữ nguyên thông tin kèm theo', () => {
    expect(startTimer(0, 5, { kind: 'rest', exerciseId: 'x' })).toMatchObject({ kind: 'rest', exerciseId: 'x' })
  })
})

const session = {
  date: '2026-09-23', minutes: 40,
  session: { items: [
    { exerciseId: 'a', name: 'A', phase: 'main', sets: 2, reps: 10, restSec: 60 },
    { exerciseId: 'b', name: 'B', phase: 'main', sets: 1, durationSec: 30, restSec: 10 },
    { exerciseId: 'c', name: 'C', phase: 'cooldown', sets: 2, durationSec: 30, restSec: 10 },
  ] },
}

describe('Tiến độ và nhật ký', () => {
  const items = session.session.items
  it('đếm bài đã xong và số hiệp', () => {
    expect(countDone(items, {})).toBe(0)
    expect(countDone(items, { a: 2, b: 1, c: 1 })).toBe(2)
    expect(countSetsDone({ a: 2, b: 1 })).toBe(3)
  })
  it('mô tả bài', () => {
    expect(describeItem(items[0])).toBe('2 hiệp × 10 lần · nghỉ 60 giây')
    expect(describeItem(items[1])).toBe('1 hiệp × 30 giây')
  })
  it('tạo nhật ký đúng: số bài xong, phút thực tế, ngày theo giờ địa phương', () => {
    const start = new Date(2026, 8, 23, 23, 40).getTime()
    const end = new Date(2026, 8, 23, 23, 58).getTime()
    const log = buildLog({ session, progress: { a: 2, b: 1, c: 1 }, feedback: 'just_right', note: '  mệt  ', startedAtMs: start, nowMs: end })
    expect(log).toMatchObject({
      sessionDate: '2026-09-23', doneDate: '2026-09-23', plannedMinutes: 40, actualMinutes: 18,
      feedback: 'just_right', note: 'mệt', completedCount: 2, total: 3,
    })
    expect(log.exercises.find((e) => e.exerciseId === 'c')).toMatchObject({ sets: 2, setsDone: 1 })
    expect(typeof log.id).toBe('string')
  })
  it('phút thực tế tối thiểu là 1, số hiệp không vượt quá kế hoạch', () => {
    const log = buildLog({ session, progress: { a: 99 }, feedback: 'just_right', startedAtMs: 1000, nowMs: 2000 })
    expect(log.actualMinutes).toBe(1)
    expect(log.exercises[0].setsDone).toBe(2)
  })
  it('"Quá dễ" khi làm dưới một nửa số bài → tính là "Vừa sức" cho thuật toán', () => {
    const partial = { feedback: 'too_easy', completedCount: 1, total: 4 }
    const full = { feedback: 'too_easy', completedCount: 4, total: 4 }
    const hardPartial = { feedback: 'too_hard', completedCount: 1, total: 4 }
    const out = logsForAdaptation([partial, full, hardPartial])
    expect(out.map((l) => l.feedback)).toEqual(['just_right', 'too_easy', 'too_hard'])
    expect(partial.feedback).toBe('too_easy') // không sửa dữ liệu gốc
  })
})