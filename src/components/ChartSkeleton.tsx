import React from 'react'

const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 shadow-lg backdrop-blur-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-2 bg-slate-700 rounded w-24 mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-32"></div>
        </div>
        <div className="w-4 h-4 bg-slate-700 rounded-full"></div>
      </div>
      <div className="flex justify-center gap-4 mt-3">
        <div className="h-3 bg-slate-700 rounded w-12"></div>
        <div className="h-3 bg-slate-700 rounded w-12"></div>
      </div>
      <div className="mt-4 flex items-end gap-6 border-b border-white/15 pb-2 px-2 h-[156px]">
        {[60, 80, 50, 70, 40, 90].map((h, i) => (
          <div key={i} className="flex-1 min-w-[60px] flex flex-col items-center gap-2">
            <div className="w-full bg-slate-700 rounded-t-sm" style={{ height: `${h}%` }}></div>
            <div className="h-2 bg-slate-700 rounded w-10/12"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ChartSkeleton