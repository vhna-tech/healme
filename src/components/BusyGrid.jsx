import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import useLocalStorage from '../store/useLocalStorage.js'
import { findFreeSlotsByDay, minToTime, timeToMin } from '../logic/freeSlots.js'
import { DAY_START_MIN } from '../logic/constants.js'
import { ROWS, CELL_MIN, cellsToSlots, slotsToCells } from '../logic/busyCells.js'

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const rowOf = (hhmm) => (timeToMin(hhmm) - DAY_START_MIN) / CELL_MIN
const rowTime = (r) => minToTime(DAY_START_MIN + r * CELL_MIN)

function fmtDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m}p`
  return m ? `${h}h${m}p` : `${h}h`
}

export default function BusyGrid() {
  const [saved, setSaved] = useLocalStorage('busySlots', null)
  const [cells, setCells] = useState(() => slotsToCells(Array.isArray(saved) ? saved : []))
  const [lockScroll, setLockScroll] = useState(true)
  const drag = useRef(null) // null = không kéo; true/false = đang tô / đang xoá

  // Kết thúc kéo khi nhả chuột hoặc nhấc ngón tay ở bất kỳ đâu
  useEffect(() => {
    const stop = () => { drag.current = null }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const slots = useMemo(() => cellsToSlots(cells), [cells])
  const free = useMemo(() => findFreeSlotsByDay(slots), [slots])
  const dirty = JSON.stringify(slots) !== JSON.stringify(Array.isArray(saved) ? saved : [])

  function setCell(d, r, value) {
    setCells((prev) => {
      if (prev[d][r] === value) return prev
      const next = prev.map((col) => col.slice())
      next[d][r] = value
      return next
    })
  }

  function startDrag(e, d, r) {
    if (e.button > 0) return
    e.preventDefault()
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    const value = !cells[d][r]
    drag.current = value
    setCell(d, r, value)
  }

  function enterCell(e, d, r) {
    if (drag.current === null) return
    if (e.buttons === 0) { drag.current = null; return }
    setCell(d, r, drag.current)
  }

  function toggleDay(d) {
    setCells((prev) => {
      const next = prev.map((col) => col.slice())
      next[d] = Array(ROWS).fill(!prev[d].every(Boolean))
      return next
    })
  }

  function addWorkHours() {
    setCells((prev) => {
      const next = prev.map((col) => col.slice())
      for (let d = 0; d < 5; d++) {
        for (let r = rowOf('08:00'); r < rowOf('17:00'); r++) {
          next[d][r] = true
        }
      }
      return next
    })
  }

  const clearAll = () => setCells(slotsToCells([]))
  const save = () => setSaved(slots)

  let statusBadge = {
    text: 'Chưa lưu thay đổi',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  if (saved !== null && !dirty) {
    statusBadge = { text: 'Đã lưu đồng bộ ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  } else if (dirty) {
    statusBadge = { text: 'Có thay đổi chưa lưu', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  }

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 text-sm font-bold">
            🚫
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Khung giờ bận trong tuần</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Tô đỏ những khoảng thời gian bạn không thể tập (đi làm, đi học, ngủ...). Hệ thống sẽ xếp lịch vào các giờ còn lại.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Presets & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addWorkHours}
            className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 min-h-[40px]"
          >
            <span>💼</span>
            <span>+ Giờ hành chính T2–T6 (08:00–17:00)</span>
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-rose-600 shadow-xs hover:bg-rose-50 hover:border-rose-200 min-h-[40px]"
          >
            <span>🗑️</span>
            <span>Xoá hết</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-100">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Đỏ = Bận
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-white border border-slate-300" />
            Trắng = Rảnh
          </span>
        </div>
      </div>

      {/* Touch Mode Checkbox */}
      <div className="rounded-2xl bg-slate-100/80 p-3.5 border border-slate-200/60">
        <label className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lockScroll}
            onChange={(e) => setLockScroll(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <b>Chế độ chạm vuốt tô giờ (điện thoại):</b> Cho phép kéo ngón tay trên bảng để tô nhanh. Bỏ chọn nếu bạn muốn cuộn trang khi chạm vào bảng.
          </span>
        </label>
      </div>

      {/* Timetable Grid Container */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
        <div
          className="select-none"
          onContextMenu={(e) => e.preventDefault()}
          style={{
            touchAction: lockScroll ? 'none' : 'pan-y',
            display: 'grid',
            gridTemplateColumns: '3.25rem repeat(7, minmax(0, 1fr))',
            gap: '3px',
          }}
        >
          {/* Top Left Blank */}
          <div className="flex items-center justify-center text-[11px] font-bold text-slate-400">
            Giờ
          </div>

          {/* Day Headers */}
          {DAY_NAMES.map((n, d) => (
            <button
              key={n}
              type="button"
              onClick={() => toggleDay(d)}
              title={`Bấm để tô / xoá toàn bộ ngày ${n}`}
              className="btn-tactile rounded-xl bg-slate-100/90 py-2 text-center text-xs font-extrabold text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
            >
              {n}
            </button>
          ))}

          {/* Grid Rows (32 rows x 7 cols) */}
          {Array.from({ length: ROWS }, (_, r) => (
            <Fragment key={r}>
              {/* Time Label */}
              <div className="flex h-6 items-start justify-end pr-2 text-[11px] font-semibold tabular-nums leading-none text-slate-400 select-none">
                {r % 2 === 0 ? rowTime(r) : ''}
              </div>

              {/* 7 Day Cells */}
              {DAY_NAMES.map((n, d) => {
                const busy = cells[d][r]
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} ${rowTime(r)} - ${busy ? 'Đang bận' : 'Đang rảnh'}`}
                    aria-pressed={busy}
                    onPointerDown={(e) => startDrag(e, d, r)}
                    onPointerEnter={(e) => enterCell(e, d, r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setCell(d, r, !busy)
                      }
                    }}
                    className={`h-6 rounded-md border transition-colors ${
                      busy
                        ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
                        : r % 2 === 0
                          ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                          : 'border-slate-100 bg-white hover:bg-slate-50'
                    }`}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Save Button & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            className="btn-tactile inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 min-h-[48px]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Lưu lịch bận</span>
          </button>
          <span className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-bold ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>

        {slots.length === 0 && (
          <p className="text-xs text-slate-400 italic">
            Bạn chưa tô ô nào, hệ thống mặc định bạn rảnh cả tuần (06:00 – 22:00).
          </p>
        )}
      </div>

      {/* Free Slots Analysis Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-sm font-bold">
            ✨
          </span>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Khung giờ rảnh hệ thống tìm thấy để xếp lịch
          </h3>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 text-xs sm:text-sm">
          {DAY_NAMES.map((n, d) => {
            const list = free[d + 1]
            const total = list.reduce((s, f) => s + f.duration, 0)
            return (
              <li key={n} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="font-extrabold text-slate-900 w-8">{n}</span>
                <span className="text-slate-700 text-right flex-1 truncate font-medium">
                  {list.length
                    ? `${list.map((f) => `${f.start}–${f.end}`).join(', ')}`
                    : 'Kín lịch'}
                </span>
                <span className={`ml-2 shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${list.length ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {list.length ? fmtDuration(total) : '0p'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}