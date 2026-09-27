// THUẬT TOÁN 2: Lọc chống chỉ định (lọc cứng) + lọc mềm
//   Khả thi = (Bài phù hợp) \ ∪ (Bài chống chỉ định của từng chấn thương)
import { LEVELS, GOAL_PROFILES } from './constants.js';

/**
 * LỌC CỨNG: loại bài có avoidIfInjury trùng chấn thương của người dùng.
 * QUY TẮC AN TOÀN: bài CHƯA gắn nhãn avoidIfInjury (thiếu trường) bị loại,
 * vì "chưa ai xem xét" không có nghĩa là "an toàn".
 * Bài đã xem xét và không có chống chỉ định thì ghi rõ avoidIfInjury: [].
 */
export function hardFilter(exercises, userInjuries = []) {
  const injured = new Set(userInjuries);
  const safe = [];
  const excluded = [];
  for (const ex of exercises) {
    if (!Array.isArray(ex.avoidIfInjury)) {
      excluded.push({ exercise: ex, reason: 'chưa gắn nhãn an toàn' });
      continue;
    }
    const hit = ex.avoidIfInjury.find((inj) => injured.has(inj));
    if (hit) excluded.push({ exercise: ex, reason: hit });
    else safe.push(ex);
  }
  return { safe, excluded };
}

/**
 * LỌC MỀM: giữ bài đúng dụng cụ + không vượt trình độ, rồi chấm điểm ưu tiên theo mục tiêu.
 * @returns mảng bài kèm `score`, sắp xếp điểm cao → thấp
 */
export function softFilter(exercises, profile) {
  const maxLevel = LEVELS[profile.level];
  const goal = GOAL_PROFILES[profile.goal];
  if (!maxLevel || !goal) throw new Error('Hồ sơ cần có level và goal hợp lệ');
  const owned = new Set(['bodyweight', ...(profile.equipment ?? [])]);

  return exercises
    .filter((ex) => ex.equipment.every((eq) => owned.has(eq)))
    .filter((ex) => ex.level <= maxLevel)
    .map((ex) => ({
      ...ex,
      score:
        (ex.goals.includes(profile.goal) ? 3 : 0) +
        (goal.preferredTypes.includes(ex.type) ? 2 : 0) +
        (goal.preferredMuscles.includes(ex.primaryMuscle) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
