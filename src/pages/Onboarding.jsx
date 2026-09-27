import { useState } from 'react'
import useLocalStorage from '../store/useLocalStorage.js'
import { calcBMI, bmiCategory } from '../logic/profile.js'

// ---------- Các lựa chọn ----------
const STEPS = ['Thể trạng', 'Mục tiêu', 'Chấn thương', 'Sức khoẻ', 'Lịch tập']

const GOALS = [
  { value: 'weight_loss', label: 'Giảm cân & Đốt mỡ', desc: 'Đốt calo, giảm mỡ thừa và thon gọn cơ thể', icon: '🎯' },
  { value: 'muscle_gain', label: 'Tăng cơ & Săn chắc', desc: 'Rèn luyện sức mạnh, tăng cơ bắp và độ săn chắc', icon: '💪' },
  { value: 'flexibility', label: 'Giãn cơ & Dẻo dai', desc: 'Cải thiện linh hoạt khớp, giảm nhức mỏi cơ thể', icon: '🧘' },
]

const LEVELS = [
  { value: 'beginner', label: 'Mới bắt đầu', desc: 'Ít vận động hoặc chưa từng tập thể thao đều đặn', icon: '🌱' },
  { value: 'intermediate', label: 'Trung bình', desc: 'Đã tập luyện đều đặn từ vài tháng trở lên', icon: '⚡' },
  { value: 'advanced', label: 'Nâng cao', desc: 'Thể lực tốt, tập luyện đều đặn trên 1 năm', icon: '🏆' },
]

const INJURIES = [
  { value: 'lower_back', label: 'Đau lưng dưới', icon: '🦴' },
  { value: 'knee', label: 'Đau gối', icon: '🦵' },
  { value: 'shoulder', label: 'Đau vai', icon: '💪' },
  { value: 'wrist', label: 'Đau cổ tay', icon: '✋' },
  { value: 'ankle', label: 'Đau cổ chân', icon: '🦶' },
  { value: 'neck', label: 'Đau cổ', icon: '👤' },
]

const EQUIPMENT = [{ value: 'dumbbell', label: 'Tạ đơn (Dumbbell)', icon: '🏋️' }]
const DAYS = [2, 3, 4, 5, 6]
const MINUTES = [15, 20, 30, 45, 60]

const PERIODS = [
  { value: 'any', label: 'Lúc nào cũng được', desc: 'Linh hoạt theo giờ rảnh', icon: '⏰' },
  { value: 'morning', label: 'Buổi sáng', desc: '06:00 – 12:00', icon: '🌅' },
  { value: 'afternoon', label: 'Buổi chiều', desc: '12:00 – 17:00', icon: '☀️' },
  { value: 'evening', label: 'Buổi tối', desc: '17:00 – 22:00', icon: '🌙' },
]

const SCREENING = [
  { id: 'chestPain', text: 'Bạn có bị đau tức ngực khi vận động hoặc khi nghỉ ngơi không?' },
  { id: 'dizziness', text: 'Bạn có thường xuyên bị chóng mặt hoặc ngất xỉu không?' },
  { id: 'heartBP', text: 'Bác sĩ có từng chẩn đoán bạn mắc bệnh tim hoặc huyết áp cao?' },
  { id: 'pregnant', text: 'Bạn đang mang thai hoặc mới sinh con trong thời gian gần đây?' },
  { id: 'medical', text: 'Bạn có bệnh mãn tính hoặc đang dùng thuốc cần hạn chế vận động?' },
]

const labelOf = (list, value) => list.find((x) => x.value === value)?.label ?? value

function emptyForm() {
  return {
    age: '', heightCm: '', weightKg: '',
    goal: '', level: '',
    injuries: [], equipment: [],
    daysPerWeek: 3, sessionMinutes: 30, preferredPeriod: 'any',
    screening: Object.fromEntries(SCREENING.map((q) => [q.id, null])),
    doctorAck: false,
  }
}

