import WeekPlan from '../components/WeekPlan.jsx'
import BusyGrid from '../components/BusyGrid.jsx'

export default function Schedule() {
  return (
    <div className="space-y-10">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 mb-2 border border-emerald-200/60">
          <span>📅</span> Lịch thông minh
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Lịch tập tuần</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Hệ thống tự động điều chỉnh bài tập theo thể trạng và né những giờ bạn bận.
        </p>
      </div>

      <WeekPlan />

      <div id="busy" className="border-t border-slate-200/80 pt-8">
        <BusyGrid />
      </div>
    </div>
  )
}