import { describe, it, expect } from 'vitest'
import { toYmd, parseYmd, addDays, mondayOf, fmtDayMonth } from './dates.js'

describe('Ngày tháng theo giờ địa phương', () => {
  it('toYmd và parseYmd khứ hồi', () => {
    expect(toYmd(new Date(2026, 8, 5))).toBe('2026-09-05')
    expect(toYmd(parseYmd('2026-12-31'))).toBe('2026-12-31')
  })
  it('thứ Hai của tuần: từ giữa tuần, từ Chủ nhật, và chính thứ Hai', () => {
    expect(toYmd(mondayOf(new Date(2026, 8, 23)))).toBe('2026-09-21') // thứ Tư
    expect(toYmd(mondayOf(new Date(2026, 8, 27)))).toBe('2026-09-21') // Chủ nhật vẫn thuộc tuần này
    expect(toYmd(mondayOf(new Date(2026, 8, 21)))).toBe('2026-09-21') // chính thứ Hai
  })
  it('qua ranh giới tháng và năm', () => {
    expect(toYmd(mondayOf(new Date(2026, 9, 1)))).toBe('2026-09-28')
    expect(toYmd(mondayOf(new Date(2027, 0, 1)))).toBe('2026-12-28')
    expect(toYmd(addDays(new Date(2026, 8, 28), 6))).toBe('2026-10-04')
  })
  it('định dạng dd/mm', () => {
    expect(fmtDayMonth(new Date(2026, 8, 5))).toBe('05/09')
  })
})