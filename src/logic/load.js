// Thông số bài tập: mặc định theo trình độ + tăng/giảm tải
import { LEVEL_PRESETS, SECONDS_PER_REP, TRANSITION_SEC } from './constants.js';

export const isStretch = (ex) => ex.type === 'stretch' || ex.type === 'mobility';

/** Thông số gốc (chưa điều chỉnh) theo trình độ. */
export function baseParams(ex, level) {
  const p = LEVEL_PRESETS[level];
  if (!p) throw new Error(`Trình độ không hợp lệ: ${level}`);
  if (isStretch(ex)) return { sets: 2, durationSec: ex.baseDurationSec ?? 30, restSec: 10 };
  if (ex.trackingType === 'time') {
    const d = Math.max(10, Math.round(((ex.baseDurationSec ?? 30) * p.timeFactor) / 5) * 5);
    return { sets: p.sets, durationSec: d, restSec: p.restSec };
  }
  return { sets: p.sets, reps: p.reps, restSec: p.restSec };
}

/** Thông số nhẹ cho bài khởi động / thả lỏng. */
export function lightParams(ex) {
  if (ex.trackingType === 'time') return { sets: 1, durationSec: ex.baseDurationSec ?? 45, restSec: 10 };
  return { sets: 1, reps: 12, restSec: 10 };
}

/**
 * Áp bậc tải `step` (số nguyên; + là tăng, - là giảm) lên thông số gốc.
 * Bậc lẻ đổi số lần (~12%, tối thiểu ±1 lần hoặc ±5 giây), bậc chẵn đổi số hiệp (±1).
 *   step +1: reps +12%   +2: +1 hiệp   +3: reps +24%, +1 hiệp   +4: +2 hiệp ...
 * Không bao giờ sửa giáo án gốc: luôn tính từ thông số gốc + step.
 */
export function applyLoadStep(params, step) {
  if (!step) return { ...params };
  const dir = Math.sign(step);
  const n = Math.abs(step);
  const repSteps = Math.ceil(n / 2);
  const setSteps = Math.floor(n / 2);
  const out = { ...params, sets: Math.max(1, params.sets + dir * setSteps) };
  if (params.reps != null) {
    const delta = Math.max(1, Math.round(params.reps * 0.12 * repSteps));
    out.reps = Math.max(1, params.reps + dir * delta);
  }
  if (params.durationSec != null) {
    const delta = Math.max(5, Math.round((params.durationSec * 0.12 * repSteps) / 5) * 5);
    out.durationSec = Math.max(10, params.durationSec + dir * delta);
  }
  return out;
}

/** Ước lượng thời gian (giây) của một bài: các hiệp + nghỉ + đổi tư thế. */
export function estimateSec(params) {
  const work = params.durationSec ?? (params.reps ?? 0) * SECONDS_PER_REP;
  return params.sets * work + Math.max(0, params.sets - 1) * params.restSec + TRANSITION_SEC;
}