function toForm(p) {
  if (!p) return emptyForm()
  return {
    age: String(p.age), heightCm: String(p.heightCm), weightKg: String(p.weightKg),
    goal: p.goal, level: p.level,
    injuries: p.injuries ?? [], equipment: p.equipment ?? [],
    daysPerWeek: p.daysPerWeek ?? 3, sessionMinutes: p.sessionMinutes ?? 30,
    preferredPeriod: p.preferredPeriod ?? 'any',
    screening: p.screening ?? Object.fromEntries(SCREENING.map((q) => [q.id, null])),
    doctorAck: !!p.needsDoctorCheck,
  }
}

const anyYes = (screening) => SCREENING.some((q) => screening[q.id] === true)

function buildProfile(f) {
  return {
    age: Number(f.age),
    heightCm: Number(f.heightCm),
    weightKg: Number(f.weightKg),
    goal: f.goal,
    level: f.level,
    injuries: f.injuries,
    equipment: f.equipment,
    daysPerWeek: f.daysPerWeek,
    sessionMinutes: f.sessionMinutes,
    preferredPeriod: f.preferredPeriod === 'any' ? undefined : f.preferredPeriod,
    screening: f.screening,
    needsDoctorCheck: anyYes(f.screening),
    updatedAt: new Date().toISOString(),
  }
}

function safeBMI(weightKg, heightCm) {
  try {
    const bmi = calcBMI(Number(weightKg), Number(heightCm))
    return { bmi, label: bmiCategory(bmi) }
  } catch {
    return null
  }
}

function validateStep(step, f) {
  if (step === 0) {
    const age = Number(f.age)
    if (!Number.isInteger(age) || age < 14 || age > 90) return 'Tuổi cần là số nguyên từ 14 đến 90.'
    const h = Number(f.heightCm)
    if (!(h >= 100 && h <= 250)) return 'Chiều cao cần từ 100 đến 250 cm.'
    const w = Number(f.weightKg)
    if (!(w >= 20 && w <= 300)) return 'Cân nặng cần từ 20 đến 300 kg.'
  }
  if (step === 1) {
    if (!f.goal) return 'Hãy chọn một mục tiêu luyện tập.'
    if (!f.level) return 'Hãy chọn trình độ thể lực hiện tại.'
  }
  if (step === 3) {
    if (SCREENING.some((q) => f.screening[q.id] === null)) return 'Hãy trả lời đầy đủ tất cả các câu hỏi sức khoẻ.'
    if (anyYes(f.screening) && !f.doctorAck) return 'Hãy tick vào ô xác nhận tư vấn bác sĩ bên dưới để tiếp tục.'
  }
  return ''
}

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

