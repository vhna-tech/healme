// THUẬT TOÁN 1: Tìm khoảng rảnh (phép bù tập hợp trên trục phút)
import { DAY_START_MIN, DAY_END_MIN, MIN_SLOT_MIN } from './constants.js';

export function timeToMin(t) {
  if (typeof t === 'number') return t;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(t).trim());
  if (!m) throw new Error(`Giờ không hợp lệ: "${t}" (cần dạng HH:MM)`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) throw new Error(`Giờ không hợp lệ: "${t}"`);
  return h * 60 + min;
}

export function minToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Tìm các khoảng rảnh trong MỘT ngày.
 * @param busy  mảng [{start:'08:00', end:'17:00'}]
 * @returns     mảng [{start, end, startMin, endMin, duration}]
 */
export function findFreeSlots(busy = [], opts = {}) {
  const { dayStart = DAY_START_MIN, dayEnd = DAY_END_MIN, minSlot = MIN_SLOT_MIN } = opts;

  // 1) Chuyển sang phút, kiểm tra hợp lệ, cắt gọn vào cửa sổ 06:00-22:00
  const blocks = [];
  for (const b of busy) {
    const s = timeToMin(b.start);
    const e = timeToMin(b.end);
    if (e <= s) {
      throw new Error(`Khung bận không hợp lệ: ${b.start}–${b.end} (giờ kết thúc phải sau giờ bắt đầu)`);
    }
    const cs = Math.max(s, dayStart);
    const ce = Math.min(e, dayEnd);
    if (ce > cs) blocks.push([cs, ce]);
  }

  // 2) Sắp xếp rồi gộp các khoảng chồng lấn / liền kề
  blocks.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of blocks) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  // 3) Phép bù: phần còn lại giữa các khoảng bận là khoảng rảnh
  const free = [];
  const push = (s, e) => {
    if (e - s >= minSlot) {
      free.push({ start: minToTime(s), end: minToTime(e), startMin: s, endMin: e, duration: e - s });
    }
  };
  let cursor = dayStart;
  for (const [s, e] of merged) {
    push(cursor, s);
    cursor = e;
  }
  push(cursor, dayEnd);
  return free;
}

/**
 * Cả tuần. busySlots: [{dayOfWeek:1..7 (T2..CN), start, end}]
 * @returns { 1:[...slots], 2:[...], ... 7:[...] }
 */
export function findFreeSlotsByDay(busySlots = [], opts) {
  const byDay = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  for (const b of busySlots) {
    if (!(b.dayOfWeek >= 1 && b.dayOfWeek <= 7)) {
      throw new Error(`dayOfWeek phải từ 1 (T2) đến 7 (CN), nhận được: ${b.dayOfWeek}`);
    }
    byDay[b.dayOfWeek].push(b);
  }
  const out = {};
  for (let d = 1; d <= 7; d++) out[d] = findFreeSlots(byDay[d], opts);
  return out;
}
