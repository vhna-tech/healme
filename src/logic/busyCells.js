// Chuyển đổi giữa "các ô đã tô đỏ trên bảng" và "danh sách khung giờ bận".
// Bảng: 7 cột (T2..CN) x 32 hàng (mỗi hàng 30 phút, từ 06:00 đến 22:00).
import { DAY_START_MIN, DAY_END_MIN } from './constants.js'
import { minToTime, timeToMin } from './freeSlots.js'

export const CELL_MIN = 30
export const ROWS = (DAY_END_MIN - DAY_START_MIN) / CELL_MIN // 32

/** Bảng trống: cells[ngày 0..6][hàng 0..31] = true nếu ô đó bận */
export const emptyCells = () => Array.from({ length: 7 }, () => Array(ROWS).fill(false))

/** Các ô liền nhau trong cùng một ngày được gộp thành một khoảng. */
export function cellsToSlots(cells) {
  const slots = []
  for (let d = 0; d < 7; d++) {
    let r = 0
    while (r < ROWS) {
      if (!cells[d][r]) {
        r++
        continue
      }
      const startRow = r
      while (r < ROWS && cells[d][r]) r++
      slots.push({
        dayOfWeek: d + 1,
        start: minToTime(DAY_START_MIN + startRow * CELL_MIN),
        end: minToTime(DAY_START_MIN + r * CELL_MIN),
      })
    }
  }
  return slots
}

/** Ngược lại: tô đỏ mọi ô có giao với khung bận (khung nằm ngoài 06:00-22:00 bị bỏ qua). */
export function slotsToCells(slots = []) {
  const cells = emptyCells()
  for (const s of slots) {
    const d = s.dayOfWeek - 1
    if (!(d >= 0 && d <= 6)) continue
    const a = timeToMin(s.start)
    const b = timeToMin(s.end)
    for (let r = 0; r < ROWS; r++) {
      const rowStart = DAY_START_MIN + r * CELL_MIN
      if (a < rowStart + CELL_MIN && b > rowStart) cells[d][r] = true
    }
  }
  return cells
}