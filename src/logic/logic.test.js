import { describe, it, expect } from 'vitest';
import exercises from '../data/exercises.sample.json';
import { findFreeSlots, findFreeSlotsByDay } from './freeSlots.js';
import { hardFilter, softFilter } from './filters.js';
import { applyLoadStep, baseParams } from './load.js';
import { evaluateAdaptation } from './adaptive.js';
import { pickTier, buildSession, scheduleWeek, toScheduleRows } from './scheduler.js';
import { calcBMI, bmiCategory } from './profile.js';
import { FEEDBACK_SCORE } from './constants.js';

const baseProfile = {
  goal: 'weight_loss', level: 'beginner', injuries: [], equipment: [],
  daysPerWeek: 3, sessionMinutes: 30,
};
const ids = (list) => list.map((e) => e.id ?? e.exerciseId);
const log = (n, feedback) => ({ id: `l${n}`, completedAt: `2026-09-${String(n).padStart(2, '0')}T08:00`, feedback });

// ------------------------------------------------------------
describe('Thuật toán 1: khoảng rảnh', () => {
  it('không có lịch bận → cả ngày 06:00-22:00 là rảnh', () => {
    const r = findFreeSlots([]);
    expect(r).toHaveLength(1);
    expect([r[0].start, r[0].end, r[0].duration]).toEqual(['06:00', '22:00', 960]);
  });
  it('bận 08:00-17:00 → rảnh 06-08 và 17-22', () => {
    const r = findFreeSlots([{ start: '08:00', end: '17:00' }]);
    expect(r.map((s) => [s.start, s.end])).toEqual([['06:00', '08:00'], ['17:00', '22:00']]);
  });
  it('gộp khung bận chồng lấn và liền kề', () => {
    const r = findFreeSlots([
      { start: '12:00', end: '13:00' }, { start: '08:00', end: '10:00' }, { start: '09:00', end: '12:00' },
    ]);
    expect(r.map((s) => [s.start, s.end])).toEqual([['06:00', '08:00'], ['13:00', '22:00']]);
  });
  it('khung bận nằm ngoài 06-22 bị bỏ qua, khung vượt biên bị cắt', () => {
    const r = findFreeSlots([{ start: '22:30', end: '23:30' }, { start: '05:00', end: '07:00' }]);
    expect(r.map((s) => [s.start, s.end])).toEqual([['07:00', '22:00']]);
  });
  it('bỏ khoảng rảnh ngắn hơn 10 phút', () => {
    expect(findFreeSlots([{ start: '06:05', end: '21:55' }])).toEqual([]);
  });
  it('kín lịch → không có khung rảnh', () => {
    expect(findFreeSlots([{ start: '06:00', end: '22:00' }])).toEqual([]);
  });
  it('giờ kết thúc <= giờ bắt đầu → báo lỗi', () => {
    expect(() => findFreeSlots([{ start: '10:00', end: '09:00' }])).toThrow();
    expect(() => findFreeSlots([{ start: '10:00', end: '10:00' }])).toThrow();
  });
  it('theo tuần: chỉ ngày có khung bận bị ảnh hưởng', () => {
    const w = findFreeSlotsByDay([{ dayOfWeek: 1, start: '06:00', end: '22:00' }]);
    expect(w[1]).toEqual([]);
    expect(w[2]).toHaveLength(1);
    expect(() => findFreeSlotsByDay([{ dayOfWeek: 8, start: '08:00', end: '09:00' }])).toThrow();
  });
});

