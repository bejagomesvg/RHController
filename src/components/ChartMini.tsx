import React from 'react'
import { TrendingUp } from 'lucide-react'

interface ChartMiniProps {
  series: Array<{
    label: string
    total60: number
    total100: number
  }>
  formatDecimalToTime: (minutes: number) => string
}

const ChartMini: React.FC<ChartMiniProps> = ({ series: chartSeries, formatDecimalToTime }) => {
  if (chartSeries.length === 0) {
    return <div className="text-white/60 text-sm">Sem dados suficientes para o gráfico.</div>
  }

  const maxVal = Math.max(...chartSeries.map((c) => Math.max(c.total60, c.total100, 1)))
  const width = 300
  const height = 140
  const pad = 20
  const step = chartSeries.length > 1 ? (width - pad * 2) / (chartSeries.length - 1) : 0

  const toPoint = (val: number, idx: number) => {
    const x = pad + step * idx
    const y = height - pad - (val / maxVal) * (height - pad * 2)
    return `${x},${y}`
  }

  const line60 = chartSeries.map((c, i) => toPoint(c.total60, i)).join(' ')
  const line100 = chartSeries.map((c, i) => toPoint(c.total100, i)).join(' ')

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2 text-white">
        <TrendingUp className="w-4 h-4 text-emerald-300" />
        <span className="text-sm font-semibold">Evolução Últimos 3 Meses</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
        <polyline points={line60} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        <polyline points={line100} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
        {chartSeries.map((c, i) => {
          const [x60, y60] = toPoint(c.total60, i).split(',').map(Number)
          const [x100, y100] = toPoint(c.total100, i).split(',').map(Number)
          return (
            <React.Fragment key={c.label}>
              <g className="group">
                <circle cx={x60} cy={y60} r="8" fill="transparent" />
                <circle cx={x60} cy={y60} r="4" fill="#3b82f6" className="transition-transform duration-200 group-hover:scale-125" />
                <text x={x60} y={y60 - 10} fill="#e2e8f0" fontSize="10" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity">{formatDecimalToTime(c.total60)}</text>
              </g>
              <g className="group">
                <circle cx={x100} cy={y100} r="8" fill="transparent" />
                <circle cx={x100} cy={y100} r="4" fill="#a855f7" className="transition-transform duration-200 group-hover:scale-125" />
                <text x={x100} y={y100 - 10} fill="#e2e8f0" fontSize="10" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity">{formatDecimalToTime(c.total100)}</text>
              </g>
            </React.Fragment>
          )
        })}
        {chartSeries.map((c, i) => {
          const x = pad + step * i
          const y = height - 5
          return (
            <text key={c.label} x={x} y={y} fill="#e2e8f0" fontSize="10" textAnchor="middle">
              {c.label}
            </text>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-white/80">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> Horas 60%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500" /> Horas 100%</span>
      </div>
    </div>
  )
}

export default ChartMini