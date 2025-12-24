import React from 'react'
import { Factory } from 'lucide-react'

interface OperationsProducaoPanelProps {
  supabaseUrl?: string;
  supabaseKey?: string;
}

const OperationsProducaoPanel: React.FC<OperationsProducaoPanelProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-white/70 h-full">
      <Factory className="w-16 h-16 mb-4 text-emerald-500/70" />
      <h3 className="text-2xl font-semibold mb-2">Painel de Produção</h3>
      <p className="text-center max-w-md">
        Aqui será implementada a visualização e gestão de dados de produção.
      </p>
    </div>
  )
}

export default OperationsProducaoPanel
