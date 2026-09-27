import { describe, it, expect } from 'vitest'
import { getTodayState, diffDays, unsafeItems } from './today.js'

const TODAY = '2026-09-23' // Thứ Tư
const profile = { daysPerWeek: 3, needsDoctorCheck: false }
const mkSession = (date, dayOfWeek) => ({ date, dayOfWeek, minutes: 30, startTime: '17:30', session: { tier: 'full', items: [] } })
const plan = (weekStart = '2026-09-21', dates = [['2026-09-21', 1], ['2026-09-23', 3], ['2026-09-25', 5]]) =>
  ({ weekStart, sessions: dates.map(([d, w]) => mkSession(d, w)) })
const log = (sessionDate, doneDate = sessionDate) => ({ sessionDate, doneDate })
const state = (over) => getTodayState({ profile, busySlots: [], plan: plan(), logs: [], active: null, todayYmd: TODAY, ...over })

describe('Số ngày giữa hai ngày', () => {
  it('đếm đúng, kể cả qua tháng/năm', () => {
    expect(diffDays('2026-09-21', '2026-09-23')).toBe(2)
    expect(diffDays('2026-09-30', '2026-10-02')).toBe(2)
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1)
    expect(diffDays('2026-09-23', '2026-09-21')).toBe(-2)
  })
})

describe('Trang chủ: quyết định hiển thị', () => {
  it('chưa có hồ sơ → chào mừng', () => {
    expect(state({ profile: null }).kind).toBe('welcome')
  })
  it('có hồ sơ, chưa có lịch → hướng dẫn, ghi nhận đã khai báo lịch bận chưa', () => {
    const s = state({ plan: null, busySlots: null })
    expect(s).toMatchObject({ kind: 'setup', expired: false, checklist: { hasBusy: false, hasPlan: false, hasLogs: false } })
    expect(state({ plan: null, busySlots: [] }).checklist.hasBusy).toBe(true) // lưu "rảnh cả tuần" vẫn là đã khai báo
  })
  it('lịch của tuần trước đã hết hạn → hướng dẫn tạo lịch mới', () => {
    const s = state({ plan: plan('2026-09-14', [['2026-09-14', 1]]) })
    expect(s).toMatchObject({ kind: 'setup', expired: true })
  })
  it('hôm nay có buổi chưa tập → "today"', () => {
    const s = state({})
    expect(s.kind).toBe('today')
    expect(s.session.date).toBe(TODAY)
    expect(s.next.date).toBe('2026-09-25')
  })
  it('hôm nay đã tập xong → "done", vẫn có buổi tiếp theo', () => {
    const s = state({ logs: [log('2026-09-23')] })
    expect(s.kind).toBe('done')
    expect(s.next.date).toBe('2026-09-25')
  })
  it('hôm nay không có buổi → "rest"', () => {
    const s = state({ plan: plan('2026-09-21', [['2026-09-21', 1], ['2026-09-25', 5]]) })
    expect(s.kind).toBe('rest')
    expect(s.session).toBeNull()
    expect(s.next.date).toBe('2026-09-25')
  })
  it('đã tập hết lịch tuần này → "rest", không còn buổi tiếp theo', () => {
    const s = state({
      plan: plan('2026-09-21', [['2026-09-21', 1], ['2026-09-22', 2]]),
      logs: [log('2026-09-21'), log('2026-09-22')],
    })
    expect(s).toMatchObject({ kind: 'rest', next: null, missed: null })
  })
  it('có buổi đang tập dở → "active" (ưu tiên cao nhất, kể cả khi lịch đã hết hạn)', () => {
    expect(state({ active: { session: mkSession(TODAY, 3) } }).kind).toBe('active')
    expect(state({ active: { session: mkSession(TODAY, 3) }, plan: null }).kind).toBe('active')
  })
  it('buổi đã qua chưa tập trong 7 ngày → mời tập bù; buổi đã tập thì không', () => {
    expect(state({}).missed.date).toBe('2026-09-21')
    expect(state({ logs: [log('2026-09-21')] }).missed).toBeNull()
  })
  it('lịch đã hết hạn thì không nhắc buổi bỏ lỡ cũ, chỉ mời tạo lịch mới', () => {
    const s = state({ plan: plan('2026-09-14', [['2026-09-14', 1], ['2026-09-16', 3]]) })
    expect(s.kind).toBe('setup')
    expect(s.missed).toBeUndefined()
  })
  it('lịch của tuần sau (chưa bắt đầu) → hôm nay nghỉ, báo lịch bắt đầu sau', () => {
    const s = state({ plan: plan('2026-09-28', [['2026-09-28', 1], ['2026-09-30', 3]]) })
    expect(s).toMatchObject({ kind: 'rest', planStartsLater: true })
    expect(s.next.date).toBe('2026-09-28')
  })
  it('số ngày kể từ buổi tập gần nhất', () => {
    expect(state({ logs: [] }).daysSinceLast).toBeNull()
    expect(state({ logs: [log('2026-09-10'), log('2026-09-16')] }).daysSinceLast).toBe(7)
    expect(state({ logs: [log('2026-09-23')] }).daysSinceLast).toBe(0)
  })
  it('chuyển tiếp cờ cần hỏi bác sĩ', () => {
    expect(state({ profile: { ...profile, needsDoctorCheck: true } }).needsDoctorCheck).toBe(true)
  })
})

describe('Bài không còn phù hợp sau khi hồ sơ đổi', () => {
  const kho = [
    { id: 'squat', avoidIfInjury: ['knee'] },
    { id: 'bridge', avoidIfInjury: [] },
    { id: 'nhan-thieu' },
  ]
  const buoi = (...ids) => ({ session: { items: ids.map((id) => ({ exerciseId: id, name: `Bài ${id}` })) } })
  it('phát hiện bài chống chỉ định với chấn thương hiện tại', () => {
    expect(unsafeItems(buoi('squat', 'bridge'), ['knee'], kho)).toEqual(['Bài squat'])
    expect(unsafeItems(buoi('squat', 'bridge'), [], kho)).toEqual([])
    expect(unsafeItems(buoi('squat', 'bridge'), ['shoulder'], kho)).toEqual([])
  })
  it('bài chưa gắn nhãn hoặc không còn trong kho bị coi là không an toàn', () => {
    expect(unsafeItems(buoi('nhan-thieu'), [], kho)).toEqual(['Bài nhan-thieu'])
    expect(unsafeItems(buoi('da-bi-xoa'), [], kho)).toEqual(['Bài da-bi-xoa'])
  })
})