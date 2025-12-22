import React, { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

interface VerticalBarChartProps {
  title: string
  subtitle?: string
  data: Array<Record<string, any> & { label: string }>
  series: Array<{ key: string; label: string; color: string }>
  formatValue: (val: number) => string
}

const VerticalBarChart: React.FC<VerticalBarChartProps> = ({ title, subtitle, data, series, formatValue }) => {
  const sortedData = data
    .filter((d) => series.reduce((sum, s) => sum + (Number(d[s.key]) || 0), 0) > 0)
    .sort((a, b) => {
      const totalA = series.reduce((sum, s) => sum + (Number(a[s.key]) || 0), 0)
      const totalB = series.reduce((sum, s) => sum + (Number(b[s.key]) || 0), 0)
      return totalB - totalA
    })
  const maxVal = Math.max(...sortedData.map((d) => series.reduce((sum, s) => sum + (Number(d[s.key]) || 0), 0)), 1)
  const barAreaHeight = 160

  const yAxisLabels = useMemo(() => {
    if (maxVal <= 1) return []
    const step = maxVal / 4
    return Array.from({ length: 5 }, (_, i) => formatValue(i * step))
  }, [maxVal, formatValue])

  if (!data.length || maxVal <= 0) {
    return (
      <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 shadow-lg backdrop-blur-sm text-white/70 text-sm">
        Sem dados por setor.
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between text-white">
        <div>
          {subtitle && <p className="text-[10px] uppercase tracking-wide text-white/50">{subtitle}</p>}
          <h5 className="text-sm font-semibold">{title}</h5>
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-300" />
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-white/70 flex-wrap">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="mt-4 grid" style={{ gridTemplateColumns: 'auto 1fr' }}>
        <div className="flex flex-col justify-between text-[10px] text-white/50 pr-2">
          {yAxisLabels.slice().reverse().map((label: string) => <div key={label}>{label}</div>)}
        </div>
        <div className="relative overflow-x-auto">
          <div className="absolute top-0 left-0 w-full h-full grid grid-rows-4" style={{ height: `${barAreaHeight}px` }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-t border-white/10"></div>
            ))}
          </div>
          <div
            className="relative flex items-end gap-6 border-l border-white/10 pl-4"
            style={{ minWidth: `${sortedData.length * 80}px`, height: `${barAreaHeight}px` }}
          >
            {sortedData.map((item) => {
              const totalValue = series.reduce((sum, s) => sum + (Number(item[s.key]) || 0), 0)
              const totalLabel = formatValue(totalValue)

              return (
                <div key={item.label} className="group relative flex flex-col justify-end items-center gap-2 flex-1 min-w-[50px]">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 w-max bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-xs shadow-2xl z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="font-bold text-white mb-1">{item.label}</div>
                    <div className="space-y-1">
                      {series.map((s) => {
                        const value = Number(item[s.key]) || 0
                        if (value === 0) return null // Do not show if value is zero
                        return (
                          <div key={s.key} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-white/70">{s.label}:</span>
                            <span className="font-semibold text-white">{formatValue(value)}</span>
                          </div>
                        )
                      })}
                    </div>
                     <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                        <span className="text-white/70 font-bold">Total:</span>
                        <span className="font-bold text-white">{totalLabel}</span>
                    </div>
                  </div>

                  {totalValue > 0 && (
                    <div className="absolute -top-5 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {totalLabel}
                    </div>
                  )}
                  <div
                    className="w-8 relative flex flex-col-reverse rounded-t-md overflow-hidden transition-all duration-300 group-hover:brightness-125"
                    style={{ height: `${(totalValue / maxVal) * barAreaHeight}px`, transformOrigin: 'bottom' }}
                  >
                    {series.map((s) => {
                      const value = Number(item[s.key]) || 0
                      const segmentHeightPercent = totalValue > 0 ? (value / totalValue) * 100 : 0
                      return <div key={s.key} style={{ height: `${segmentHeightPercent}%`, backgroundColor: s.color }} />
                    })}
                  </div>
                  <span className="text-[11px] text-white/80 text-center w-full truncate pt-1" title={item.label}>
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerticalBarChart
