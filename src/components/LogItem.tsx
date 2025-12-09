import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

interface LogItemProps {
  message: string
}

const LogItem: React.FC<LogItemProps> = ({ message }) => {
  let icon: React.ReactNode
  let textColor = 'text-white/70'
  let cleanMessage = message

  if (message.startsWith('OoO')) {
    icon = <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
    textColor = 'text-emerald-300/90'
    cleanMessage = message.replace('OoO', '').trim()
  } else if (message.startsWith('XxX')) {
    icon = <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
    textColor = 'text-rose-400/90'
    cleanMessage = message.replace('XxX', '').trim()
  } else if (message.startsWith(':)')) {
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
    textColor = 'text-amber-300/90'
    cleanMessage = message.replace(':)', '').trim()
  } else {
    icon = <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
    textColor = 'text-white/80'
  }

  return (
    <div className="flex items-start gap-2">
      {icon}
      <span className={`flex-1 ${textColor}`}>{cleanMessage}</span>
    </div>
  )
}

export default LogItem