// ---------- UI Subcomponents ----------
function Choice({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`btn-tactile flex items-center justify-between rounded-2xl border p-4 text-left text-sm transition-all min-h-[48px] ${
        selected
          ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500 font-semibold text-emerald-950 shadow-sm'
          : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function NumberField({ id, label, unit, value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-14 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[48px]"
        />
        <span className="absolute right-4 text-xs font-bold text-slate-400 select-none">{unit}</span>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ---------- Màn hình xem hồ sơ đã lưu ----------
function ProfileView({ profile, onEdit, onReset }) {
  const b = safeBMI(profile.weightKg, profile.heightCm)
  const rows = [
    { label: 'Tuổi', val: `${profile.age} tuổi`, icon: '🎂' },
    { label: 'Chiều cao', val: `${profile.heightCm} cm`, icon: '📏' },
    { label: 'Cân nặng', val: `${profile.weightKg} kg`, icon: '⚖️' },
    { label: 'Mục tiêu', val: labelOf(GOALS, profile.goal), icon: '🎯' },
    { label: 'Trình độ', val: labelOf(LEVELS, profile.level), icon: '⚡' },
    {
      label: 'Chấn thương / Vùng đau',
      val: profile.injuries.length ? profile.injuries.map((v) => labelOf(INJURIES, v)).join(', ') : 'Không có',
      icon: '🛡️',
    },
    {
      label: 'Dụng cụ tập',
      val: profile.equipment.length ? profile.equipment.map((v) => labelOf(EQUIPMENT, v)).join(', ') : 'Tập tự do (không dụng cụ)',
      icon: '🏋️',
    },
    { label: 'Tần suất', val: `${profile.daysPerWeek} buổi / tuần`, icon: '📅' },
    { label: 'Thời lượng', val: `${profile.sessionMinutes} phút / buổi`, icon: '⏱️' },
    { label: 'Khung giờ ưa thích', val: labelOf(PERIODS, profile.preferredPeriod ?? 'any'), icon: '⏰' },
  ]

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60 mb-1">
            <span>✓</span> Hồ sơ đã kích hoạt
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Hồ sơ cá nhân</h1>
        </div>
      </div>

      {/* BMI Hero Card */}
      {b && (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">Chỉ số thể trạng BMI</span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur-xs">
              {b.label}
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-3">
            <p className="text-5xl font-black tracking-tight">{b.bmi}</p>
          </div>
          <p className="text-xs opacity-90 leading-relaxed">
            BMI là chỉ số tham khảo chiều cao & cân nặng. Hệ thống sẽ kết hợp cùng mục tiêu của bạn để phân bổ bài tập hợp lý nhất.
          </p>
        </div>
      )}

      {profile.needsDoctorCheck && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 shadow-xs">
          <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-bold">Lưu ý sức khoẻ: </span>
            Bạn có câu trả lời &quot;Có&quot; ở phần sàng lọc. Hãy nhớ tham khảo ý kiến bác sĩ trước khi tập luyện nặng.
          </div>
        </div>
      )}

      {/* Details List */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-2 shadow-sm">
        <dl className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between p-3.5 text-xs sm:text-sm">
              <dt className="flex items-center gap-2 text-slate-500 font-medium">
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </dt>
              <dd className="text-right font-bold text-slate-900">{r.val}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onEdit}
          className="btn-tactile flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 min-h-[48px]"
        >
          Chỉnh sửa hồ sơ
        </button>
        <button
          type="button"
          onClick={onReset}
          className="btn-tactile rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 min-h-[48px]"
        >
          Xoá hồ sơ và làm lại
        </button>
      </div>
    </div>
  )
}

// ---------- Trang chính ----------
export default function Onboarding() {
  const [saved, setSaved] = useLocalStorage('profile', null)
  const [editing, setEditing] = useState(!saved)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => toForm(saved))
  const [tried, setTried] = useState(false)

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  if (!editing && saved) {
    return (
      <ProfileView
        profile={saved}
        onEdit={() => {
          setForm(toForm(saved))
          setStep(0)
          setEditing(true)
        }}
        onReset={() => {
          if (window.confirm('Xoá toàn bộ hồ sơ hiện tại và thiết lập lại từ đầu?')) {
            setSaved(null)
            setForm(emptyForm())
            setStep(0)
            setEditing(true)
          }
        }}
      />
    )
  }

  const error = validateStep(step, form)
  const isLast = step === STEPS.length - 1
  const bmiInfo = safeBMI(form.weightKg, form.heightCm)

  function next() {
    if (error) {
      setTried(true)
      return
    }
    setTried(false)
    if (!isLast) {
      setStep(step + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setSaved(buildProfile(form))
      setEditing(false)
      setStep(0)
    }
  }

  function back() {
    setTried(false)
    setStep(step - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60 mb-1">
          <span>📝</span> Thiết lập hồ sơ
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Thông tin thể trạng của bạn</h1>
      </div>

      {/* Stepper Progress Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-emerald-700">Bước {step + 1} trên {STEPS.length}: {STEPS[step]}</span>
          <span className="text-slate-400">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-5">
        {/* Bước 1: Thể trạng */}
        {step === 0 && (
          <div className="space-y-4">
            <NumberField id="age" label="Tuổi của bạn" unit="tuổi" placeholder="VD: 25" value={form.age} onChange={(v) => update({ age: v })} />
            <NumberField id="height" label="Chiều cao" unit="cm" placeholder="VD: 170" value={form.heightCm} onChange={(v) => update({ heightCm: v })} />
            <NumberField id="weight" label="Cân nặng" unit="kg" placeholder="VD: 65" value={form.weightKg} onChange={(v) => update({ weightKg: v })} />

            {bmiInfo && (
              <div className="rounded-2xl bg-emerald-50/80 p-4 border border-emerald-200/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800 uppercase">Chỉ số BMI dự kiến</p>
                  <p className="text-2xl font-extrabold text-emerald-950">{bmiInfo.bmi}</p>
                </div>
                <span className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                  {bmiInfo.label}
                </span>
              </div>
            )}

            {Number(form.age) >= 14 && Number(form.age) < 18 && (
              <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-900 border border-amber-200/60">
                ⚠️ Bạn dưới 18 tuổi: Nên tập cùng người lớn và hỏi ý kiến huấn luyện viên hoặc bác sĩ chuyên khoa.
              </div>
            )}
          </div>
        )}

        {/* Bước 2: Mục tiêu & Trình độ */}
        {step === 1 && (
          <div className="space-y-6">
            <Section title="Mục tiêu luyện tập chính" subtitle="Hệ thống sẽ lựa chọn nhóm bài tập ưu tiên theo mục tiêu này">
              <div className="grid gap-2.5">
                {GOALS.map((g) => {
                  const isSelected = form.goal === g.value
                  return (
                    <Choice key={g.value} selected={isSelected} onClick={() => update({ goal: g.value })}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{g.icon}</span>
                        <div>
                          <span className="block font-bold text-slate-900">{g.label}</span>
                          <span className="block text-xs text-slate-500 font-normal">{g.desc}</span>
                        </div>
                      </div>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                        {isSelected && '✓'}
                      </div>
                    </Choice>
                  )
                })}
              </div>
            </Section>

            <Section title="Trình độ thể lực hiện tại" subtitle="Quyết định số hiệp, thời lượng nghỉ và mức tải ban đầu">
              <div className="grid gap-2.5">
                {LEVELS.map((l) => {
                  const isSelected = form.level === l.value
                  return (
                    <Choice key={l.value} selected={isSelected} onClick={() => update({ level: l.value })}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{l.icon}</span>
                        <div>
                          <span className="block font-bold text-slate-900">{l.label}</span>
                          <span className="block text-xs text-slate-500 font-normal">{l.desc}</span>
                        </div>
                      </div>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                        {isSelected && '✓'}
                      </div>
                    </Choice>
                  )
                })}
              </div>
            </Section>
          </div>
        )}

        {/* Bước 3: Chấn thương */}
        {step === 2 && (
          <Section
            title="Vùng cơ thể đang bị đau hoặc chấn thương?"
            subtitle="Có thể chọn nhiều vùng. Các bài tập gây áp lực lên vùng này sẽ tự động được loại bỏ"
          >
            <div className="grid grid-cols-2 gap-2.5">
              {INJURIES.map((i) => {
                const isSelected = form.injuries.includes(i.value)
                return (
                  <Choice
                    key={i.value}
                    selected={isSelected}
                    onClick={() => update({ injuries: toggle(form.injuries, i.value) })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{i.icon}</span>
                      <span className="font-bold">{i.label}</span>
                    </div>
                    <div className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                      {isSelected && '✓'}
                    </div>
                  </Choice>
                )
              })}
            </div>

            <Choice
              className="mt-2 w-full justify-center"
              selected={form.injuries.length === 0}
              onClick={() => update({ injuries: [] })}
            >
              <span className="font-bold">✨ Hoàn toàn khoẻ mạnh (Không có chấn thương)</span>
            </Choice>
          </Section>
        )}

        {/* Bước 4: Sàng lọc sức khoẻ PAR-Q */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Vui lòng trả lời trung thực để đảm bảo bài tập an toàn tuyệt đối cho bạn.
            </p>

            {SCREENING.map((q) => (
              <div key={q.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">{q.text}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <Choice
                    className="justify-center font-bold"
                    selected={form.screening[q.id] === true}
                    onClick={() => update({ screening: { ...form.screening, [q.id]: true } })}
                  >
                    Có
                  </Choice>
                  <Choice
                    className="justify-center font-bold"
                    selected={form.screening[q.id] === false}
                    onClick={() => update({ screening: { ...form.screening, [q.id]: false } })}
                  >
                    Không
                  </Choice>
                </div>
              </div>
            ))}

            {anyYes(form.screening) && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 shadow-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <span>⚠️</span>
                  <span>Khuyến cáo y tế: Bạn nên hỏi ý kiến bác sĩ</span>
                </div>
                <p className="text-amber-800">
                  Ứng dụng chỉ đưa ra gợi ý thể lực tham khảo và không thay thế chỉ định y khoa.
                </p>
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.doctorAck}
                    onChange={(e) => update({ doctorAck: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-amber-950">Tôi đã hiểu và cam kết lắng nghe cơ thể mình.</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Bước 5: Lịch tập & Dụng cụ */}
        {step === 4 && (
          <div className="space-y-6">
            <Section title="Dụng cụ tập luyện sẵn có" subtitle="Để trống nếu chỉ muốn tập bằng trọng lượng cơ thể (Bodyweight)">
              <div className="grid grid-cols-2 gap-2.5">
                {EQUIPMENT.map((e) => {
                  const isSelected = form.equipment.includes(e.value)
                  return (
                    <Choice
                      key={e.value}
                      selected={isSelected}
                      onClick={() => update({ equipment: toggle(form.equipment, e.value) })}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{e.icon}</span>
                        <span className="font-bold">{e.label}</span>
                      </div>
                      <div className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                        {isSelected && '✓'}
                      </div>
                    </Choice>
                  )
                })}
              </div>
            </Section>

            <Section title="Số buổi tập mong muốn mỗi tuần">
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update({ daysPerWeek: d })}
                    className={`btn-tactile rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold min-h-[44px] ${
                      form.daysPerWeek === d
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {d} buổi/tuần
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Thời lượng mỗi buổi tập">
              <div className="flex flex-wrap gap-2">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update({ sessionMinutes: m })}
                    className={`btn-tactile rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold min-h-[44px] ${
                      form.sessionMinutes === m
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {m} phút
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Khung thời gian ưu tiên tập trong ngày">
              <div className="grid grid-cols-2 gap-2.5">
                {PERIODS.map((p) => {
                  const isSelected = form.preferredPeriod === p.value
                  return (
                    <Choice key={p.value} selected={isSelected} onClick={() => update({ preferredPeriod: p.value })}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{p.icon}</span>
                        <div>
                          <span className="block font-bold text-slate-900">{p.label}</span>
                          <span className="block text-[11px] text-slate-500 font-normal">{p.desc}</span>
                        </div>
                      </div>
                    </Choice>
                  )
                })}
              </div>
            </Section>
          </div>
        )}
      </div>

      {/* Error alert */}
      {tried && error && (
        <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-xs sm:text-sm font-semibold text-rose-700 border border-rose-200">
          ⚠️ {error}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-3">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="btn-tactile rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-bold text-slate-700 hover:bg-slate-50 min-h-[48px]"
          >
            Quay lại
          </button>
        )}
        {saved && step === 0 && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn-tactile rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-bold text-slate-700 hover:bg-slate-50 min-h-[48px]"
          >
            Huỷ
          </button>
        )}
        <button
          type="button"
          onClick={next}
          className="btn-tactile flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 min-h-[48px]"
        >
          {isLast ? 'Lưu hồ sơ' : 'Tiếp tục'}
        </button>
      </div>
    </div>
  )
}