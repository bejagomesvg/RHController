import { REQUIRED_FIELDS, validateEmployeeSheet, validateEmployeeRow } from '../../utils/employeeParser'
import type { RowError } from '../Table_load'
import type { SheetData } from '../Table_load'
import type { Action } from '../Table_load'

const convertExcelDate = (serial: number): string => {
  if (typeof serial !== 'number' || serial <= 0) return String(serial)
  const excelEpoch = new Date(1899, 11, 30)
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000)
  if (Number.isNaN(date.getTime())) return String(serial)
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
}

const formatMoney = (val: any): string => {
  if (val === null || val === undefined || val === '') return ''
  let num: number | null = null
  if (typeof val === 'number') {
    num = Number.isFinite(val) ? val : null
  } else {
    const cleaned = String(val).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')
    const parsed = Number(cleaned)
    num = Number.isNaN(parsed) ? null : parsed
  }
  if (num === null) return String(val)
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const DISPLAY_COLUMNS = [
  'Empresa',
  'Cadastro',
  'Nome',
  'CPF',
  'Nascimento',
  'Admissao',
  'Situacao',
  'Data Afastamento',
  'Titulo Reduzido (Cargo)',
  'Descricao do Local',
  'Sexo',
  'Valor Salario',
] as const

export const validateCadastroSheet = (
  jsonData: SheetData,
  cols: string[],
  pushMessage: (msg: string) => void,
  dispatch: React.Dispatch<Action>,
  dispatchHeaderError: (missingFields: string[]) => void,
  extractFieldFromError: (msg: string) => string | null,
): { ok: boolean; rowErrors?: RowError[] } => {
  const normalizeHeader = (h: string) => h.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

  const canonicalMap = new Map<string, string>()
  REQUIRED_FIELDS.forEach((field) => {
    canonicalMap.set(normalizeHeader(field), field)
  })

  const canonicalCols = new Set<string>()
  cols.forEach((c) => {
    const canon = canonicalMap.get(normalizeHeader(c))
    if (canon) canonicalCols.add(canon)
  })

  const normalizedData = jsonData.map((row) => {
    const newRow: Record<string, any> = { ...row }
    Object.keys(row).forEach((key) => {
      const canon = canonicalMap.get(normalizeHeader(key))
      if (canon && !(canon in newRow)) {
        newRow[canon] = row[key]
      }
    })
    return newRow
  })

  const headerValidation = validateEmployeeSheet(Array.from(canonicalCols))
  if (!headerValidation.valid) {
    dispatchHeaderError(headerValidation.missingFields)
    return { ok: false }
  }
  pushMessage(`OoO Headers validados: ${canonicalCols.size} coluna(s)`)
  const rowErrors: RowError[] = []
  normalizedData.forEach((row, index) => {
    const validation = validateEmployeeRow(row)
    if (!validation.valid) {
      rowErrors.push({ rowIndex: index + 2, errors: validation.errors })
    }
  })

  if (rowErrors.length > 0) {
    const errorFields = new Set<string>()
    rowErrors.forEach((rowErr) => {
      rowErr.errors.forEach((msg) => {
        const field = extractFieldFromError(msg)
        if (field) errorFields.add(field)
      })
    })
    const fieldsText = Array.from(errorFields).join(', ')

    const erroredIndices = new Set(rowErrors.map((r) => r.rowIndex - 2))
    const cadastroList = normalizedData
      .map((row, idx) => (erroredIndices.has(idx) ? String(row['Cadastro'] ?? '').trim() : ''))
      .filter((cad) => cad.length > 0)
      .join(', ')

    const fieldPart = fieldsText ? `(${fieldsText})` : ''
    const cadastroPart = cadastroList ? ` (${cadastroList})` : ''
    pushMessage(`:) ${rowErrors.length} linha(s) com ${fieldPart} corrigida(s)${cadastroPart}.`)
  } else {
    pushMessage(`OoO Todas as ${normalizedData.length} linhas validadas com sucesso`)
  }

  const formattedData = normalizedData.map((row) => ({
    ...row,
    Nascimento: row['Nascimento'] ? convertExcelDate(row['Nascimento'] as number) : row['Nascimento'],
    Admissao: row['Admissao'] ? convertExcelDate(row['Admissao'] as number) : row['Admissao'],
    'Data Afastamento': row['Data Afastamento']
      ? convertExcelDate(row['Data Afastamento'] as number)
      : row['Data Afastamento'],
    'Valor Salario': formatMoney(row['Valor Salario']),
  }))

  const displayColumns = DISPLAY_COLUMNS.filter((field) => canonicalCols.has(field))
  dispatch({ type: 'FILE_READ_SUCCESS', payload: { data: formattedData, columns: displayColumns, messages: [], rowErrors } })
  return { ok: true, rowErrors }
}