// ------------------------------------------------------------
describe('Thuật toán 2: lọc chống chỉ định', () => {
  it('đau lưng dưới → loại deadlift, giữ push-up', () => {
    const { safe, excluded } = hardFilter(exercises, ['lower_back']);
    expect(ids(safe)).not.toContain('dumbbell-deadlift');
    expect(ids(safe)).toContain('push-up');
    expect(excluded.some((x) => x.exercise.id === 'dumbbell-deadlift' && x.reason === 'lower_back')).toBe(true);
  });
  it('nhiều chấn thương → loại hợp của các danh sách', () => {
    const { safe } = hardFilter(exercises, ['knee', 'shoulder']);
    for (const id of ['bodyweight-squat', 'jump-squat', 'push-up', 'plank', 'dumbbell-shoulder-press']) {
      expect(ids(safe)).not.toContain(id);
    }
    expect(ids(safe)).toContain('glute-bridge');
  });
  it('không chấn thương → giữ mọi bài đã gắn nhãn', () => {
    const { safe, excluded } = hardFilter(exercises, []);
    expect(safe).toHaveLength(exercises.length);
    expect(excluded).toHaveLength(0);
  });
  it('bài CHƯA gắn nhãn an toàn bị loại (kể cả khi không có chấn thương)', () => {
    const mystery = { id: 'mystery', name: 'X', equipment: ['bodyweight'], level: 1, goals: [], type: 'strength' };
    const { safe, excluded } = hardFilter([...exercises, mystery], []);
    expect(ids(safe)).not.toContain('mystery');
    expect(excluded[0].reason).toMatch(/chưa gắn nhãn/);
  });
});

describe('Lọc mềm', () => {
  it('chỉ bodyweight → không có bài dùng tạ đơn; có tạ đơn → có', () => {
    expect(ids(softFilter(exercises, { ...baseProfile, level: 'advanced' }))).not.toContain('goblet-squat');
    expect(ids(softFilter(exercises, { ...baseProfile, level: 'advanced', equipment: ['dumbbell'] }))).toContain('goblet-squat');
  });
  it('người mới không nhận bài level 2-3', () => {
    const r = softFilter(exercises, baseProfile);
    expect(r.every((e) => e.level === 1)).toBe(true);
  });
  it('giảm cân ưu tiên cardio/HIIT hơn bài giãn cơ', () => {
    const r = softFilter(exercises, { ...baseProfile, level: 'advanced' });
    expect(ids(r).indexOf('burpee')).toBeLessThan(ids(r).indexOf('hamstring-stretch'));
  });
});

// ------------------------------------------------------------
describe('Thông số & tăng/giảm tải', () => {
  it('thông số mặc định theo trình độ', () => {
    const squat = exercises.find((e) => e.id === 'bodyweight-squat');
    expect(baseParams(squat, 'beginner')).toMatchObject({ sets: 2, reps: 10, restSec: 60 });
    expect(baseParams(squat, 'intermediate')).toMatchObject({ sets: 3, reps: 12, restSec: 45 });
  });
  it('bậc +1: tăng reps; +2: thêm 1 hiệp', () => {
    const p = { sets: 3, reps: 10, restSec: 45 };
    expect(applyLoadStep(p, 1)).toMatchObject({ sets: 3, reps: 11 });
    expect(applyLoadStep(p, 2)).toMatchObject({ sets: 4, reps: 11 });
  });
  it('bậc âm: giảm reps rồi giảm hiệp; hiệp không xuống dưới 1', () => {
    const p = { sets: 3, reps: 10, restSec: 45 };
    expect(applyLoadStep(p, -1)).toMatchObject({ sets: 3, reps: 9 });
    expect(applyLoadStep(p, -2)).toMatchObject({ sets: 2, reps: 9 });
    expect(applyLoadStep({ sets: 1, reps: 10, restSec: 45 }, -4).sets).toBe(1);
  });
  it('bài tính giờ: thay đổi số giây', () => {
    expect(applyLoadStep({ sets: 3, durationSec: 30, restSec: 45 }, 1).durationSec).toBe(35);
  });
  it('không sửa object gốc', () => {
    const p = { sets: 3, reps: 10, restSec: 45 };
    applyLoadStep(p, 3);
    expect(p).toEqual({ sets: 3, reps: 10, restSec: 45 });
  });
});

