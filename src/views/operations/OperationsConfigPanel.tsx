import React from 'react'
import { Settings } from 'lucide-react'

interface OperationsConfigPanelProps {
  supabaseUrl?: string;
  supabaseKey?: string;
}

const OperationsConfigPanel: React.FC<OperationsConfigPanelProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-white/70 h-full">
      <Settings className="w-16 h-16 mb-4 text-emerald-500/70" />
      <h3 className="text-2xl font-semibold mb-2">Painel de Configurações de Operações</h3>
      <p className="text-center max-w-md">
        Aqui serão gerenciadas as configurações específicas das operações.
      </p>
    </div>
  )
}

export default OperationsConfigPanel
