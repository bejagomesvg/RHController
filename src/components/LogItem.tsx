import { Check, X, AlertTriangle, Info } from 'lucide-react'

interface LogItemProps {
  message: string
}

const LogItem: React.FC<LogItemProps> = ({ message }) => {
  const lower = message.toLowerCase()

  const isSuccess = message.startsWith('OoO ')
  const isError =
    message.startsWith('XxX ') || lower.includes('campos obrigatorios faltando')
  const isWarning = message.startsWith(':)')
  const isInfo = !isSuccess && !isError && !isWarning

  const cleanMessage = message.replace(/^(OoO|XxX|\:\))\s*/, '')
  const parts = cleanMessage.split(/(\([^)]*\))/g)

  const baseClass = 'text-xs flex items-start gap-1 text-white/80'

  if (isSuccess) {
    return (
      <span className={baseClass}>
        <Check className="w-3 h-3 text-emerald-400 mt-0.5" />
        <span>{cleanMessage}</span>
      </span>
    )
  }

  if (isError) {
    return (
      <span className={baseClass}>
        <X className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" />
        <span>
          {parts.map((part, idx) =>
            part.startsWith('(') && part.endsWith(')') ? (
              <span key={idx} className="text-rose-300">
                {part}
              </span>
            ) : (
              <span key={idx}>{part}</span>
            )
          )}
        </span>
      </span>
    )
  }

  if (isWarning) {
    return (
      <span className={baseClass}>
        <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5" />
        <span>{cleanMessage}</span>
      </span>
    )
  }

  return (
    <span className={baseClass}>
      <Info className="w-3 h-3 text-sky-400 mt-0.5" />
      <span>{message}</span>
    </span>
  )
}

export default LogItem
