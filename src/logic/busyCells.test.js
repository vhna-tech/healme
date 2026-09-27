import { describe, it, expect } from 'vitest'
import { ROWS, emptyCells, cellsToSlots, slotsToCells } from './busyCells.js'
import { findFreeSlotsByDay } from './freeSlots.js'

const fill = (cells, d, from, to) => { for (let r = from; r < to; r++) cells[d][r] = true; return cells }

describe('Bảng lịch bận ↔ khung giờ bận', () => {
  it('có 32 hàng (06:00-22:00, mỗi hàng 30 phút)', () => {
    expect(ROWS).toBe(32)
  })
  it('bảng trống → không có khung bận', () => {
    expect(cellsToSlots(emptyCells())).toEqual([])
  })
  it('các ô liền nhau gộp thành 1 khoảng: T2 08:00-17:00', () => {
    expect(cellsToSlots(fill(emptyCells(), 0, 4, 22))).toEqual([{ dayOfWeek: 1, start: '08:00', end: '17:00' }])
  })
  it('hai cụm ô tách rời → hai khoảng', () => {
    const c = fill(fill(emptyCells(), 2, 4, 6), 2, 10, 12)
    expect(cellsToSlots(c)).toEqual([
      { dayOfWeek: 3, start: '08:00', end: '09:00' },
      { dayOfWeek: 3, start: '11:00', end: '12:00' },
    ])
  })
  it('ô đầu (06:00) và ô cuối (21:30-22:00) xử lý đúng', () => {
    const c = fill(fill(emptyCells(), 6, 0, 1), 6, 31, 32)
    expect(cellsToSlots(c)).toEqual([
      { dayOfWeek: 7, start: '06:00', end: '06:30' },
      { dayOfWeek: 7, start: '21:30', end: '22:00' },
    ])
  })
  it('khứ hồi: khung → ô → khung giữ nguyên', () => {
    const slots = [
      { dayOfWeek: 1, start: '08:00', end: '17:30' },
      { dayOfWeek: 5, start: '12:00', end: '13:00' },
    ]
    expect(cellsToSlots(slotsToCells(slots))).toEqual(slots)
  })
  it('khung không tròn 30 phút (08:15-09:10) → tô mọi ô bị chạm tới', () => {
    expect(cellsToSlots(slotsToCells([{ dayOfWeek: 1, start: '08:15', end: '09:10' }])))
      .toEqual([{ dayOfWeek: 1, start: '08:00', end: '09:30' }])
  })
  it('khung nằm ngoài 06:00-22:00 bị bỏ qua, khung vượt biên bị cắt', () => {
    expect(slotsToCells([{ dayOfWeek: 1, start: '05:00', end: '06:00' }])).toEqual(emptyCells())
    expect(cellsToSlots(slotsToCells([{ dayOfWeek: 2, start: '21:00', end: '23:30' }])))
      .toEqual([{ dayOfWeek: 2, start: '21:00', end: '22:00' }])
  })
  it('nối với thuật toán khoảng rảnh: T2 bận 08:00-17:00 → rảnh 06-08 và 17-22', () => {
    const free = findFreeSlotsByDay(cellsToSlots(fill(emptyCells(), 0, 4, 22)))
    expect(free[1].map((s) => [s.start, s.end])).toEqual([['06:00', '08:00'], ['17:00', '22:00']])
    expect(free[2]).toHaveLength(1) // T3 rảnh cả ngày
  })
})