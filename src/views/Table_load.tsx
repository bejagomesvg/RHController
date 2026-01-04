import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { toast, Toaster } from 'react-hot-toast'
import {
  ArrowLeft,
  Check,
  TriangleAlert,
  X,
} from 'lucide-react'
import { REQUIRED_FIELDS, formatDate } from '../utils/employeeParser'
import { insertEmployees, fetchEmployeeRegistrations } from '../services/employeeService'
import { insertPayroll } from '../services/payrollService'
import { insertOvertime } from '../services/overtimeService'
import type { HistoryEntry } from '../models/history'
import { fetchHistory, insertHistory } from '../services/logService'
import { transformOvertimeApuracao, type OvertimeTransformResult } from '../utils/overtimeTransformer'
import { transformPayrollSheet, type PayrollTransformResult } from '../utils/payrollTransformer'
import ImportForm from '../components/ImportForm'
import HistoryTable from '../components/HistoryTable'
import DataPreview from '../components/DataPreview'
import PayrollConflictModal from '../components/PayrollConflictModal'
import OvertimeConflictModal from '../components/OvertimeConflictModal'
import { validateCadastroSheet } from './table_load/importCadastro'
import { validateFolhaSheet } from './table_load/importFolha'
import { validateOvertimeSheet } from './table_load/importOvertime'
export interface RowError {
  rowIndex: number
  errors: string[]
}

// State Management with useReducer
export type ImportStatus = 'idle' | 'validating' | 'uploading' | 'done' | 'error'
export type SheetData = Record<string, any>[]
export type SheetType = 'CADASTRO' | 'FOLHA PGTO' | 'HORAS EXTRAS' | ''

export interface State {
  sheetType: SheetType
  selectedFile: File | null
  status: ImportStatus
  progress: number
  messages: string[]
  sheetData: SheetData
  columns: string[]
  sheetHeaderError: string[]
  rowErrors: RowError[]
  importFinished: boolean
  showPreview: boolean
  payrollConflictRef: string | null
  payrollConflictPassword: string
  payrollPasswordErrorType: 'required' | 'invalid' | null
  payrollPasswordAttempts: number
  payrollConflictDate: string | null
  payrollDeletedSuccessfully: boolean
  overtimeConflictRef: string | null
  overtimeConflictDate: string | null
  overtimePassword: string
  overtimePasswordError: 'required' | 'invalid' | null
  overtimePasswordAttempts: number
  previewMeta: string
}

export type Action =
  | { type: 'SET_SHEET_TYPE'; payload: SheetType }
  | { type: 'SELECT_FILE'; payload: File | null }
  | { type: 'RESET_FORM' }
  | { type: 'RESET_FILE_INPUT' }
  | { type: 'SET_SHEET_DATA'; payload: SheetData }
  | { type: 'SET_PREVIEW_META'; payload: string }
  | { type: 'PUSH_MESSAGE'; payload: string }
  | { type: 'SET_STATUS'; payload: ImportStatus }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_PREVIEW'; payload: boolean }
  | { type: 'VALIDATION_ERROR'; payload: { messages: string[]; headers?: string[] } }
  | { type: 'FILE_READ_SUCCESS'; payload: { data: SheetData; columns: string[]; messages: string[]; rowErrors?: RowError[]; meta?: string } }
  | { type: 'SET_PAYROLL_CONFLICT'; payload: { ref: string; date: string } }
  | { type: 'UPDATE_PAYROLL_PASSWORD'; payload: string }
  | { type: 'SET_PAYROLL_PASSWORD_ERROR'; payload: 'required' | 'invalid' | null }
  | { type: 'INCREMENT_PASSWORD_ATTEMPTS' }
  | { type: 'RESET_PAYROLL_CONFLICT' }
  | { type: 'PAYROLL_DELETE_SUCCESS' }
  | { type: 'IMPORT_SUCCESS'; payload: { messages: string[] } }
  | { type: 'IMPORT_FAILURE'; payload: { messages: string[] } }
  | { type: 'SET_OVERTIME_CONFLICT'; payload: { ref: string; date: string } }
  | { type: 'UPDATE_OVERTIME_PASSWORD'; payload: string }
  | { type: 'SET_OVERTIME_PASSWORD_ERROR'; payload: 'required' | 'invalid' | null }
  | { type: 'INCREMENT_OVERTIME_PASSWORD_ATTEMPTS' }
  | { type: 'RESET_OVERTIME_CONFLICT' }
  | { type: 'OVERTIME_DELETE_SUCCESS' }

const initialState: State = {
  sheetType: '', selectedFile: null, status: 'idle', progress: 0, messages: [],
  sheetData: [], columns: [], sheetHeaderError: [], rowErrors: [], importFinished: false, showPreview: false,
  payrollConflictRef: null, payrollConflictPassword: '', payrollPasswordErrorType: null,
  payrollPasswordAttempts: 0, payrollConflictDate: null, payrollDeletedSuccessfully: false,
  overtimeConflictRef: null, overtimeConflictDate: null, overtimePassword: '', overtimePasswordError: null, overtimePasswordAttempts: 0,
  previewMeta: '',
}

interface TableLoadProps {
  onBack: () => void
  userName?: string
  userRole?: string
  title?: string
  description?: string
}

const tableLoadReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_SHEET_TYPE':
      return { ...initialState, sheetType: action.payload, messages: [] }
    case 'SELECT_FILE':
      return {
        ...state,
        selectedFile: action.payload,
        progress: 0,
        status: 'idle',
        // preserva mensagens anteriores para não apagar log do painel
        sheetData: [],
        columns: [],
        importFinished: false,
        showPreview: false,
        previewMeta: '',
        payrollConflictPassword: '',
        payrollPasswordAttempts: 0,
        payrollPasswordErrorType: null,
      }
    case 'RESET_FORM':
      return { ...initialState, messages: [] }
    case 'RESET_FILE_INPUT':
      return {
        ...state,
        selectedFile: null,
        sheetData: [],
        columns: [],
        status: 'idle',
        progress: 0,
        // mantém histórico de mensagens
        payrollConflictPassword: '',
        payrollPasswordAttempts: 0,
        payrollPasswordErrorType: null,
      }
    case 'SET_SHEET_DATA':
      return { ...state, sheetData: action.payload }
    case 'PUSH_MESSAGE':
      return { ...state, messages: [action.payload, ...state.messages].slice(0, 6) }
    case 'SET_STATUS':
      return { ...state, status: action.payload }
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload }
    case 'SET_PREVIEW':
      return { ...state, showPreview: action.payload }
    case 'VALIDATION_ERROR':
      return { ...state, status: 'error', sheetHeaderError: action.payload.headers || [], sheetData: [], columns: [], messages: [...action.payload.messages, ...state.messages].slice(0, 6) }
    case 'FILE_READ_SUCCESS':
      return {
        ...state,
        sheetData: action.payload.data,
        columns: action.payload.columns,
        rowErrors: action.payload.rowErrors || [],
        sheetHeaderError: [],
        showPreview: state.showPreview,
        previewMeta: action.payload.meta ?? state.previewMeta,
        messages: [...action.payload.messages, ...state.messages].slice(0, 6),
      }
    case 'SET_PAYROLL_CONFLICT':
      return {
        ...state,
        payrollConflictRef: action.payload.ref,
        payrollConflictDate: action.payload.date,
        payrollConflictPassword: '',
        payrollPasswordAttempts: 0,
        payrollPasswordErrorType: null,
        status: 'idle',
        importFinished: false,
      }
    case 'UPDATE_PAYROLL_PASSWORD':
      return { ...state, payrollConflictPassword: action.payload, payrollPasswordErrorType: null }
    case 'SET_PAYROLL_PASSWORD_ERROR':
      return { ...state, payrollPasswordErrorType: action.payload }
    case 'INCREMENT_PASSWORD_ATTEMPTS':
      return { ...state, payrollPasswordAttempts: state.payrollPasswordAttempts + 1 }
    case 'RESET_PAYROLL_CONFLICT':
      return { ...state, payrollConflictRef: null, payrollConflictDate: null, payrollConflictPassword: '', payrollPasswordAttempts: 0, payrollPasswordErrorType: null, payrollDeletedSuccessfully: false }
    case 'PAYROLL_DELETE_SUCCESS':
      return { ...state, status: 'done', payrollDeletedSuccessfully: true, importFinished: false, payrollConflictRef: null, payrollConflictDate: null, payrollConflictPassword: '', payrollPasswordAttempts: 0, payrollPasswordErrorType: null }
    case 'IMPORT_SUCCESS':
      return {
        ...state,
        status: 'done',
        progress: 100,
        importFinished: true,
        showPreview: false,
        sheetData: [],
        columns: [],
        previewMeta: '',
        messages: [...action.payload.messages, ...state.messages].slice(0, 6),
      }
    case 'SET_PREVIEW_META':
      return { ...state, previewMeta: action.payload }
    case 'IMPORT_FAILURE':
      return { ...state, status: 'error', importFinished: false, messages: [...action.payload.messages, ...state.messages].slice(0, 6) }
    case 'SET_OVERTIME_CONFLICT':
      return { ...state, overtimeConflictRef: action.payload.ref, overtimeConflictDate: action.payload.date, status: 'idle', importFinished: false }
    case 'UPDATE_OVERTIME_PASSWORD':
      return { ...state, overtimePassword: action.payload, overtimePasswordError: null }
    case 'SET_OVERTIME_PASSWORD_ERROR':
      return { ...state, overtimePasswordError: action.payload }
    case 'INCREMENT_OVERTIME_PASSWORD_ATTEMPTS':
      return { ...state, overtimePasswordAttempts: state.overtimePasswordAttempts + 1 }
    case 'RESET_OVERTIME_CONFLICT':
      return { ...state, overtimeConflictRef: null, overtimeConflictDate: null, overtimePassword: '', overtimePasswordAttempts: 0, overtimePasswordError: null }
    case 'OVERTIME_DELETE_SUCCESS':
      return { ...state, status: 'done', importFinished: false, overtimeConflictRef: null, overtimeConflictDate: null, overtimePassword: '', overtimePasswordAttempts: 0, overtimePasswordError: null }
    default:
      return state
  }
}

// Helper function moved outside the component to be a stable reference.
const padNumber = (n: number) => String(n).padStart(2, '0')

