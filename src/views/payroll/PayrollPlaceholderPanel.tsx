import React from 'react'
import type { LucideIcon } from 'lucide-react'

type PayrollPlaceholderPanelProps = {
  icon: LucideIcon
  title: string
  description: string
}

const PayrollPlaceholderPanel: React.FC<PayrollPlaceholderPanelProps> = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center text-white/80 h-full gap-3">
    <Icon className="w-12 h-12 text-amber-300" />
    <p className="text-lg font-semibold">{title}</p>
    <p className="text-sm text-white/60 text-center max-w-md">{description}</p>
  </div>
)

export default PayrollPlaceholderPanel
