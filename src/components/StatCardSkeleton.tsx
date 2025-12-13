import React from 'react'

const StatCardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 h-32 flex flex-col justify-between animate-pulse">
      <div className="h-3 bg-slate-700 rounded w-3/4"></div>
      <div className="h-8 bg-slate-700 rounded w-1/2"></div>
    </div>
  )
}

export default StatCardSkeleton