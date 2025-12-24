import React from 'react'
import { CalendarX2 } from 'lucide-react'

interface OperationsFaltasPanelProps {
  supabaseUrl?: string;
  supabaseKey?: string;
}

const OperationsFaltasPanel: React.FC<OperationsFaltasPanelProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-white/70 h-full">
      <CalendarX2 className="w-16 h-16 mb-4 text-emerald-500/70" />
      <h3 className="text-2xl font-semibold mb-2">Painel de Faltas</h3>
      <p className="text-center max-w-md">
        Aqui será implementada a visualização e gestão de faltas dos colaboradores.
      </p>
    </div>
  )
}

export default OperationsFaltasPanel