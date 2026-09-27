// Smart Scheduling Engine: xếp bài vào khung rảnh
import {
  BUFFER_MIN, MAX_SESSION_MIN, MIN_SLOT_MIN, SESSION_TIERS, GOAL_PROFILES,
} from './constants.js';
import { findFreeSlotsByDay, minToTime } from './freeSlots.js';
import { hardFilter, softFilter } from './filters.js';
import { baseParams, lightParams, applyLoadStep, estimateSec, isStretch } from './load.js';

/** Phân loại buổi tập theo số phút. Dưới 10 phút → không xếp. */
export function pickTier(minutes) {
  if (minutes < MIN_SLOT_MIN) return null;
  if (minutes < 20) return 'mini';
  if (minutes < 30) return 'short';
  return 'full';
}

// Nếu bài quá nặng (bậc tải ≤ -2) và có biến thể nhẹ hơn trong kho an toàn → đổi sang biến thể
function resolveMain(ex, profile, loadStep, byId) {
  let target = ex;
  let step = loadStep;
  if (!isStretch(ex) && step <= -2 && ex.easierVariantId && byId.has(ex.easierVariantId)) {
    target = byId.get(ex.easierVariantId);
    step += 2; // biến thể vốn đã nhẹ hơn nên "bù" lại 2 bậc
  }
  let params = baseParams(target, profile.level);
  if (!isStretch(target)) params = applyLoadStep(params, step);
  return { ...target, params, replacedFrom: target !== ex ? ex.id : undefined };
}

// Chọn bài lần lượt cho đến khi gần đủ ngân sách thời gian.
// Xếp hạng = điểm mục tiêu - phạt bài đã dùng trong tuần - phạt lặp nhóm cơ.
function fillPhase(cands, budgetSec, { usage, taken }) {
  const items = [];
  let used = 0;
  let lastMuscle = null;
  const muscleCount = {};
  const list = cands.map((c) => ({ ...c, sec: estimateSec(c.params) }));

  for (;;) {
    const ranked = list
      .filter((c) => !taken.has(c.id))
      .map((c) => ({
        c,
        rank: (c.score ?? 0)
          - (usage[c.id] ?? 0) * 1.5
          - (muscleCount[c.primaryMuscle] ?? 0)
          - (c.primaryMuscle === lastMuscle ? 2 : 0),
      }))
      .sort((a, b) => b.rank - a.rank || a.c.id.localeCompare(b.c.id));
    const pick = ranked.find((r) => used + r.c.sec <= budgetSec);
    if (!pick) break;
    items.push(pick.c);
    taken.add(pick.c.id);
    used += pick.c.sec;
    muscleCount[pick.c.primaryMuscle] = (muscleCount[pick.c.primaryMuscle] ?? 0) + 1;
    lastMuscle = pick.c.primaryMuscle;
  }
  return { items, usedSec: used };
}

/**
 * Dựng MỘT buổi tập dài `minutes` phút từ kho bài đã lọc (`pool` = kết quả softFilter).
 * @returns null nếu < 10 phút, ngược lại { tier, minutes, items, estimatedMin, warnings }
 */
export function buildSession(minutes, { pool, profile, loadStep = 0, usage = {} }) {
  const tier = pickTier(minutes);
  if (!tier) return null;
  const cfg = SESSION_TIERS[tier];
  const warnings = [];
  const byId = new Map(pool.map((e) => [e.id, e]));
  const taken = new Set();

  // Loại bài chính cho phép = giao của (loại theo mục tiêu) và (loại theo độ dài buổi)
  let types = GOAL_PROFILES[profile.goal].mainTypes;
  if (cfg.allowedTypes) {
    const inter = types.filter((t) => cfg.allowedTypes.includes(t));
    types = inter.length ? inter : cfg.allowedTypes;
  }

  const inPhase = (phase) => pool.filter((e) => e.phases.includes(phase));
  const warmupC = cfg.warmupMin ? inPhase('warmup').map((e) => ({ ...e, params: lightParams(e) })) : [];
  const mainC = inPhase('main')
    .filter((e) => types.includes(e.type))
    .map((e) => resolveMain(e, profile, loadStep, byId));
  const coolC = cfg.cooldownMin ? inPhase('cooldown').map((e) => ({ ...e, params: lightParams(e) })) : [];

  // Chọn bài chính TRƯỚC (quan trọng nhất), khởi động/thả lỏng lấy từ phần bài còn lại
  const main = fillPhase(mainC, (minutes - cfg.warmupMin - cfg.cooldownMin) * 60, { usage, taken });
  const warmup = fillPhase(warmupC, cfg.warmupMin * 60, { usage, taken });
  const cooldown = fillPhase(coolC, cfg.cooldownMin * 60, { usage, taken });

  const items = [];
  let n = 0;
  for (const [phase, res] of [['warmup', warmup], ['main', main], ['cooldown', cooldown]]) {
    for (const it of res.items) {
      items.push({
        order: ++n,
        phase,
        exerciseId: it.id,
        name: it.name,
        replacedFrom: it.replacedFrom,
        ...it.params,
        estimatedSec: it.sec,
      });
    }
  }

  const totalSec = warmup.usedSec + main.usedSec + cooldown.usedSec;
  const mainBudget = (minutes - cfg.warmupMin - cfg.cooldownMin) * 60;
  if (!main.items.length) warnings.push('Không có bài chính phù hợp với hồ sơ này. Cần thêm bài vào kho.');
  else if (main.usedSec < mainBudget * 0.6) warnings.push('Kho bài an toàn còn ít nên buổi tập ngắn hơn khung rảnh.');

  return { tier, minutes, items, estimatedMin: Math.ceil(totalSec / 60), warnings };
}

