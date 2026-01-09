import React from 'react'

type ChartTooltipItem = {
  label?: string
  value: string | number
  color?: string
  emphasize?: boolean
  valueClassName?: string
}

type ChartTooltipProps = {
  title?: string
  items: ChartTooltipItem[]
  align?: 'center' | 'start'
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ title, items, align = 'center' }) => {
  if (!items || items.length === 0) return null

  const textAlign = align === 'start' ? 'text-left' : 'text-center'

  return (
    <div className="rounded-lg border border-blue-500/60 bg-[#0f172a] px-3 py-2 text-xs text-white shadow-lg">
      {title ? <div className={`font-semibold mb-1 ${textAlign}`}>{title}</div> : null}
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className={`flex items-center ${align === 'start' ? 'justify-between gap-3' : 'justify-center gap-2'}`}>
            {item.color ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /> : null}
            {item.label ? <span className="text-white/80">{item.label}</span> : null}
            <span className={item.valueClassName ?? `text-purple-300 font-semibold ${item.emphasize ? 'text-emerald-300' : ''}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ACTIVE_BAR_HOVER = { fillOpacity: 0.9, stroke: '#d81f11e7', strokeWidth: 1 }
