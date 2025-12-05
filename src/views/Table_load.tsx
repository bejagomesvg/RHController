import React, { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
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
import { validateEmployeeSheet, validateEmployeeRow, formatCPF, formatDate, formatSalary } from '../utils/employeeParser'

type ImportStatus = 'idle' | 'validating' | 'uploading' | 'done' | 'error'
type SheetData = Record<string, any>[]

interface RowError {
  rowIndex: number
  errors: string[]
}

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
  const [sheetData, setSheetData] = useState<SheetData>([])
  const [columns, setColumns] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<RowError[]>([])
  const [sheetHeaderError, setSheetHeaderError] = useState<string[]>([])

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
    setSheetData([])
    setColumns([])
    if (file) {
      pushMessage(`Arquivo selecionado: ${file.name}`)
      // Ler automaticamente o arquivo ao selecionar
      readExcelFile(file)
    }
  }

  const readExcelFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as SheetData
        
        if (jsonData.length === 0) {
          pushMessage('Arquivo vazio.')
          setSheetData([])
          setColumns([])
          setValidationErrors([])
          setSheetHeaderError([])
          return
        }

        const cols = Object.keys(jsonData[0] || {})
        
        // Validar headers obrigatórios
        const headerValidation = validateEmployeeSheet(cols)
        if (!headerValidation.valid) {
          setSheetHeaderError(headerValidation.missingFields)
          pushMessage(`❌ Campos obrigatórios faltando: ${headerValidation.missingFields.join(', ')}`)
          setSheetData([])
          setColumns([])
          setValidationErrors([])
          return
        }

        // Headers válidos, limpar erro
        setSheetHeaderError([])
        pushMessage(`✅ Headers validados: ${cols.length} coluna(s)`)

        // Validar dados de cada linha
        const rowErrors: RowError[] = []
        jsonData.forEach((row, index) => {
          const validation = validateEmployeeRow(row)
          if (!validation.valid) {
            rowErrors.push({
              rowIndex: index + 2, // +2 pois começa em 1 e há header
              errors: validation.errors,
            })
          }
        })

        if (rowErrors.length > 0) {
          setValidationErrors(rowErrors)
          pushMessage(`⚠️  ${rowErrors.length} linha(s) com erro(s) de validação`)
        } else {
          setValidationErrors([])
          pushMessage(`✅ Todas as ${jsonData.length} linhas validadas com sucesso`)
        }

        setColumns(cols)
        setSheetData(jsonData)
        pushMessage(`Planilha carregada: ${jsonData.length} linha(s)`)
      } catch (error) {
        console.error('Erro ao ler arquivo:', error)
        pushMessage('❌ Erro ao ler o arquivo.')
        setSheetData([])
        setColumns([])
        setValidationErrors([])
        setSheetHeaderError([])
      }
    }
    reader.readAsArrayBuffer(file)
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
    setSheetData([])
    setColumns([])
    setValidationErrors([])
    setSheetHeaderError([])
  }

  const getStatusColor = () => {
    if (status === 'error') return 'text-amber-300'
    if (status === 'done') return 'text-emerald-300'
    return 'text-white/80'
  }

  const formatDisplayValue = (columnName: string, value: any): string => {
    if (!value) return '-'
    
    switch (columnName) {
      case 'CPF':
        return formatCPF(value)
      case 'Nascimento':
      case 'Admissão':
      case 'Data Afastamento':
        return formatDate(value)
      case 'Valor Salário':
        return formatSalary(value)
      default:
        return String(value)
    }
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
        {/* Coluna Esquerda - Formulário */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-4">
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

            <div className="flex flex-col sm:flex-row gap-3 items-end">
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-md bg-transparent border border-emerald-500/60 text-emerald-300 font-semibold hover:bg-emerald-500/20 hover:border-emerald-400/80 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Upload className="w-5 h-5" />
                Upload
              </button>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-2 flex flex-col items-center justify-center gap-3 ${
              status === 'error' ? 'border-amber-400/60 bg-amber-500/5' : 'border-white/15 bg-white/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
            {/* Log rápido */}
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <p className="text-white font-semibold">Log rápido</p>
              </div>
              {messages.length === 0 ? (
                <p className="text-white/60 text-sm">Nenhuma mensagem ainda.</p>
              ) : (
                <ul className="text-white/80 text-sm space-y-1 max-h-[200px] overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-[3px] block w-1.5 h-1.5 rounded-full bg-emerald-300 flex-shrink-0" />
                      <span className="text-xs">{msg}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {selectedFile && (
              <div className="text-sm text-white/80 border-t border-white/10 pt-3 w-full">
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

            <div className="flex items-button justify-center gap-2">
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

        {/* Coluna Direita - Checklist Expandido com Tabela */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto">
          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4">
            {/* Tabela de Histórico */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-3 py-2 text-white/70 font-semibold">Data</th>
                    <th className="text-left px-3 py-2 text-white/70 font-semibold">Arquivos</th>
                    <th className="text-left px-3 py-2 text-white/70 font-semibold">Status</th>
                    <th className="text-left px-3 py-2 text-white/70 font-semibold">Usuário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">03/12/2025</td>
                    <td className="px-3 py-2 text-white/80">funcionarios.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300">
                        ✓
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">Administrador</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">02/12/2025</td>
                    <td className="px-3 py-2 text-white/80">horas_extras.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300">
                        ✓
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">RH Manager</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">01/12/2025</td>
                    <td className="px-3 py-2 text-white/80">folha_pagamento.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/30 text-amber-300">
                        ⚠
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">Gerente RH</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">01/12/2025</td>
                    <td className="px-3 py-2 text-white/80">folha_pagamento.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/30 text-amber-300">
                        ⚠
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">Gerente RH</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">01/12/2025</td>
                    <td className="px-3 py-2 text-white/80">folha_pagamento.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/30 text-amber-300">
                        ⚠
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">Gerente RH</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">02/12/2025</td>
                    <td className="px-3 py-2 text-white/80">horas_extras.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300">
                        ✓
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">RH Manager</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">02/12/2025</td>
                    <td className="px-3 py-2 text-white/80">horas_extras.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300">
                        ✓
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">RH Manager</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">02/12/2025</td>
                    <td className="px-3 py-2 text-white/80">horas_extras.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300">
                        ✓
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">RH Manager</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">02/12/2025</td>
                    <td className="px-3 py-2 text-white/80">horas_extras.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300">
                        ✓
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">RH Manager</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">02/12/2025</td>
                    <td className="px-3 py-2 text-white/80">horas_extras.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300">
                        ✓
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">RH Manager</td>
                  </tr>                                                                                          
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white/80">01/12/2025</td>
                    <td className="px-3 py-2 text-white/80">folha_pagamento.xlsx</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/30 text-red-300">
                        ✗ 
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">Gerente RH</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Mensagens, Erros e Tabela - Full Width Abaixo */}
      <div className="space-y-4">
        {sheetHeaderError.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-400/60 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-semibold">Campos obrigatórios faltando:</p>
                <ul className="text-amber-200 text-sm mt-2 space-y-1">
                  {sheetHeaderError.map((field, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {sheetData.length > 0 && validationErrors.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-400/60 rounded-xl p-4 space-y-2 max-h-[300px] overflow-y-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-semibold">{validationErrors.length} linha(s) com erro(s):</p>
                <ul className="text-amber-200 text-xs mt-2 space-y-2">
                  {validationErrors.slice(0, 20).map((error, idx) => (
                    <li key={idx} className="space-y-1">
                      <span className="text-amber-300 font-semibold">Linha {error.rowIndex}:</span>
                      <ul className="ml-4 space-y-0.5">
                        {error.errors.map((err, errIdx) => (
                          <li key={errIdx} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
                {validationErrors.length > 20 && (
                  <p className="text-amber-300 text-xs mt-2">... e mais {validationErrors.length - 20} linha(s)</p>
                )}
              </div>
            </div>
          </div>
        )}

        {sheetData.length > 0 && (
          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
              <p className="text-white font-semibold">Preview dos dados ({sheetData.length} linha(s))</p>
            </div>
            <div className="overflow-x-auto border border-white/10 rounded-lg">
              <table className="w-full text-sm text-white/80">
                <thead className="bg-slate-800/80 border-b border-white/10">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-2 text-left font-semibold text-white/90 text-xs uppercase tracking-wide">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}>
                      {columns.map((col) => (
                        <td key={`${idx}-${col}`} className="px-4 py-2 text-white/70 truncate max-w-xs">
                          {formatDisplayValue(col, row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sheetData.length > 10 && (
              <p className="text-white/60 text-xs text-center py-2">
                Exibindo 10 de {sheetData.length} linhas
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TableLoad