// ------------------------------------------------------------
describe('Thuật toán 3: điều chỉnh theo phản hồi', () => {
  it('ĐIỂM TRUNG BÌNH TỐI ĐA CHỈ LÀ +1 (nên ngưỡng > +1.5 không bao giờ đạt được)', () => {
    expect(Math.max(...Object.values(FEEDBACK_SCORE))).toBe(1);
  });
  it('3 buổi "quá dễ" → tăng', () => {
    const r = evaluateAdaptation([log(1, 'too_easy'), log(2, 'too_easy'), log(3, 'too_easy')]);
    expect(r).toMatchObject({ decision: 'progress', delta: 1, newStep: 1 });
    expect(r.average).toBe(1);
  });
  it('2 dễ + 1 vừa (TB 0.67) → tăng', () => {
    expect(evaluateAdaptation([log(1, 'too_easy'), log(2, 'just_right'), log(3, 'too_easy')]).decision).toBe('progress');
  });
  it('1 dễ + 2 vừa (TB 0.33) → giữ nguyên', () => {
    expect(evaluateAdaptation([log(1, 'too_easy'), log(2, 'just_right'), log(3, 'just_right')]).decision).toBe('hold');
  });
  it('mới có 2 buổi "quá dễ" → chưa tăng (cần đủ 3 buổi)', () => {
    expect(evaluateAdaptation([log(1, 'too_easy'), log(2, 'too_easy')]).decision).toBe('hold');
  });
  it('2 buổi liên tiếp "quá khó" → giảm ngay', () => {
    const r = evaluateAdaptation([log(1, 'too_hard'), log(2, 'too_hard')]);
    expect(r).toMatchObject({ decision: 'regress', newStep: -1 });
  });
  it('2 khó + 1 vừa (TB -0.67) → giảm', () => {
    expect(evaluateAdaptation([log(1, 'too_hard'), log(2, 'just_right'), log(3, 'too_hard')]).decision).toBe('regress');
  });
  it('1 khó + 2 vừa (TB -0.33) → giữ nguyên', () => {
    expect(evaluateAdaptation([log(1, 'too_hard'), log(2, 'just_right'), log(3, 'just_right')]).decision).toBe('hold');
  });
  it('sau khi tăng, cửa sổ được reset: buổi kế tiếp không tăng thêm', () => {
    const first = evaluateAdaptation([log(1, 'too_easy'), log(2, 'too_easy'), log(3, 'too_easy')]);
    const second = evaluateAdaptation(
      [log(1, 'too_easy'), log(2, 'too_easy'), log(3, 'too_easy'), log(4, 'too_easy')], first.state);
    expect(second.decision).toBe('hold');
    expect(second.newStep).toBe(1);
  });
  it('chặn trần và sàn', () => {
    const top = evaluateAdaptation([log(1, 'too_easy'), log(2, 'too_easy'), log(3, 'too_easy')], { step: 4, lastAdjustedLogId: null });
    expect(top.newStep).toBe(4);
    const bottom = evaluateAdaptation([log(1, 'too_hard'), log(2, 'too_hard')], { step: -3, lastAdjustedLogId: null });
    expect(bottom.newStep).toBe(-3);
  });
  it('sắp xếp theo thời gian, không phụ thuộc thứ tự truyền vào', () => {
    const r = evaluateAdaptation([log(3, 'too_easy'), log(1, 'too_easy'), log(2, 'too_easy')]);
    expect(r.decision).toBe('progress');
  });
});

// ------------------------------------------------------------
describe('Dựng buổi tập theo khung rảnh', () => {
  it('phân loại buổi tập theo số phút', () => {
    expect([9, 10, 19, 20, 29, 30, 60].map(pickTier)).toEqual([null, 'mini', 'mini', 'short', 'short', 'full', 'full']);
  });
  const poolFor = (profile) => softFilter(hardFilter(exercises, profile.injuries).safe, profile);

  it('khung 15 phút: chỉ HIIT/cardio/giãn cơ, không vượt thời gian', () => {
    const profile = { ...baseProfile, level: 'intermediate' };
    const s = buildSession(15, { pool: poolFor(profile), profile });
    expect(s.tier).toBe('mini');
    expect(s.items.length).toBeGreaterThan(0);
    expect(s.items.every((i) => i.phase === 'main')).toBe(true);
    expect(s.estimatedMin).toBeLessThanOrEqual(15);
  });
  it('khung 40 phút: đủ khởi động + tập chính + giãn cơ, không vượt thời gian', () => {
    const profile = { ...baseProfile, goal: 'muscle_gain', level: 'intermediate', equipment: ['dumbbell'] };
    const s = buildSession(40, { pool: poolFor(profile), profile });
    const phases = new Set(s.items.map((i) => i.phase));
    expect(s.tier).toBe('full');
    expect(phases).toEqual(new Set(['warmup', 'main', 'cooldown']));
    expect(s.estimatedMin).toBeLessThanOrEqual(40);
    expect(s.items.map((i) => i.order)).toEqual(s.items.map((_, i) => i + 1));
  });
  it('dưới 10 phút → không xếp', () => {
    expect(buildSession(8, { pool: [], profile: baseProfile })).toBeNull();
  });
  it('đau gối: không có squat/nhảy/leo... trong buổi tập', () => {
    const profile = { ...baseProfile, goal: 'muscle_gain', level: 'intermediate', equipment: ['dumbbell'], injuries: ['knee'] };
    const s = buildSession(45, { pool: poolFor(profile), profile });
    for (const bad of ['bodyweight-squat', 'goblet-squat', 'jump-squat', 'jumping-jacks', 'quad-stretch']) {
      expect(ids(s.items)).not.toContain(bad);
    }
  });
  it('bậc tải âm sâu → đổi sang biến thể nhẹ hơn (goblet squat → squat không tạ)', () => {
    const profile = { ...baseProfile, goal: 'muscle_gain', level: 'intermediate', equipment: ['dumbbell'] };
    const s = buildSession(40, { pool: poolFor(profile), profile, loadStep: -3 });
    const swapped = s.items.find((i) => i.replacedFrom);
    expect(swapped).toBeTruthy();
  });
  it('mục tiêu giãn cơ → bài chính toàn là giãn cơ/mobility', () => {
    const profile = { ...baseProfile, goal: 'flexibility' };
    const s = buildSession(30, { pool: poolFor(profile), profile });
    const main = s.items.filter((i) => i.phase === 'main');
    const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
    expect(main.length).toBeGreaterThan(0);
    expect(main.every((i) => ['stretch', 'mobility'].includes(byId[i.exerciseId].type))).toBe(true);
  });
});

