import { checkPayrollMonthExists } from '../../services/payrollService'
import type { SheetData } from '../Table_load'
import type { Action } from '../Table_load'

const getRefMonthYear = (value: any): string => {
  const padNumber = (n: number) => String(n).padStart(2, '0')
  if (!value) return ''
  if (typeof value === 'number' && value > 1) {
    const excelEpoch = new Date(1899, 11, 30)
    const d = new Date(excelEpoch.getTime() + value * 86400000)
    if (!Number.isNaN(d.getTime())) {
      return `${padNumber(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
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
  return `${padNumber(d.getMonth() + 1)}/${d.getFullYear()}`
}

const parseNumber = (raw: any): number | null => {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const cleaned = String(raw).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? null : parsed
}

export const validateFolhaSheet = async (
  jsonData: SheetData,
  cols: string[],
  pushMessage: (msg: string) => void,
  dispatch: React.Dispatch<Action>,
  dispatchHeaderError: (missingFields: string[]) => void,
  requiredFolhaHeaders: string[],
  getEmployeeRegistrationsCached: () => Promise<{ ok: boolean; registrations: Set<number> }>,
  supabaseUrl?: string,
  supabaseKey?: string,
  companyLabel?: string,
  companyCode?: number | null,
): Promise<{ ok: boolean; paused?: boolean }> => {
  const normalizeHeader = (h: string) =>
    h
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{L}\p{N}]/gu, '')
      .toLowerCase()

  const canonicalMap = new Map<string, string>([
    ['cadastro', 'cadastro'],
    ['colaborador', 'Colaborador'],
    ['nome', 'Colaborador'],
    ['evento', 'Evento'],
    ['competencia', 'Competencia'],
    ['referencia', 'Referencia'],
    ['valor', 'valor'],
    ['empresa', 'company'],
  ])

  const canonicalCols = new Set<string>()
  cols.forEach((c) => {
    const canon = canonicalMap.get(normalizeHeader(c))
    if (canon) canonicalCols.add(canon)
  })

  const missingFolha = requiredFolhaHeaders.filter((h) => !canonicalCols.has(h))
  if (missingFolha.length > 0) {
    dispatchHeaderError(missingFolha)
    return { ok: false }
  }
  pushMessage(`OoO Headers validados: ${canonicalCols.size} coluna(s)`)

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

  const competenceKey =
    cols.find((c) => {
      const canon = normalizeHeader(c)
      return canon === 'competencia' || canon === 'pagamento'
    }) || 'Competencia'
  const competenceValue = jsonData[0]?.[competenceKey]
  const refMonth = getRefMonthYear(competenceValue) || '-'
  const refDisplay = refMonth !== '-' ? refMonth : (competenceValue ? String(competenceValue) : '-')
  const payrollCheck = await checkPayrollMonthExists(competenceValue, companyCode ?? null, supabaseUrl, supabaseKey)
  if (!payrollCheck.ok) {
    const detail = payrollCheck.error ? ` Detalhe: ${payrollCheck.error}` : ''
    dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [`XxX Erro ao verificar folha ref. ${refMonth}.${detail}`] } })
    return { ok: false }
  }
  if (payrollCheck.exists) {
    const empresaDisplay =
      companyCode !== null && companyCode !== undefined
        ? String(companyCode).padStart(4, '0')
        : '-'
    pushMessage(`:) Empresa: ${empresaDisplay} Competencia: ${refDisplay} ja fechada!`)
    const iso = typeof competenceValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(competenceValue)
      ? competenceValue
      : typeof competenceValue === 'string'
        ? String(competenceValue)
        : ''
    dispatch({ type: 'SET_PAYROLL_CONFLICT', payload: { ref: refDisplay, date: iso || '' } })
    return { ok: true, paused: true }
  }

  const folhaOrder = ['cadastro', 'Colaborador', 'Evento', 'Competencia', 'Referencia', 'valor']
  const ordered = folhaOrder.map((c) => (c === 'Competencia' ? competenceKey : c)).filter((c) => cols.includes(c) || c === 'Competencia')
  const remaining = cols.filter((c) => !ordered.includes(c))
  const normalized = jsonData.map((row) => {
    const cadastroNum = row['cadastro'] ? Number(String(row['cadastro']).replace(/\D/g, '')) : row['cadastro']
    const eventoNum = row['Evento'] ? Number(String(row['Evento']).replace(/\D/g, '')) : row['Evento']
    const competenciaVal = row[competenceKey] ?? row['Competencia'] ?? row['competencia']
    const competenciaFmt = getRefMonthYear(competenciaVal) || competenciaVal
    const rawValorNum = parseNumber(row['valor'])
    const empresaRaw = row['Empresa'] ?? row['empresa'] ?? row['company']
    const empresaNum = companyCode ?? (empresaRaw !== undefined ? parseNumber(empresaRaw) : null)
    const valorFormatado =
      typeof rawValorNum === 'number'
        ? rawValorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : row['valor']
    return {
      ...row,
      [competenceKey]: competenciaFmt,
      Competencia: competenciaFmt,
      cadastro: cadastroNum,
      Evento: eventoNum,
      valor: valorFormatado,
      _valorRaw: rawValorNum,
      company: empresaNum,
      Empresa: empresaNum !== null && empresaNum !== undefined ? String(empresaNum).padStart(4, '0') : row['Empresa'],
    }
  })

  dispatch({
    type: 'FILE_READ_SUCCESS',
    payload: { data: normalized, columns: [...ordered, ...remaining], messages: [], rowErrors: [], meta: companyLabel },
  })
  return { ok: true }
}
