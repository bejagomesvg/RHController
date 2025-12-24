import React from 'react'
import { Bell } from 'lucide-react'

const PayrollAlertsPanel: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-white/70 h-full">
      <Bell className="w-16 h-16 mb-4 text-emerald-500/70" />
      <h3 className="text-2xl font-semibold mb-2">Painel de Alertas</h3>
      <p className="text-center max-w-md">
        Este painel exibirá alertas e notificações importantes relacionados à folha de pagamento e aos colaboradores.
      </p>
    </div>
  )
}

export default PayrollAlertsPanel
