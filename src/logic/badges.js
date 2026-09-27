// Danh sách huy hiệu. Muốn thêm/bớt huy hiệu thì sửa ở đây.
// type 'total_workouts': tổng số buổi tập (đạt ngưỡng)
// type 'week_streak'   : chuỗi tuần liên tiếp đạt mục tiêu (dùng chuỗi dài nhất từng đạt)
export const BADGES = [
  { id: 'first', icon: '🌱', title: 'Khởi đầu', desc: 'Hoàn thành buổi tập đầu tiên', type: 'total_workouts', value: 1 },
  { id: 'w5', icon: '🔥', title: 'Vào guồng', desc: 'Hoàn thành 5 buổi tập', type: 'total_workouts', value: 5 },
  { id: 'w10', icon: '💪', title: 'Mười buổi', desc: 'Hoàn thành 10 buổi tập', type: 'total_workouts', value: 10 },
  { id: 'w25', icon: '🏅', title: 'Bền bỉ', desc: 'Hoàn thành 25 buổi tập', type: 'total_workouts', value: 25 },
  { id: 's1', icon: '📅', title: 'Tuần trọn vẹn', desc: 'Tập đủ số buổi mục tiêu trong 1 tuần', type: 'week_streak', value: 1 },
  { id: 's2', icon: '⚡', title: 'Hai tuần liền', desc: '2 tuần liên tiếp đạt mục tiêu', type: 'week_streak', value: 2 },
  { id: 's4', icon: '🏆', title: 'Một tháng kiên trì', desc: '4 tuần liên tiếp đạt mục tiêu', type: 'week_streak', value: 4 },
  { id: 's8', icon: '👑', title: 'Hai tháng bền bỉ', desc: '8 tuần liên tiếp đạt mục tiêu', type: 'week_streak', value: 8 },
]

/**
 * Huy hiệu KHÔNG được lưu riêng mà tính lại từ nhật ký mỗi lần, nên không bao giờ lệch dữ liệu.
 * stats = kết quả của computeStreaks()
 */
export function evaluateBadges(stats, badges = BADGES) {
  return badges.map((b) => {
    const current = b.type === 'total_workouts' ? stats.totalSessions : stats.longest
    return { ...b, current: Math.min(current, b.value), earned: current >= b.value }
  })
}