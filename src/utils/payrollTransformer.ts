import * as XLSX from 'xlsx'

export interface PayrollTransformRow {
  cadastro: string
  Colaborador: string
  Evento: string
  Competencia: string
  Referencia: string
  valor: string | number
  _valorRaw?: number | null
  Pagamento?: string
  Situacao?: string
  DescricaoEvento?: string
}

export interface PayrollTransformResult {
  rows: PayrollTransformRow[]
  competence?: string
  columns?: string[]
}

type CanonicalKey = 'cadastro' | 'Colaborador' | 'Evento' | 'Competencia' | 'Referencia' | 'valor'

const normalize = (value: any) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s:/.-]/gu, '')
    .toLowerCase()

const canonicalFromHeader = (header: any): CanonicalKey | null => {
  const h = normalize(header).replace(/\s+/g, '')
  if (!h) return null

  if (['cadastro', 'matricula', 'matric', 'registro', 'reg'].includes(h)) return 'cadastro'
  if (['colaborador', 'funcionario', 'nome'].includes(h)) return 'Colaborador'
  if (['evento', 'evto', 'codigo', 'codigoevento', 'codevento'].includes(h)) return 'Evento'
  if (['competencia', 'pagamento', 'mes', 'periodo', 'datapagamento'].includes(h)) return 'Competencia'
  if (['referencia', 'ref', 'qtd', 'quantidade', 'horas'].includes(h)) return 'Referencia'
  if (['valor', 'vencimento', 'provento', 'desconto', 'vlr', 'total'].includes(h)) return 'valor'
  return null
}

const hasStructuredHeaders = (headerRow: any[]): boolean => {
  const normalized = headerRow.map((h) => canonicalFromHeader(h)).filter(Boolean) as CanonicalKey[]
  const required: CanonicalKey[] = ['cadastro', 'Colaborador', 'Evento', 'Competencia', 'Referencia', 'valor']
  return required.every((field) => normalized.includes(field))
}

const findHeaderRowIndex = (matrix: any[][]): number => {
  for (let rowIdx = 0; rowIdx < matrix.length; rowIdx += 1) {
    const row = matrix[rowIdx]
    if (!row || row.length === 0) continue
    const seen = new Set<CanonicalKey>()
    row.forEach((cell) => {
      const canon = canonicalFromHeader(cell)
      if (canon) seen.add(canon)
    })
    if (seen.has('cadastro') && seen.has('Evento') && seen.has('valor')) {
      return rowIdx
    }
  }
  return -1
}

const excelSerialToDate = (serial: number): Date | null => {
  if (typeof serial !== 'number' || !Number.isFinite(serial) || serial <= 1) return null
  const excelEpoch = new Date(1899, 11, 30)
  const d = new Date(excelEpoch.getTime() + serial * 86400000)
  return Number.isNaN(d.getTime()) ? null : d
}

const excelSerialToDateUTC = (serial: number): Date | null => {
  if (!Number.isFinite(serial)) return null
  const epoch = Date.UTC(1899, 11, 30)
  const ms = epoch + serial * 24 * 60 * 60 * 1000
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatCompetence = (value: any): string => {
  if (value === null || value === undefined) return ''

  if (typeof value === 'number') {
    const d = excelSerialToDate(value)
    if (d) {
      return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
    }
  }

  const s = String(value).trim()
  if (!s) return ''

  if (/^\d{2}\/\d{4}$/.test(s)) return s
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split('-')
    return `${m}/${y}`
  }
  return s
}

const extractCompetenceFromSheet = (matrix: any[][]): string => {
  for (let r = 0; r < matrix.length; r += 1) {
    const row = matrix[r]
    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c]
      if (cell === null || cell === undefined || cell === '') continue
      const norm = normalize(cell).replace(/\s+/g, '')

      if (norm === 'competencia' || norm === 'competencia:' || norm === 'mes' || norm === 'periodo') {
        const next = row[c + 1]
        const formatted = formatCompetence(next)
        if (formatted) return formatted
      }

      const formattedCell = formatCompetence(cell)
      if (formattedCell) {
        if (/^\d{2}\/\d{4}$/.test(formattedCell) || /^\d{2}\/\d{2}\/\d{4}$/.test(formattedCell)) {
          return formattedCell
        }
      }
    }
  }
  return ''
}

