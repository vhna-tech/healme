// ============================================================
// Tất cả "luật" của hệ thống nằm ở đây. Muốn đổi luật → sửa file này.
// ============================================================

// --- Trục thời gian (tính bằng phút trong ngày, 0 → 1440) ---
export const DAY_START_MIN = 6 * 60;   // 06:00
export const DAY_END_MIN = 22 * 60;    // 22:00
export const MIN_SLOT_MIN = 10;        // khung rảnh ngắn hơn 10 phút thì bỏ
export const BUFFER_MIN = 5;           // chừa cuối khung (thay đồ, uống nước...); đặt 0 nếu không cần
export const MAX_SESSION_MIN = 60;

// --- Trình độ ---
export const LEVELS = { beginner: 1, intermediate: 2, advanced: 3 };

// Thông số mặc định theo trình độ (Bước 2 - "Gán thông số mặc định")
export const LEVEL_PRESETS = {
  beginner:     { sets: 2, reps: 10, restSec: 60, timeFactor: 0.7 },
  intermediate: { sets: 3, reps: 12, restSec: 45, timeFactor: 1.0 },
  advanced:     { sets: 4, reps: 15, restSec: 30, timeFactor: 1.3 },
};

// --- Ước lượng thời gian ---
export const SECONDS_PER_REP = 3;
export const TRANSITION_SEC = 20; // đổi tư thế giữa các bài

// --- Mục tiêu → loại bài & nhóm cơ ưu tiên (Lọc mềm) ---
export const GOAL_PROFILES = {
  weight_loss: {
    mainTypes: ['cardio', 'hiit', 'strength'],
    preferredTypes: ['cardio', 'hiit'],
    preferredMuscles: ['legs', 'glutes', 'full_body', 'core'],
  },
  muscle_gain: {
    mainTypes: ['strength'],
    preferredTypes: ['strength'],
    preferredMuscles: ['chest', 'back', 'legs', 'glutes', 'shoulders', 'hamstrings'],
  },
  flexibility: {
    mainTypes: ['stretch', 'mobility'],
    preferredTypes: ['stretch', 'mobility'],
    preferredMuscles: [],
  },
};

// --- Cấu trúc buổi tập theo độ dài khung rảnh (Bước 3) ---
export const SESSION_TIERS = {
  // 10-19 phút: HIIT / cardio ngắn / giãn cơ, không tách khởi động
  mini:  { warmupMin: 0, cooldownMin: 0, allowedTypes: ['hiit', 'cardio', 'stretch', 'mobility'] },
  // 20-29 phút: (khoảng trống trong đặc tả gốc) khởi động ngắn + tập chính + giãn ngắn
  short: { warmupMin: 3, cooldownMin: 2, allowedTypes: null },
  // 30-60 phút: khởi động 5' + tập chính + giãn cơ 5'
  full:  { warmupMin: 5, cooldownMin: 5, allowedTypes: null },
};

// --- Vòng phản hồi (Bước 5) ---
export const FEEDBACK_SCORE = { too_easy: 1, just_right: 0, too_hard: -1 };
export const ADAPT = {
  window: 3,            // xét 3 buổi gần nhất
  progressAbove: 0.5,   // trung bình > 0.5 → tăng tải
  regressBelow: -0.5,   // trung bình < -0.5 → giảm tải
  stepMin: -3,          // giới hạn giảm tối đa
  stepMax: 4,           // giới hạn tăng tối đa
};
