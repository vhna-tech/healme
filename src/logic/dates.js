// Ngày tháng theo GIỜ ĐỊA PHƯƠNG (không dùng toISOString vì nó tính theo giờ UTC, dễ lệch ngày).
const pad = (n) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD' */
export const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** 'YYYY-MM-DD' → Date (0h giờ địa phương) */
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)

/** Thứ Hai của tuần chứa ngày `date` (tuần bắt đầu từ thứ Hai) */
export function mondayOf(date) {
  const dow = (date.getDay() + 6) % 7 // T2=0 ... CN=6
  return addDays(date, -dow)
}

/** Date → 'dd/mm' */
export const fmtDayMonth = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`