// ---------- Lịch cả tuần ----------

const PERIODS = { morning: [360, 720], afternoon: [720, 1020], evening: [1020, 1320] };
// Giờ bắt đầu: nếu người dùng thích buổi (sáng/chiều/tối) và khung đủ chỗ, đặt ngay đầu buổi đó;
// nếu không thì bắt đầu ở đầu khung rảnh.
function placeStart(slot, minutes, pref) {
  const p = PERIODS[pref];
  if (p) {
    const s = Math.max(slot.startMin, p[0]);
    if (s < p[1] && s + minutes <= slot.endMin) return s;
  }
  return slot.startMin;
}
const periodBonus = (startMin, pref) => {
  const p = PERIODS[pref];
  return p && startMin >= p[0] && startMin < p[1] ? 0.5 : 0;
};

// Chọn k ngày: ưu tiên ngày có khung tốt nhất, và tránh 2 ngày liền nhau (để cơ được nghỉ)
function pickDays(cands, k) {
  const sorted = [...cands].sort((a, b) => b.rank - a.rank || a.day - b.day);
  const chosen = [];
  for (const c of sorted) {
    if (chosen.length >= k) break;
    if (chosen.every((x) => Math.abs(x.day - c.day) > 1)) chosen.push(c);
  }
  for (const c of sorted) {
    if (chosen.length >= k) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  return chosen.sort((a, b) => a.day - b.day);
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n); // giờ địa phương, không dùng toISOString (tính theo UTC)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * Dựng lịch tập cả tuần.
 * @param profile   {goal, level, injuries[], equipment[], daysPerWeek, sessionMinutes, preferredPeriod?}
 * @param busySlots [{dayOfWeek:1..7, start:'08:00', end:'17:00'}]
 * @param weekStart 'YYYY-MM-DD' của thứ Hai
 * @param loadStep  bậc tải hiện tại của người dùng (từ adaptive.js)
 */
export function scheduleWeek({ profile, busySlots, exercises, weekStart, loadStep = 0, options = {} }) {
  const buffer = options.bufferMin ?? BUFFER_MIN;
  const warnings = [];

  // Bước 2: kho bài an toàn
  const { safe, excluded } = hardFilter(exercises, profile.injuries ?? []);
  const pool = softFilter(safe, profile);

  // Bước 3: khung rảnh → chọn khung tốt nhất mỗi ngày
  const freeByDay = findFreeSlotsByDay(busySlots);
  const cap = Math.min(profile.sessionMinutes ?? 30, MAX_SESSION_MIN);
  const cands = [];
  for (let day = 1; day <= 7; day++) {
    let best = null;
    for (const slot of freeByDay[day]) {
      const usable = Math.floor((slot.duration - buffer) / 5) * 5;
      const minutes = Math.min(usable, cap);
      if (minutes < MIN_SLOT_MIN) continue;
      const startMin = placeStart(slot, minutes, profile.preferredPeriod);
      const rank = minutes + periodBonus(startMin, profile.preferredPeriod);
      if (!best || rank > best.rank) best = { day, slot, minutes, startMin, rank };
    }
    if (best) cands.push(best);
  }

  const wanted = profile.daysPerWeek ?? 3;
  const chosen = pickDays(cands, wanted);
  if (chosen.length < wanted) {
    warnings.push(`Chỉ xếp được ${chosen.length}/${wanted} buổi vì lịch bận quá dày. Thử bớt vài khung bận hoặc giảm số buổi/tuần.`);
  }

  // Dựng từng buổi; `usage` giúp các buổi trong tuần không lặp cùng một bài
  const usage = {};
  const sessions = [];
  for (const c of chosen) {
    const session = buildSession(c.minutes, { pool, profile, loadStep, usage });
    if (!session) continue;
    session.items.forEach((i) => { usage[i.exerciseId] = (usage[i.exerciseId] ?? 0) + 1; });
    sessions.push({
      dayOfWeek: c.day,
      date: addDays(weekStart, c.day - 1),
      startTime: minToTime(c.startMin),
      endTime: minToTime(c.startMin + c.minutes),
      minutes: c.minutes,
      session,
    });
    warnings.push(...session.warnings);
  }

  return { sessions, freeByDay, excluded, warnings: [...new Set(warnings)] };
}

/** "Khóa lịch": chuyển kết quả sang dòng dữ liệu khớp bảng user_schedules / user_schedule_details. */
export function toScheduleRows(userId, sessions) {
  return sessions.map((s) => ({
    schedule: {
      user_id: userId,
      scheduled_date: s.date,
      start_time: s.startTime,
      duration_minutes: s.minutes,
      status: 'planned',
    },
    details: s.session.items.map((i) => ({
      exercise_id: i.exerciseId,
      order_index: i.order,
      phase: i.phase,
      target_sets: i.sets,
      target_reps: i.reps ?? null,
      target_duration_sec: i.durationSec ?? null,
      rest_sec: i.restSec,
    })),
  }));
}