const parseMoney = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return Number.isFinite(val) ? val : null

  const raw = String(val).trim()
  if (!raw) return null

  const hasComma = raw.includes(',')
  const hasDot = raw.includes('.')

  let normalized = raw
  if (hasComma && hasDot) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (hasComma && !hasDot) {
    normalized = raw.replace(',', '.')
  } else {
    const dotCount = (raw.match(/\./g) || []).length
    normalized = dotCount > 1 ? raw.replace(/\./g, '') : raw
  }

  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

const isTotalRow = (row: any[]): boolean => {
  return row.some((cell) => {
    const norm = normalize(cell).replace(/\s+/g, '')
    if (!norm) return false
    return norm.startsWith('total') || norm.includes('totalgeral') || norm.includes('resumo')
  })
}

const buildRowFromHeader = (
  headerRow: any[],
  dataRow: any[],
  competenceHint?: string
): PayrollTransformRow | null => {
  const row: PayrollTransformRow = {
    cadastro: '',
    Colaborador: '',
    Evento: '',
    Competencia: '',
    Referencia: '',
    valor: '',
  }

  headerRow.forEach((headerCell, idx) => {
    const canon = canonicalFromHeader(headerCell)
    if (!canon) return
    const cell = dataRow[idx]
    if (cell === null || cell === undefined || cell === '') return

    switch (canon) {
      case 'cadastro':
        row.cadastro = String(cell).split('.')[0].trim()
        break
      case 'Colaborador':
        row.Colaborador = String(cell).trim()
        break
      case 'Evento':
        row.Evento = String(cell).trim()
        break
      case 'Competencia':
        row.Competencia = formatCompetence(cell)
        break
      case 'Referencia':
        row.Referencia = String(cell).trim()
        break
      case 'valor':
        row.valor = cell
        break
      default:
        break
    }
  })

  const hasData = ['cadastro', 'Colaborador', 'Evento', 'Referencia', 'valor'].some((key) => {
    const v = (row as any)[key]
    return v !== null && v !== undefined && String(v).trim() !== ''
  })
  if (!hasData) return null

  const comp = row.Competencia || competenceHint
  if (comp) row.Competencia = formatCompetence(comp)

  const valorRaw = parseMoney(row.valor)
  if (valorRaw !== null) {
    row._valorRaw = valorRaw
    row.valor = valorRaw
  }

  return row
}

const isNumericString = (value: string) => /^\d+(\.\d+)?$/.test(value.trim())

const formatDateBR = (date: Date | null): string => {
  if (!date) return ''
  const dd = date.getUTCDate().toString().padStart(2, '0')
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const yyyy = date.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const formatMonthYearBR = (date: Date | null): string => {
  if (!date) return ''
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const yyyy = date.getUTCFullYear()
  return `${mm}/${yyyy}`
}

const splitCsvLine = (line: string): string[] => {
  const regex = /(\"([^\"]|\"\")*\"|[^,]+)/g
  const partes: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(line)) !== null) {
    partes.push(match[0])
  }
  return partes
}

const cleanCsvField = (field: string): string => field.replace(/^"|"$/g, '').trim()