const extractFieldFromError = (errorMsg: string): string | null => {
  const knownFields = [...REQUIRED_FIELDS, 'CPF']
  const match = knownFields.find((field) => errorMsg.startsWith(field))
  return match || null
}

const getRefMonthYear = (value: any): string => {
  if (!value) return ''

  // Handle Excel's numeric date format
  if (typeof value === 'number' && value > 1) {
    const excelEpoch = new Date(1899, 11, 30)
    const d = new Date(excelEpoch.getTime() + value * 86400000)
    if (!Number.isNaN(d.getTime())) {
      return `${padNumber(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
    }
  }

  // Handle string dates (DD/MM/YYYY, YYYY-MM-DD, etc.)
  const dateStr = String(value)
  const parts = dateStr.split(/[/.-]/)
  let d: Date
  if (parts.length === 3 && parts[2].length === 4) { // Looks like DD/MM/YYYY or MM/DD/YYYY
    // Assuming DD/MM/YYYY for Brazilian locale
    d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
  } else {
    d = new Date(value)
  }

  if (Number.isNaN(d.getTime())) return ''
  return `${padNumber(d.getMonth() + 1)}/${d.getFullYear()}`
}

const getRefFullDate = (value: any): string => {
  if (!value) return ''

  // ISO date yyyy-mm-dd (evita shift de fuso)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, d] = value.split('-')
    return `${d}/${m}/${y}`
  }

  if (typeof value === 'number' && value > 1) {
    const excelEpoch = new Date(1899, 11, 30)
    const d = new Date(excelEpoch.getTime() + value * 86400000)
    if (!Number.isNaN(d.getTime())) {
      return `${padNumber(d.getUTCDate())}/${padNumber(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
    }
  }

  const dateStr = String(value)
  const parts = dateStr.split(/[/.-]/)
  let d: Date
  if (parts.length === 3 && parts[2].length === 4) {
    d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
  } else {
    d = new Date(value)
  }

  if (Number.isNaN(d.getTime())) return ''
  return `${padNumber(d.getDate())}/${padNumber(d.getMonth() + 1)}/${d.getFullYear()}`
}

const formatDateFromDb = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${padNumber(date.getDate())}/${padNumber(date.getMonth() + 1)}/${date.getFullYear()} ${padNumber(date.getHours())}:${padNumber(
    date.getMinutes()
  )}`
}

const TableLoad: React.FC<TableLoadProps> = ({
  onBack,
  userName = 'Usuario',
  userRole = 'Perfil nao informado',
  title = 'Carga de Tabelas',
  description = 'Importar massa de dados via planilha.',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const supportedSheets = ['CADASTRO', 'FOLHA PGTO', 'HORAS EXTRAS'] as const
  const requiredFolhaHeaders = ['cadastro', 'Colaborador', 'Evento', 'Competencia', 'Referencia', 'valor', 'company']
  // Modelo de download pode oferecer campos adicionais sem impactar a validacao obrigatoria
  const folhaTemplateHeaders = [...requiredFolhaHeaders, 'Empresa']
  const requiredOvertimeHeaders = ['Data', 'Cadastro', 'Nome', '303', '304', '505', '506', '511', '512']
  const ITEMS_PER_PAGE = 10

  const [state, dispatch] = useReducer(tableLoadReducer, initialState)
  const {
    sheetType, selectedFile, status, messages, sheetData, columns, sheetHeaderError,
    importFinished, showPreview, payrollConflictRef, payrollDeletedSuccessfully, rowErrors,
    overtimeConflictRef,
  } = state

  const employeeRegsCache = useRef<Set<number> | null>(null)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'ascending' | 'descending'
  } | null>({ key: 'date', direction: 'descending' })
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
  const isSupportedSheet = supportedSheets.includes(sheetType as 'CADASTRO' | 'FOLHA PGTO' | 'HORAS EXTRAS')
  const isCadastro = sheetType === 'CADASTRO'
  const isFolha = sheetType === 'FOLHA PGTO'
  const isOvertime = sheetType === 'HORAS EXTRAS'
  const hasBlockingRowErrors = rowErrors.length > 0 && !isCadastro
  const hideImportButton = sheetHeaderError.length > 0 || sheetData.length === 0 || (importFinished && !payrollDeletedSuccessfully) || hasBlockingRowErrors || payrollConflictRef !== null || overtimeConflictRef !== null
  
  useEffect(() => {
    setCurrentPage(1) // Reset page when search query changes
  }, [historySearchQuery, sortConfig])

  const processedHistory = useMemo(() => {
    // Format the date for display here, keeping the original history state clean
    const formattedHistory = history.map(item => ({
      ...item,
      date: formatDateFromDb(item.date),
    }))

    let filteredItems = formattedHistory
    if (!historySearchQuery) {
      filteredItems = formattedHistory
    } else {
      const lowercasedQuery = historySearchQuery.toLowerCase()
      filteredItems = formattedHistory.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(lowercasedQuery)
        )
      )
    }

    if (sortConfig !== null && sortConfig.key === 'date') {
      // Sort by original date from history state for accuracy
      const historyMap = new Map(history.map(item => [item.id, item.date]))
      const sortedItems = [...filteredItems].sort((a, b) => {
        const dateA = new Date(historyMap.get(a.id) || 0).getTime()
        const dateB = new Date(historyMap.get(b.id) || 0).getTime()
        return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA
      })
      return sortedItems
    }
    return filteredItems;
  }, [history, historySearchQuery, sortConfig])

  const paginatedHistory = processedHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(processedHistory.length / ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page)
  }

  const statusLabel: Record<ImportStatus, string> = {
    idle: 'Aguardando ação',
    validating: ' Validando planilha',
    uploading: ' Enviando dados',
    done: ' Concluido',
    error: ' Erro',
  }

  const resetFileInput = React.useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const pushMessage = React.useCallback((message: string) => {
    dispatch({ type: 'PUSH_MESSAGE', payload: message })
  }, [dispatch])

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const handleUpdatePreviewRow = React.useCallback((index: number, updatedRow: Record<string, any>) => {
    dispatch({
      type: 'SET_SHEET_DATA',
      payload: sheetData.map((row, i) => (i === index ? updatedRow : row)),
    })
  }, [sheetData])

  const handleDeletePreviewRow = React.useCallback((index: number) => {
    const filtered = sheetData.filter((_, i) => i !== index)
    dispatch({ type: 'SET_SHEET_DATA', payload: filtered })
    pushMessage(`Linha ${index + 1} removida do preview.`)
  }, [sheetData, pushMessage])

  const handleTogglePreview = React.useCallback(() => {
    // Start spinner immediately when opening; clear when closing
    if (!showPreview) {
      setPreviewLoading(true)
    } else {
      setPreviewLoading(false)
    }
    // Defer the heavy toggle to next frame so the spinner paints first
    window.requestAnimationFrame(() => {
      dispatch({ type: 'SET_PREVIEW', payload: !showPreview })
    })
  }, [dispatch, showPreview])

  const getEmployeeRegistrationsCached = React.useCallback(async () => {
    if (employeeRegsCache.current) {
      return { ok: true, registrations: employeeRegsCache.current } as const
    }
    const res = await fetchEmployeeRegistrations(supabaseUrl, supabaseKey)
    if (res.ok) {
      employeeRegsCache.current = res.registrations
    }
    return res
  }, [supabaseKey, supabaseUrl])

  const fetchAndUpdateHistory = React.useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) {
      setIsHistoryLoading(true)
      setHistoryError(null)
    }
    try {
      const result = await fetchHistory(supabaseUrl, supabaseKey);
      // Set the raw history data. Formatting is now handled in useMemo.
      setHistory(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro ao carregar historico.'
      setHistoryError(`Erro ao carregar historico: ${errMsg}`)
      pushMessage(`XxX Erro ao carregar historico: ${errMsg}`)
    } finally {
      if (!silent) {
        setIsHistoryLoading(false)
      }
    }
  }, [supabaseUrl, supabaseKey, pushMessage])

  useEffect(() => {
    fetchAndUpdateHistory()
    employeeRegsCache.current = null // limpa cache ao montar para evitar dados stale entre sessões
  }, [fetchAndUpdateHistory])

  useEffect(() => {
    if (sheetType && !isSupportedSheet) {
      pushMessage(`Regras para "${sheetType}" ainda NAO implementadas.`)
      // Only reset the file input if the sheet type is unsupported.
      resetFileInput()
    }
  }, [sheetType, isSupportedSheet, pushMessage, resetFileInput])

  // Effect for showing toast notifications
  useEffect(() => {
    // Avoid showing toasts when the modal is open, as it has its own feedback
    if (payrollConflictRef || overtimeConflictRef) return

    if (status === 'done') {
      if (importFinished) {
        toast.success('Importação concluída com sucesso!')
      } else if (payrollDeletedSuccessfully) {
        toast.success('Dados da folha de pagamento excluídos com sucesso.')
      }
    } else if (status === 'error') {
      // Find the most recent relevant error message to display
      const firstErrorMessage = messages.find(msg => msg.startsWith('XxX'))
      if (firstErrorMessage) {
        // Clean up the message for better readability in the toast
        const cleanMessage = firstErrorMessage.replace('XxX', '').trim()
        toast.error(cleanMessage, { duration: 4000 })
      }
    }
  }, [status, importFinished, payrollDeletedSuccessfully, messages, payrollConflictRef])

  useEffect(() => {
    if (showPreview && (sheetData.length > 0 || columns.length > 0)) {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    if (showPreview && (sheetData.length > 0 || columns.length > 0)) {
      setPreviewLoading(false)
    }
    if (!showPreview) {
      setPreviewLoading(false)
    }
  }, [showPreview, sheetData, columns])

  const handleFileSelect = async (file: File | null) => {
    if (sheetType && !isSupportedSheet) {
      pushMessage(`Regras para "${sheetType}" ainda NAO implementadas.`)
      dispatch({ type: 'SELECT_FILE', payload: null })
      resetFileInput()
      return
    }
    dispatch({ type: 'SELECT_FILE', payload: file })
    if (!file) {      return
    }
    if (file) {
      pushMessage(`Arquivo selecionado: ${file.name}`)

      let overtimeTransformed: OvertimeTransformResult | null = null
      let payrollTransformed: PayrollTransformResult | null = null
      let sharedBuffer: ArrayBuffer | null = null

      if (isOvertime || isFolha) {
        sharedBuffer = await file.arrayBuffer()

        // Evita transformar planilha vazia
        const workbookCheck = XLSX.read(sharedBuffer, { type: 'array' })
        const firstSheetCheck = workbookCheck.Sheets[workbookCheck.SheetNames[0]]
        const rawJson = XLSX.utils.sheet_to_json(firstSheetCheck, { defval: '', raw: true, blankrows: false }) as SheetData
        if (rawJson.length === 0) {
          pushMessage('XxX Planilha vazia. Selecione um arquivo com dados.')
          dispatch({ type: 'VALIDATION_ERROR', payload: { messages: ['XxX Planilha vazia. Selecione um arquivo com dados.'] } })
          return
        }
      }

      if (isOvertime && sharedBuffer) {
        try {
          const transformed = transformOvertimeApuracao(sharedBuffer)
          overtimeTransformed = transformed
          if (transformed.rows.length === 0) {
            pushMessage('XxX Transformacao retornou 0 linhas.')
          } else {
            const periodDisplay = transformed.period
              ? (/^\d{2}\/\d{2}\/\d{4}$/.test(transformed.period.trim())
                ? transformed.period.trim()
                : getRefFullDate(transformed.period))
              : ''
            pushMessage(`OoO Transformacao pronta (${transformed.rows.length} linha(s)).`)
            const metaOvertime =
              transformed.companyLabel ||
              (typeof transformed.company === 'number' && transformed.company > 0
                ? `${String(transformed.company).padStart(4, '0')}`
                : '')
            if (metaOvertime) {
              dispatch({ type: 'SET_PREVIEW_META', payload: metaOvertime })
              pushMessage(`Empresa: ${metaOvertime}`)
            }
            if (periodDisplay) {
              pushMessage(`Data: ${periodDisplay}`)
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Falha ao transformar horas extras.'
          pushMessage(`XxX Erro ao transformar horas extras: ${errMsg}`)
        }
      } else { }

      if (isFolha && sharedBuffer) {
        try {
          const transformed = transformPayrollSheet(sharedBuffer)
          payrollTransformed = transformed
          const companyCode = typeof transformed.company === 'number' ? transformed.company : null
          const companyNameFirst = transformed.companyName ? transformed.companyName.split(/\s+/)[0] : ''
          const metaLabel =
            transformed.companyLabel ||
            (companyCode !== null ? `${String(companyCode).padStart(4, '0')}${companyNameFirst ? ` - ${companyNameFirst}` : ''}` : '')
          if (metaLabel) dispatch({ type: 'SET_PREVIEW_META', payload: metaLabel })
          if (transformed.rows.length === 0) {
            pushMessage('XxX Transformacao da folha retornou 0 linhas.')
          } else {
            const competenceDisplay = transformed.competence
              ? (/^\d{2}\/\d{2}\/\d{4}$/.test(transformed.competence.trim())
                ? transformed.competence.trim()
                : getRefMonthYear(transformed.competence) || transformed.competence)
              : ''
            pushMessage(`OoO Transformacao da folha pronta (${transformed.rows.length} linha(s)).`)
            if (competenceDisplay) {
              pushMessage(`Competencia: ${competenceDisplay}`)
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Falha ao transformar folha.'
          pushMessage(`XxX Erro ao transformar folha: ${errMsg}`)
        }
        }

      readExcelFile(file, {
        overtime: overtimeTransformed || undefined,
        payroll: payrollTransformed || undefined,
      })
    }
  }

  const dispatchHeaderError = React.useCallback((missingFields: string[]) => {
    const missing = missingFields.join(', ')
    dispatch({ type: 'VALIDATION_ERROR', payload: { messages: [`XxX Campos obrigatorios faltando: (${missing})`], headers: missingFields } })
  }, [dispatch])

  const readExcelFile = (
    file: File,
    transforms?: {
      overtime?: OvertimeTransformResult
      payroll?: PayrollTransformResult
    }
  ) => {
    if (!isSupportedSheet) {
      pushMessage(`Regras para "${sheetType}" ainda NAO implementadas.`)
      dispatch({ type: 'RESET_FILE_INPUT' })
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const j5Cell = firstSheet?.['J5']?.v
        const j5DateIso = formatDate(j5Cell) || (j5Cell ? String(j5Cell) : '')
        let jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          defval: '', // garante que colunas vazias apareçam no objeto (cabecalho)
          raw: true,
          blankrows: false,
        }) as SheetData

        const headerRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', blankrows: false }) as any[][]
        let headers = Array.isArray(headerRows) && headerRows.length > 0
          ? (headerRows[0] || []).map((h: any) => String(h ?? '').trim())
          : Object.keys(jsonData[0] || {})

        const extractCompanyMeta = () => {
          const rawCode = (firstSheet as any)?.['A1']?.v ?? headerRows?.[0]?.[0]
          const rawName = (firstSheet as any)?.['C1']?.v ?? headerRows?.[0]?.[2]
          const codeDigits = rawCode !== undefined && rawCode !== null ? String(rawCode).replace(/\D/g, '') : ''
          const codeNum = codeDigits ? Number(codeDigits) : null
          const padded = codeNum !== null && !Number.isNaN(codeNum) ? String(codeNum).padStart(4, '0') : ''
          const name = rawName !== undefined && rawName !== null ? String(rawName).trim() : ''
          const firstWord = name ? name.split(/\s+/)[0] : ''
          if (padded || name) {
            return `${padded || ''}${firstWord ? ` - ${firstWord}` : ''}`.trim()
          }
          return ''
        }

        const metaFromSheet = extractCompanyMeta()
        if (metaFromSheet) {
          dispatch({ type: 'SET_PREVIEW_META', payload: metaFromSheet })
        }

        if (isOvertime && transforms?.overtime?.rows) {
          jsonData = transforms.overtime.rows
          const derivedColumns = transforms.overtime.columns && transforms.overtime.columns.length > 0
            ? transforms.overtime.columns
            : (jsonData.length > 0 ? Object.keys(jsonData[0]) : [])
          headers = derivedColumns.length > 0
            ? derivedColumns.filter((h) => h !== 'company')
            : ['Data', 'Cadastro', 'Nome', '303', '304', '505', '506', '511', '512']
          const companyCode = transforms.overtime.company
          if (companyCode) {
            jsonData = jsonData.map((row) => ({
              ...row,
              company: companyCode ?? row['company'],
              Empresa: String(companyCode).padStart(4, '0'),
            }))
          }
        } else if (isFolha && transforms?.payroll?.rows) {
          jsonData = transforms.payroll.rows
          headers = transforms.payroll.columns && transforms.payroll.columns.length > 0
            ? transforms.payroll.columns
            : (jsonData.length > 0 ? Object.keys(jsonData[0]) : ['cadastro', 'Colaborador', 'Evento', 'Competencia', 'Referencia', 'valor'])
          // inclui coluna Empresa no preview/validacao e preenche com o codigo detectado
          if (!headers.includes('Empresa')) {
            headers = [...headers, 'Empresa']
          }
          const companyCode = transforms.payroll.company
          const empresaVal = typeof companyCode === 'number' ? String(companyCode).padStart(4, '0') : ''
          if (empresaVal) {
            jsonData = jsonData.map((row) => ({
              ...row,
              company: companyCode ?? row['company'],
              Empresa: empresaVal,
            }))
          }
          if (transforms.payroll.competence) {
            const comp = transforms.payroll.competence
            jsonData = jsonData.map((row) => ({
              ...row,
              Competencia: row['Competencia'] || comp,
            }))
          }
        }

        if (jsonData.length === 0) {
          pushMessage('XxX Arquivo vazio.')
          dispatch({ type: 'VALIDATION_ERROR', payload: { messages: ['XxX Planilha vazia. Selecione um arquivo com dados.'] } })
          return
        }

        const cols = headers
        const metaLabel =
          transforms?.payroll?.companyLabel ||
          (typeof transforms?.payroll?.company === 'number'
            ? `Emp: ${String(transforms.payroll.company).padStart(4, '0')}`
            : metaFromSheet || state.previewMeta)

        if (metaLabel) {
          dispatch({ type: 'SET_PREVIEW_META', payload: metaLabel })
        }
        let validationResult: { ok: boolean; paused?: boolean }

        if (isCadastro) {
          validationResult = validateCadastroSheet(jsonData, cols, pushMessage, dispatch, dispatchHeaderError, extractFieldFromError)
        } else if (isFolha) {
          const companyMsg = (() => {
            if (metaLabel && metaLabel.trim()) {
              return metaLabel.trim()
            }
            if (typeof transforms?.payroll?.company === 'number') {
              const code = String(transforms.payroll.company).padStart(4, '0')
              const nameFirst = transforms.payroll.companyName ? transforms.payroll.companyName.split(/\s+/)[0] : ''
              return `${code}${nameFirst ? ` - ${nameFirst}` : ''}`
            }
            return ''
          })()
          if (companyMsg) pushMessage(`Empresa: ${companyMsg}`)
          if (transforms?.payroll?.competence || j5DateIso) {
            const compVal = transforms?.payroll?.competence || j5DateIso
            const compDisplay = getRefMonthYear(compVal) || String(compVal)
            pushMessage(`Competencia: ${compDisplay}`)
          }
          if (metaLabel) dispatch({ type: 'SET_PREVIEW_META', payload: metaLabel })
          validationResult = await validateFolhaSheet(
            jsonData,
            cols,
            pushMessage,
            dispatch,
            dispatchHeaderError,
            requiredFolhaHeaders,
            getEmployeeRegistrationsCached,
            supabaseUrl,
            supabaseKey,
            metaLabel,
            transforms?.payroll?.company ?? null,
          )
        } else if (isOvertime) {
          const headerDate = transforms?.overtime?.period || j5DateIso
          const metaOvertime =
            transforms?.overtime?.companyLabel ||
            (typeof transforms?.overtime?.company === 'number' && transforms?.overtime?.company > 0
              ? `${String(transforms.overtime.company).padStart(4, '0')}`
              : state.previewMeta)
          if (metaOvertime) {
            dispatch({ type: 'SET_PREVIEW_META', payload: metaOvertime })
          }
          validationResult = await validateOvertimeSheet(
            jsonData,
            cols,
            pushMessage,
            dispatch,
            getEmployeeRegistrationsCached,
            supabaseUrl,
            supabaseKey,
            headerDate,
            transforms?.overtime?.company ?? null,
            metaOvertime,
          )
        } else {
          pushMessage(`OoO Headers validados: ${cols.length} coluna(s)`)
          dispatch({ type: 'FILE_READ_SUCCESS', payload: { data: jsonData, columns: headers, messages: [] } })
          validationResult = { ok: true }
        }

        if (validationResult.ok && !validationResult.paused) {
          pushMessage(`OoO ${jsonData.length} linha(s) pronta pra ser enviada ao servidor`)
        }
      } catch (error) {
        console.error('Erro ao ler arquivo:', error)
        pushMessage('Erro ao ler o arquivo.')
        dispatch({ type: 'VALIDATION_ERROR', payload: { messages: ['Erro ao processar o arquivo.'] } })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const simulateImport = async () => {
    if (!sheetType || !selectedFile || !isSupportedSheet) {
      pushMessage('Escolha o tipo de planilha antes de importar.')
      dispatch({ type: 'SET_STATUS', payload: 'idle' })
      return
    }
    if (payrollConflictRef && isFolha) {
      pushMessage('Resolva o conflito da folha antes de importar.')
      return
    }
    if (overtimeConflictRef && isOvertime) {
      pushMessage('Resolva o conflito de horas extras antes de importar.')
      return
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    try {
      dispatch({ type: 'SET_STATUS', payload: 'validating' })
      dispatch({ type: 'SET_PROGRESS', payload: 20 })
      pushMessage(`Validando a planilha "${selectedFile.name}"...`)
      await sleep(600)

      dispatch({ type: 'SET_STATUS', payload: 'uploading' })
      dispatch({ type: 'SET_PROGRESS', payload: 65 })
      pushMessage('Enviando dados para o servidor...')
      await sleep(900)

      let finalMessages: string[] = []

      if (isCadastro) {
        const employeeResult = await insertEmployees(sheetData, userName, supabaseUrl, supabaseKey)
        if (!employeeResult.ok) {
          const employeeError = employeeResult.error ? `XxX Falha ao gravar employee: ${employeeResult.error}` : 'XxX Falha ao gravar employee.'
          dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [employeeError] } })
          return
        }
        
        const { updatedCount, newCount } = employeeResult
        const parts: string[] = []
        if (updatedCount > 0) parts.push(`${updatedCount} atualizado(s)`)
        if (newCount > 0) parts.push(`${newCount} inserido(s)`)

        if (parts.length > 0) {
          finalMessages.push(`OoO Funcionários: ${parts.join(' e ')}.`)
        } else {
          finalMessages.push(`:) Nenhum funcionário novo ou alterado.`)
        }
        const logInsertedEmployees = await insertHistory(
          {
            table: 'employee',
            actions: 'Inclusao',
            file: selectedFile?.name || '-',
            user: userName || '-',
            type: 'Importado',
          },
          supabaseUrl,
          supabaseKey
        )
        if (!logInsertedEmployees) {
          pushMessage('XxX Falha ao registrar log de cadastro.')
        }


      } else if (isFolha) {
        const payrollResult = await insertPayroll(sheetData, userName, supabaseUrl, supabaseKey)
        if (!payrollResult.ok) {
          const payrollError = payrollResult.error ? `XxX Erro ao gravar tabela payroll: ${payrollResult.error}` : 'XxX Erro ao gravar tabela payroll.'
          dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [payrollError] } })
          return
        }
        finalMessages.push(`OoO Payroll: ${payrollResult.inserted} linha(s) inseridas.`)
        const paymentValue =
          sheetData[0]?.['Competencia'] ??
          sheetData[0]?.['competencia'] ??
          sheetData[0]?.['Competence'] ??
          sheetData[0]?.['competence']
        const refMonthLog = getRefMonthYear(paymentValue)
        const companyRaw =
          sheetData[0]?.['company'] ??
          sheetData[0]?.['Company'] ??
          sheetData[0]?.['Empresa'] ??
          state.previewMeta
        const companyDigitsMatch = companyRaw ? String(companyRaw).match(/\d{1,}/) : null
        const companyNum = companyDigitsMatch ? Number(companyDigitsMatch[0]) : null
        const companyDisplay =
          companyNum !== null && !Number.isNaN(companyNum) && companyNum > 0
            ? String(companyNum).padStart(4, '0')
            : companyRaw
              ? String(companyRaw).trim()
              : ''
        const compDisplay =
          refMonthLog ||
          (typeof paymentValue === 'string' && paymentValue.trim() ? paymentValue.trim() : '')

        const payrollTableLabel =
          companyDisplay && compDisplay
            ? `payroll ${companyDisplay}-${compDisplay}`
            : companyDisplay
              ? `payroll ${companyDisplay}`
              : compDisplay
                ? `payroll Ref. ${compDisplay}`
                : 'payroll'
        await insertHistory(
          {
            table: payrollTableLabel,
            actions: 'Inclusao',
            file: selectedFile?.name || '-',
            user: userName || '-',
            type: 'Importado',
          },
          supabaseUrl,
          supabaseKey
        )
      } else if (isOvertime) {
        if (overtimeConflictRef) {
          pushMessage('XxX Resolva o conflito de horas extras antes de importar.')
          return
        }
        const overtimeResult = await insertOvertime(sheetData, userName, supabaseUrl, supabaseKey)
        if (!overtimeResult.ok) {
          const overtimeError = overtimeResult.error ? `XxX Erro ao gravar horas extras: ${overtimeResult.error}` : 'XxX Erro ao gravar horas extras.'
          dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [overtimeError] } })
          return
        }
        finalMessages.push(`OoO Horas extras: ${overtimeResult.inserted} linha(s) inseridas.`)
        const refDateLog = getRefFullDate(sheetData[0]?.['Data'])
        const companyRaw = sheetData[0]?.['company'] ?? sheetData[0]?.['Empresa'] ?? state.previewMeta
        const companyDigits = companyRaw ? String(companyRaw).match(/\d{1,}/) : null
        const companyDisplay = companyDigits && !Number.isNaN(Number(companyDigits[0]))
          ? String(Number(companyDigits[0])).padStart(4, '0')
          : ''
        const overtimeTableLabel =
          companyDisplay && refDateLog
            ? `overtime ${companyDisplay}-${refDateLog}`
            : companyDisplay
              ? `overtime ${companyDisplay}`
              : refDateLog
                ? `overtime Ref. ${refDateLog}`
                : 'overtime'
        await insertHistory(
          {
            table: overtimeTableLabel,
            actions: 'Inclusao',
            file: selectedFile?.name || '-',
            user: userName || '-',
            type: 'Importado',
          },
          supabaseUrl,
          supabaseKey
        )
      }

      finalMessages.push('OoO Carga da tabela concluida com sucesso.')
      dispatch({ type: 'IMPORT_SUCCESS', payload: { messages: finalMessages } })

      await fetchAndUpdateHistory()
    } catch (error) {
      console.error('Erro na importacao simulada:', error)
      dispatch({ type: 'IMPORT_FAILURE', payload: { messages: ['Erro ao importar. Tente novamente.'] } })
    }
  }

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' })
    resetFileInput()
    employeeRegsCache.current = null
  }

  const getStatusColor = () => {
    if (status === 'error') return 'text-amber-300'
    if (status === 'done') return 'text-emerald-400'
    return 'text-white/80'
  }


  const renderActionIcon = (acao?: string) => {
    const value = (acao || '').toLowerCase()
    if (value === 'inclusao' || value === 'inclus�o') {
      return <Check className="w-4 h-4 text-emerald-400 mx-auto" />
    }
    if (value === 'delete' || value === 'exclusao' || value === 'exclus�o') {
      return <X className="w-4 h-4 text-rose-400 mx-auto" />
    }
    if (value === 'alterou' || value === 'alteracao' || value === 'altera��o' || value === 'update') {
      return <TriangleAlert className="w-4 h-4 text-amber-400 mx-auto" />
    }
    return <span className="text-white/70 text-[11px] text-center block">{acao || '-'}</span>
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-slate-800 text-white border border-white/10 shadow-lg',
          success: { iconTheme: { primary: '#22c55e', secondary: 'white' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: 'white' } },
        }} />
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
            onClick={() => {
              resetForm()
              onBack()
            }}
            className="flex items-center gap-2 text-emerald-100 bg-white/10 border border-white/10 px-3 py-2 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-300/40 transition-colors text-xs font-semibold uppercase tracking-wide"
            title="Voltar para o dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <ImportForm
          state={state}
          dispatch={dispatch}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onImport={simulateImport}
          onReset={resetForm}
          isSupportedSheet={isSupportedSheet}
          hideImportButton={hideImportButton}
          statusLabel={statusLabel}
          getStatusColor={getStatusColor}
          cadastroHeaders={REQUIRED_FIELDS}
          folhaHeaders={folhaTemplateHeaders}
          overtimeHeaders={requiredOvertimeHeaders}
          previewLoading={previewLoading}
          onTogglePreview={handleTogglePreview}
        />
        <HistoryTable
          history={paginatedHistory}
          renderActionIcon={renderActionIcon}
          isLoading={isHistoryLoading}
          error={historyError}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          searchQuery={historySearchQuery}
          onSearchChange={setHistorySearchQuery}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      </div>
      </div>

      <div ref={previewRef}>
        <DataPreview
          show={showPreview}
          data={sheetData}
          columns={columns}
          isFolha={sheetType === 'FOLHA PGTO'}
          isOvertime={isOvertime}
          metaTitle={state.previewMeta || undefined}
          onUpdateRow={isOvertime || sheetType === 'FOLHA PGTO' ? handleUpdatePreviewRow : undefined}
          onDeleteRow={isOvertime || sheetType === 'FOLHA PGTO' ? handleDeletePreviewRow : undefined}
          rowErrors={rowErrors} />
      </div>

      <PayrollConflictModal
        state={state}
        dispatch={dispatch}
        pushMessage={pushMessage}
        onHistoryUpdate={fetchAndUpdateHistory}
        userName={userName}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
      />
      <OvertimeConflictModal
        state={state}
        dispatch={dispatch}
        pushMessage={pushMessage}
        onHistoryUpdate={fetchAndUpdateHistory}
        userName={userName}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
      />
    </>
  )
}

export default TableLoad
