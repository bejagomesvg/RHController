import React, { useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react'

type ImportStatus = 'idle' | 'validating' | 'uploading' | 'done' | 'error'

interface TableLoadProps {
  onBack: () => void
  userName?: string
  userRole?: string
  title?: string
  description?: string
}

const TableLoad: React.FC<TableLoadProps> = ({
  onBack,
  userName = 'Usuario',
  userRole = 'Perfil nao informado',
  title = 'Carga de Tabelas',
  description = 'Importar massa de dados via planilha.',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sheetType, setSheetType] = useState<'CADASTRO' | 'HORAS_EXTRAS' | 'FECHAMENTO' | ''>('')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [messages, setMessages] = useState<string[]>([])

  const statusLabel: Record<ImportStatus, string> = {
    idle: 'Aguardando',
    validating: 'Validando planilha',
    uploading: 'Enviando dados',
    done: 'Concluido',
    error: 'Erro',
  }

  const pushMessage = (message: string) => {
    setMessages((prev) => [message, ...prev].slice(0, 6))
  }

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    setProgress(0)
    setStatus('idle')
    setMessages([])
    if (file) pushMessage(`Arquivo selecionado: ${file.name}`)
  }

  const simulateImport = async () => {
    if (!sheetType) {
      setStatus('error')
      pushMessage('Escolha o tipo de planilha antes de importar.')
      return
    }
    if (!selectedFile) {
      setStatus('error')
      pushMessage('Selecione um arquivo antes de importar.')
      return
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    try {
      setStatus('validating')
      setProgress(20)
      pushMessage(`Validando "${selectedFile.name}" (${sheetType})...`)
      await sleep(600)

      setStatus('uploading')
      setProgress(65)
      pushMessage('Enviando dados para o servidor...')
      await sleep(900)

      setStatus('done')
      setProgress(100)
      pushMessage('Importacao concluida.')
    } catch (error) {
      console.error('Erro na importacao simulada:', error)
      setStatus('error')
      pushMessage('Erro ao importar. Tente novamente.')
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setStatus('idle')
    setProgress(0)
    setMessages([])
  }

  const getStatusColor = () => {
    if (status === 'error') return 'text-amber-300'
    if (status === 'done') return 'text-emerald-300'
    return 'text-white/80'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-white text-2xl font-bold leading-tight">{title}</h2>
          <p className="text-white/70 text-sm mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 border border-white/15 px-4 py-3 rounded-xl shadow-inner shadow-black/20">
          <div>
            <p className="text-emerald-300 font-semibold leading-tight">{userName}</p>
            <p className="text-white/60 text-[11px] uppercase tracking-[0.25em]">{userRole}</p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-emerald-100 bg-white/10 border border-white/10 px-3 py-2 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-300/40 transition-colors text-xs font-semibold uppercase tracking-wide"
            title="Voltar para o dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                <div>
                  <p className="text-white font-semibold leading-tight">Importar planilha</p>
                  <p className="text-white/60 text-xs">Formatos aceitos: XLSX, CSV.</p>
                </div>
              </div>
              {selectedFile && (
                <button
                  className="text-white/60 hover:text-white transition-colors"
                  onClick={() => handleFileSelect(null)}
                  title="Limpar arquivo"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-white/70 mb-1">Tipo de planilha</label>
                <select
                  value={sheetType}
                  onChange={(e) => setSheetType(e.target.value as any)}
                  className="w-full bg-white/5 text-white text-sm border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
                >
                  <option value="">-- selecione --</option>
                  <option value="CADASTRO">CADASTRO</option>
                  <option value="HORAS_EXTRAS">HORAS EXTRAS</option>
                  <option value="FECHAMENTO">FECHAMENTO</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-white/70 mb-1">Arquivo selecionado</label>
                <div className="min-h-[38px] flex items-center text-sm text-white/80 border border-white/10 rounded-lg px-3 py-2 bg-white/5">
                  {selectedFile ? selectedFile.name : 'Nenhum arquivo selecionado'}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 ${
              status === 'error' ? 'border-amber-400/60 bg-amber-500/5' : 'border-white/15 bg-white/5'
            }`}
          >
            <Upload className="w-8 h-8 text-emerald-300" />
            <p className="text-white/80 text-sm text-center">
              Arraste a planilha aqui ou escolha um arquivo do seu computador.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                Escolher arquivo
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md bg-white/10 border border-white/15 text-white hover:bg-white/15 transition-colors"
                onClick={resetForm}
              >
                Limpar
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
            {selectedFile && (
              <div className="text-sm text-white/80">
                <span className="font-semibold text-white">{selectedFile.name}</span>
                {sheetType && <span className="text-white/60"> · {sheetType.replace('_', ' ')}</span>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Status: <span className={getStatusColor()}>{statusLabel[status]}</span></span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  status === 'done' ? 'bg-emerald-400' : status === 'error' ? 'bg-amber-300' : 'bg-emerald-300/80'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={simulateImport}
                disabled={status === 'uploading' || status === 'validating'}
                className="px-4 py-2 rounded-md bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {status === 'uploading' || status === 'validating' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ClipboardList className="w-4 h-4" />
                )}
                Importar
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-md bg-white/10 border border-white/15 text-white hover:bg-white/15 transition-colors"
                onClick={resetForm}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
              <p className="text-white font-semibold">Checklist rapido</p>
            </div>
            <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
              <li>Use cabeçalhos padronizados na primeira linha.</li>
              <li>Valores obrigatorios nao podem ficar vazios.</li>
              <li>Datas no formato ISO (YYYY-MM-DD).</li>
              <li>Campos numericos sem separador de milhar.</li>
            </ul>
            <button
              type="button"
              className="mt-2 px-4 py-2 rounded-md bg-white/10 border border-white/15 text-white hover:bg-white/15 transition-colors w-full flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Baixar modelo .xlsx
            </button>
          </div>

          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              <p className="text-white font-semibold">Log rapido</p>
            </div>
            {messages.length === 0 ? (
              <p className="text-white/60 text-sm">Nenhuma mensagem ainda.</p>
            ) : (
              <ul className="text-white/80 text-sm space-y-1">
                {messages.map((msg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-[3px] block w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TableLoad
