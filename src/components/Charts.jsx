import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler,
} from 'chart.js'
import { parseYmd, fmtDayMonth } from '../logic/dates.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler)

const EMERALD = '#10b981'
const EMERALD_LIGHT = '#a7f3d0'
const SLATE_GRID = '#f1f5f9'
const SLATE_TEXT = '#64748b'

/** Biểu đồ đường: cân nặng theo thời gian. weights = [{date:'YYYY-MM-DD', kg}] đã sắp theo ngày. */
export function WeightChart({ weights }) {
  const multiYear = new Set(weights.map((w) => w.date.slice(0, 4))).size > 1
  const labels = weights.map((w) => {
    const base = fmtDayMonth(parseYmd(w.date))
    return multiYear ? `${base}/${w.date.slice(2, 4)}` : base
  })

  const data = {
    labels,
    datasets: [{
      label: 'Cân nặng (kg)',
      data: weights.map((w) => w.kg),
      borderColor: EMERALD,
      borderWidth: 3,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: EMERALD,
      pointBorderWidth: 2,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.parsed.y} kg`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: SLATE_TEXT, font: { family: 'Plus Jakarta Sans', size: 11 } },
      },
      y: {
        grid: { color: SLATE_GRID },
        ticks: {
          color: SLATE_TEXT,
          font: { family: 'Plus Jakarta Sans', size: 11 },
          callback: (v) => `${v} kg`,
        },
      },
    },
  }

  return (
    <div className="h-60 w-full pt-2">
      <Line data={data} options={options} role="img" aria-label="Biểu đồ cân nặng theo thời gian" />
    </div>
  )
}

/**
 * Biểu đồ cột: số buổi hoặc số phút mỗi tuần.
 * series = [{label, sessions, minutes}] (cũ → mới). mode = 'sessions' | 'minutes'.
 */
export function WeeklyChart({ series, mode, goal }) {
  const isSessions = mode === 'sessions'
  const values = series.map((s) => (isSessions ? s.sessions : s.minutes))

  const data = {
    labels: series.map((s) => s.label),
    datasets: [{
      label: isSessions ? 'Số buổi' : 'Số phút',
      data: values,
      backgroundColor: isSessions ? values.map((v) => (v >= goal ? EMERALD : EMERALD_LIGHT)) : EMERALD,
      borderRadius: 8,
      borderSkipped: false,
      hoverBackgroundColor: '#059669',
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (context) => (isSessions ? `${context.parsed.y} buổi tập` : `${context.parsed.y} phút`),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: SLATE_TEXT, font: { family: 'Plus Jakarta Sans', size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: SLATE_GRID },
        ticks: {
          color: SLATE_TEXT,
          font: { family: 'Plus Jakarta Sans', size: 11 },
          precision: 0,
        },
      },
    },
  }

  return (
    <div className="h-60 w-full pt-2">
      <Bar data={data} options={options} role="img" aria-label={isSessions ? 'Biểu đồ số buổi tập mỗi tuần' : 'Biểu đồ số phút tập mỗi tuần'} />
    </div>
  )
}