const rowsToCsv = (rows: any[][]): string => {
  const escapeCell = (cell: any) => {
    if (cell === null || cell === undefined) return ''
    const str = String(cell)
    if (/[\",\n;]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n')
}

const parseEventosPayrollText = (texto: string): PayrollTransformRow[] => {
  const tabela: PayrollTransformRow[] = []
  let eventoAtual: string | null = null
  let competenciaGlobal: string | null = null
  let descricaoAtual: string | null = null

  const linhas = texto.split(/\r?\n/)
  for (const lineRaw of linhas) {
    const line = lineRaw.trim()
    if (!line) continue

    if (
      /^0005,-,[PF]/i.test(line) ||
      line.startsWith('Relação de Eventos') ||
      line.startsWith('Período:') ||
      line.startsWith('Evento,Colaborador') ||
      line.includes('FPRF004.OPE')
    ) {
      continue
    }

    if (/^\d{3,4},-/.test(line)) {
      const partes = line.split(',')
      if (partes.length >= 3) {
        const codBruto = partes[0].trim()
        const codNum = parseInt(codBruto, 10)
        eventoAtual = Number.isNaN(codNum) ? codBruto : String(codNum)
        const descRaw = cleanCsvField(partes.slice(2).join(','))
        const desc = descRaw.replace(/,+$/g, '').trim()
        descricaoAtual = desc || null
      }
      continue
    }

    if (line.includes('Total de Colaboradores')) {
      eventoAtual = null
      descricaoAtual = null
      continue
    }

    if (eventoAtual && line[0] && /\d/.test(line[0])) {
      const partes = splitCsvLine(line).map(cleanCsvField)
      if (partes.length >= 7) {
        const competenciaVal = partes[3]
        const pagamentoVal = partes[4]

        const competenciaFmt = isNumericString(competenciaVal)
          ? formatMonthYearBR(excelSerialToDateUTC(parseFloat(competenciaVal)))
          : competenciaVal

        const pagamentoFmt = isNumericString(pagamentoVal)
          ? formatDateBR(excelSerialToDateUTC(parseFloat(pagamentoVal)))
          : pagamentoVal

        const valorRaw = parseMoney(partes[6])

        tabela.push({
          cadastro: partes[0],
          Colaborador: partes[1],
          Evento: eventoAtual,
          Competencia: competenciaFmt,
          Referencia: partes[5],
          valor: valorRaw !== null ? valorRaw : partes[6],
          _valorRaw: valorRaw,
          Pagamento: pagamentoFmt,
          Situacao: partes[2],
          DescricaoEvento: descricaoAtual || undefined,
        } as PayrollTransformRow & { Pagamento?: string; Situacao?: string })

        if (competenciaFmt && !competenciaGlobal) competenciaGlobal = competenciaFmt
      }
    }
  }

  return tabela.map((row) => ({
    ...row,
    Competencia: row.Competencia || competenciaGlobal || '',
  }))
}

const decodeBufferToText = (buffer: ArrayBuffer): string | null => {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  } catch {
    try {
      return new TextDecoder('latin1', { fatal: false }).decode(buffer)
    } catch {
      return null
    }
  }
}

export const transformPayrollSheet = (buffer: ArrayBuffer): PayrollTransformResult => {
  const textRaw = decodeBufferToText(buffer)
  if (textRaw && textRaw.includes('Evento,Colaborador')) {
    const parsed = parseEventosPayrollText(textRaw)
    if (parsed.length > 0) {
      const competence = parsed[0]?.Competencia || ''
      const columns = ['cadastro', 'Colaborador', 'Competencia', 'Pagamento', 'Situacao', 'Evento', 'Referencia', 'valor'].filter((c) =>
        parsed.some((r) => c in r)
      )
      return { rows: parsed, competence, columns }
    }
  }

  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true, defval: '', blankrows: false }) as any[][]
  const competenceFromSheet = extractCompetenceFromSheet(matrix)

  if (matrix.length > 0 && hasStructuredHeaders(matrix[0])) {
    const dataRows = matrix.slice(1)
    const rows = dataRows
      .map((r) => buildRowFromHeader(matrix[0], r, competenceFromSheet))
      .filter(Boolean) as PayrollTransformRow[]
    return { rows, competence: competenceFromSheet, columns: ['cadastro', 'Colaborador', 'Evento', 'Competencia', 'Referencia', 'valor'] }
  }

  const headerIdx = findHeaderRowIndex(matrix)
  if (headerIdx >= 0) {
    const headerRow = matrix[headerIdx]
    const rows: PayrollTransformRow[] = []
    for (let r = headerIdx + 1; r < matrix.length; r += 1) {
      const dataRow = matrix[r]
      if (!dataRow || dataRow.length === 0) continue
      if (isTotalRow(dataRow)) break
      const built = buildRowFromHeader(headerRow, dataRow, competenceFromSheet)
      if (built) rows.push(built)
    }
    return { rows, competence: competenceFromSheet, columns: ['cadastro', 'Colaborador', 'Evento', 'Competencia', 'Referencia', 'valor'] }
  }

  // Tenta usar o layout de eventos (FPRF004) convertido para CSV
  const csvPayload = rowsToCsv(matrix)
  const eventosRows = parseEventosPayrollText(csvPayload)
  if (eventosRows.length > 0) {
    const competence = eventosRows[0]?.Competencia || competenceFromSheet
    const columns = ['cadastro', 'Colaborador', 'Competencia', 'Pagamento', 'Situacao', 'Evento', 'Referencia', 'valor'].filter((c) =>
      eventosRows.some((r) => c in r)
    )
    return { rows: eventosRows, competence, columns }
  }

  const fallback = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: true, blankrows: false }) as any[]
  const rows = fallback.map((row) => {
    if (competenceFromSheet && !row['Competencia']) {
      return { ...row, Competencia: competenceFromSheet }
    }
    return row
  }) as PayrollTransformRow[]

  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  return { rows, competence: competenceFromSheet, columns }
}
