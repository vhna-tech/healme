// THUẬT TOÁN 3: Điều chỉnh tải theo phản hồi (Adaptive Progression Rules)
import { FEEDBACK_SCORE, ADAPT } from './constants.js';

const byTime = (a, b) =>
  String(a.completedAt).localeCompare(String(b.completedAt)) || String(a.id).localeCompare(String(b.id));

/**
 * @param logs   [{id, completedAt, feedback:'too_easy'|'just_right'|'too_hard'}]
 * @param state  {step, lastAdjustedLogId}  (trạng thái hiện tại của người dùng)
 * @returns      {decision, delta, newStep, average, state, reason}
 *
 * Luật:
 *  - Chỉ xét các buổi SAU lần điều chỉnh gần nhất (tránh tăng liên tục mỗi buổi).
 *  - Cần đủ 3 buổi để tăng tải: điểm TB > +0.5  (Quá dễ = +1, Vừa = 0, Quá khó = -1).
 *  - Giảm tải: điểm TB 3 buổi < -0.5, HOẶC 2 buổi liên tiếp đều "Quá khó" (giảm nhanh vì an toàn).
 *  - Bậc tải luôn nằm trong [stepMin, stepMax].
 */
export function evaluateAdaptation(logs, state = { step: 0, lastAdjustedLogId: null }) {
  const sorted = [...logs].filter((l) => l.feedback in FEEDBACK_SCORE).sort(byTime);
  let fresh = sorted;
  if (state.lastAdjustedLogId != null) {
    const idx = sorted.findIndex((l) => l.id === state.lastAdjustedLogId);
    if (idx >= 0) fresh = sorted.slice(idx + 1);
  }

  const recent = fresh.slice(-ADAPT.window);
  const lastTwo = fresh.slice(-2);
  const average = recent.length === ADAPT.window
    ? recent.reduce((s, l) => s + FEEDBACK_SCORE[l.feedback], 0) / recent.length
    : null;
  const twoHard = lastTwo.length === 2 && lastTwo.every((l) => l.feedback === 'too_hard');

  let decision = 'hold';
  if (twoHard || (average !== null && average < ADAPT.regressBelow)) decision = 'regress';
  else if (average !== null && average > ADAPT.progressAbove) decision = 'progress';

  const dir = decision === 'progress' ? 1 : decision === 'regress' ? -1 : 0;
  const newStep = Math.min(ADAPT.stepMax, Math.max(ADAPT.stepMin, state.step + dir));
  const changed = newStep !== state.step;
  const lastLog = fresh[fresh.length - 1];

  let reason = 'Giữ nguyên mức tập hiện tại.';
  if (decision === 'progress') {
    reason = changed
      ? 'Vài buổi gần đây bạn thấy khá dễ, nên buổi sau được tăng nhẹ độ khó.'
      : 'Bạn đang ở mức khó tối đa của hệ thống, chưa thể tăng thêm.';
  } else if (decision === 'regress') {
    reason = changed
      ? 'Các buổi gần đây khá nặng với bạn, nên buổi sau được giảm nhẹ để an toàn.'
      : 'Bạn đang ở mức nhẹ nhất của hệ thống.';
  }

  return {
    decision,
    delta: newStep - state.step,
    newStep,
    average,
    reason,
    // Khi có quyết định tăng/giảm, "đóng cửa sổ": lần sau chỉ tính các buổi mới
    state: {
      step: newStep,
      lastAdjustedLogId: decision !== 'hold' && lastLog ? lastLog.id : state.lastAdjustedLogId,
    },
  };
}
