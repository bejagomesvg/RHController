import { checkOvertimeDatesExist } from '../../services/overtimeService'
import { formatDate } from '../../utils/employeeParser'
import type { SheetData } from '../Table_load'
import type { Action } from '../Table_load'

const normalizeHeader = (h: string) =>
  h
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()

const formatTimePreview = (val: any): string => {
  if (val === null || val === undefined || val === '') return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  if (typeof val === 'number') {
    const totalHours = val * 24
    const hours = Math.floor(totalHours)
    const minutes = Math.floor((totalHours - hours) * 60)
    return `${hours}:${pad(minutes)}`
  }
  const raw = String(val).trim()
  if (!raw) return '-'
  const colonMatch = raw.match(/^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/)
  if (colonMatch) {
    const [, h, m] = colonMatch
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
  }
  const decimal = Number(raw.replace(',', '.'))
  if (!Number.isNaN(decimal)) {
    const totalSeconds = Math.round(decimal * 3600)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    return `${hours}:${pad(minutes)}`
  }
  return raw
}

export const validateOvertimeSheet = async (
  jsonData: SheetData,
  cols: string[],
  pushMessage: (msg: string) => void,
  dispatch: React.Dispatch<Action>,
  getEmployeeRegistrationsCached: () => Promise<{ ok: boolean; registrations: Set<number> }>,
  supabaseUrl?: string,
  supabaseKey?: string,
  headerDate?: string,
  companyCode?: number | null,
  companyLabel?: string,
): Promise<{ ok: boolean; paused?: boolean }> => {
  const headerDateIso = headerDate ? formatDate(headerDate) || String(headerDate) : ''
  const normalizedCols = cols.map((c) => normalizeHeader(c))
  const hasData = normalizedCols.some((c) => c === 'data')
  const hasCadastro = normalizedCols.some((c) => c === 'cadastro')
  const hasNome = normalizedCols.some((c) => c === 'nome')
  const has303 = normalizedCols.some((c) => c === '303')
  const has304 = normalizedCols.some((c) => c === '304')
  const has505 = normalizedCols.some((c) => c === '505')
  const has506 = normalizedCols.some((c) => c === '506')
  const has511 = normalizedCols.some((c) => c === '511')
  const has512 = normalizedCols.some((c) => c === '512')

  const missingOvertime: string[] = []
  if (!hasData) missingOvertime.push('Data')
  if (!hasCadastro) missingOvertime.push('Cadastro')
  if (!hasNome) missingOvertime.push('Nome')
  if (!has303) missingOvertime.push('303')
  if (!has304) missingOvertime.push('304')
  if (!has505) missingOvertime.push('505')
  if (!has506) missingOvertime.push('506')
  if (!has511) missingOvertime.push('511')
  if (!has512) missingOvertime.push('512')

  if (missingOvertime.length > 0) {
    dispatch({ type: 'VALIDATION_ERROR', payload: { messages: [`XxX Campos obrigatorios faltando: (${missingOvertime.join(', ')})`], headers: missingOvertime } })
    return { ok: false }
  }
  pushMessage(`OoO Headers validados: ${cols.length} coluna(s)`)

  const regNumbers = Array.from(
    new Set(
      jsonData
        .map((row) => {
          const cadastroKey = Object.keys(row).find((k) => k.toLowerCase() === 'cadastro')
          const rawValue = cadastroKey ? row[cadastroKey] : row['cadastro']
          if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') return null
          const num = Number(String(rawValue).replace(/\D/g, ''))
          return Number.isNaN(num) ? null : num
        })
        .filter((n): n is number => n !== null),
    ),
  )

  const employeeRegsResult = await getEmployeeRegistrationsCached()
  if (!employeeRegsResult.ok) {
    dispatch({ type: 'IMPORT_FAILURE', payload: { messages: ['XxX Erro ao validar colaboradores.'] } })
    return { ok: false }
  }
  const { registrations } = employeeRegsResult
  const missingRegs = regNumbers.filter((r) => !registrations.has(r))
  if (missingRegs.length > 0) {
    dispatch({ type: 'VALIDATION_ERROR', payload: { messages: [`XxX Colaboradores nao encontrado: (${missingRegs.join(', ')})`] } })
    return { ok: false }
  }

  const dateKey = Object.keys(jsonData[0]).find((k) => k.toLowerCase() === 'data') || 'Data'
  const uniqueDates = new Set<string>()
  jsonData.forEach((row) => {
    const iso = formatDate(row[dateKey]) || headerDateIso
    if (iso) uniqueDates.add(iso)
  })
  const firstIso = Array.from(uniqueDates)[0] || ''

  const checkBatch = await checkOvertimeDatesExist(uniqueDates, companyCode ?? null, supabaseUrl, supabaseKey)
  if (!checkBatch.ok) {
    const detail = checkBatch.error ? ` Detalhe: ${checkBatch.error}` : ''
    dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [`XxX Erro ao verificar horas extras. ${detail}`] } })
    return { ok: false }
  }
  if (checkBatch.exists) {
    const refDate = firstIso || (checkBatch.dates && checkBatch.dates[0]) || ''
    dispatch({ type: 'SET_OVERTIME_CONFLICT', payload: { ref: refDate || '-', date: refDate } })
    return { ok: true, paused: true }
  }

  const overtimeOrder = ['Data', 'Cadastro', 'Nome', '303', '304', '505', '506', '511', '512']
  const ordered = overtimeOrder.filter((c) => cols.includes(c))
  const remaining = cols.filter((c) => !ordered.includes(c))

  const normalized = jsonData.map((row) => {
    const cadastroKey = Object.keys(row).find((k) => k.toLowerCase() === 'cadastro')
    const dataKey = Object.keys(row).find((k) => k.toLowerCase() === 'data')
    const key303 = Object.keys(row).find((k) => normalizeHeader(k) === '303')
    const key304 = Object.keys(row).find((k) => normalizeHeader(k) === '304')
    const key505 = Object.keys(row).find((k) => normalizeHeader(k) === '505')
    const key506 = Object.keys(row).find((k) => normalizeHeader(k) === '506')
    const key511 = Object.keys(row).find((k) => normalizeHeader(k) === '511')
    const key512 = Object.keys(row).find((k) => normalizeHeader(k) === '512')

    const cadastroNum = cadastroKey ? Number(String(row[cadastroKey]).replace(/\D/g, '')) : row['Cadastro']
    const dataIso = formatDate(row[dataKey || 'Data']) || headerDateIso
    const preview303 = formatTimePreview(key303 ? row[key303] : row['303'])
    const preview304 = formatTimePreview(key304 ? row[key304] : row['304'])
    const preview505 = formatTimePreview(key505 ? row[key505] : row['505'])
    const preview506 = formatTimePreview(key506 ? row[key506] : row['506'])
    const preview511 = formatTimePreview(key511 ? row[key511] : row['511'])
    const preview512 = formatTimePreview(key512 ? row[key512] : row['512'])

    return {
      ...row,
      Cadastro: cadastroNum,
      Data: dataIso || row[dataKey || 'Data'] || headerDateIso,
      '303': preview303,
      '304': preview304,
      '505': preview505,
      '506': preview506,
      '511': preview511,
      '512': preview512,
      company: companyCode ?? row['company'],
      Empresa: companyCode !== null && companyCode !== undefined ? String(companyCode).padStart(4, '0') : row['Empresa'],
    }
  })

  dispatch({
    type: 'FILE_READ_SUCCESS',
    payload: { data: normalized, columns: [...ordered, ...remaining], messages: [], rowErrors: [], meta: companyLabel },
  })
  return { ok: true }
}