describe('Lịch cả tuần', () => {
  // Đi làm T2-T6 08:00-17:30 (có khung trưa chồng lấn), T7-CN rảnh
  const workdays = [1, 2, 3, 4, 5].flatMap((d) => [
    { dayOfWeek: d, start: '08:00', end: '17:30' },
    { dayOfWeek: d, start: '12:00', end: '13:00' },
  ]);
  const profile = { ...baseProfile, level: 'intermediate', equipment: ['dumbbell'], preferredPeriod: 'evening' };

  it('xếp đúng số buổi, không liền ngày, nằm trong khung rảnh', () => {
    const r = scheduleWeek({ profile, busySlots: workdays, exercises, weekStart: '2026-09-21' });
    expect(r.sessions).toHaveLength(3);
    const days = r.sessions.map((s) => s.dayOfWeek);
    for (let i = 1; i < days.length; i++) expect(days[i] - days[i - 1]).toBeGreaterThan(1);
    for (const s of r.sessions) {
      const free = r.freeByDay[s.dayOfWeek].find((f) => f.start <= s.startTime && s.endTime <= f.end);
      expect(free).toBeTruthy();
    }
  });
  it('chọn buổi tối → MỌI buổi bắt đầu từ 17:00 trở đi (kể cả cuối tuần rảnh cả ngày)', () => {
    const r = scheduleWeek({ profile, busySlots: workdays, exercises, weekStart: '2026-09-21' });
    expect(r.sessions.length).toBe(3);
    for (const s of r.sessions) expect(s.startTime >= '17:00').toBe(true);
    // ngày rảnh cả ngày → bắt đầu đúng 17:00; ngày đi làm → 17:30 (sau giờ làm)
    for (const s of r.sessions) expect(s.startTime).toBe(s.dayOfWeek <= 5 ? '17:30' : '17:00');
  });
  it('không chọn buổi → bắt đầu ở đầu khung rảnh', () => {
    const p = { ...profile, preferredPeriod: undefined };
    const r = scheduleWeek({ profile: p, busySlots: [{ dayOfWeek: 6, start: '06:00', end: '10:00' }], exercises, weekStart: '2026-09-21' });
    const sat = r.sessions.find((s) => s.dayOfWeek === 6);
    if (sat) expect(sat.startTime).toBe('10:00'); // đầu khung rảnh sau giờ bận
    expect(r.sessions.every((s) => r.freeByDay[s.dayOfWeek].some((f) => f.start <= s.startTime && s.endTime <= f.end))).toBe(true);
  });
  it('bài cardio không bị khối khởi động "ăn hết" khỏi phần tập chính', () => {
    const p = { ...baseProfile, goal: 'weight_loss', level: 'beginner' };
    const pool = softFilter(hardFilter(exercises, []).safe, p);
    const s = buildSession(30, { pool, profile: p });
    const main = ids(s.items.filter((i) => i.phase === 'main'));
    expect(main.some((id) => ['march-in-place', 'shadow-boxing', 'high-knees'].includes(id))).toBe(true);
  });
  it('ngày ghi đúng theo weekStart (T2 = 2026-09-21)', () => {
    const r = scheduleWeek({ profile, busySlots: workdays, exercises, weekStart: '2026-09-21' });
    for (const s of r.sessions) {
      const expected = new Date(2026, 8, 21 + s.dayOfWeek - 1);
      expect(s.date).toBe(`${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`);
    }
  });
  it('lịch kín mọi ngày → không xếp được và có cảnh báo', () => {
    const allBusy = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ dayOfWeek: d, start: '06:00', end: '22:00' }));
    const r = scheduleWeek({ profile, busySlots: allBusy, exercises, weekStart: '2026-09-21' });
    expect(r.sessions).toHaveLength(0);
    expect(r.warnings.join(' ')).toMatch(/0\/3/);
  });
  it('đau lưng dưới: cả tuần không có deadlift/row', () => {
    const p = { ...profile, goal: 'muscle_gain', injuries: ['lower_back'] };
    const r = scheduleWeek({ profile: p, busySlots: [], exercises, weekStart: '2026-09-21' });
    const all = r.sessions.flatMap((s) => ids(s.session.items));
    expect(all).not.toContain('dumbbell-deadlift');
    expect(all).not.toContain('dumbbell-row');
  });
  it('kết quả ổn định (cùng đầu vào → cùng đầu ra)', () => {
    const a = scheduleWeek({ profile, busySlots: workdays, exercises, weekStart: '2026-09-21' });
    const b = scheduleWeek({ profile, busySlots: workdays, exercises, weekStart: '2026-09-21' });
    expect(a).toEqual(b);
  });
  it('các buổi trong tuần không lặp y hệt nhau khi kho đủ bài', () => {
    const p = { ...profile, goal: 'weight_loss', level: 'advanced' };
    const r = scheduleWeek({ profile: p, busySlots: [], exercises, weekStart: '2026-09-21' });
    const sig = r.sessions.map((s) => ids(s.session.items).join(','));
    expect(new Set(sig).size).toBeGreaterThan(1);
  });
  it('chuyển sang dòng dữ liệu để lưu DB', () => {
    const r = scheduleWeek({ profile, busySlots: workdays, exercises, weekStart: '2026-09-21' });
    const rows = toScheduleRows('user-1', r.sessions);
    expect(rows[0].schedule).toMatchObject({ user_id: 'user-1', status: 'planned' });
    expect(rows[0].details[0]).toHaveProperty('exercise_id');
  });
});

describe('BMI', () => {
  it('tính và phân loại', () => {
    expect(calcBMI(65, 170)).toBe(22.5);
    expect(bmiCategory(22.5)).toBe('Bình thường');
    expect(bmiCategory(24)).toBe('Thừa cân');
    expect(bmiCategory(27)).toBe('Béo phì');
  });
  it('từ chối giá trị vô lý', () => {
    expect(() => calcBMI(5, 170)).toThrow();
    expect(() => calcBMI(65, 17)).toThrow();
  });
});
