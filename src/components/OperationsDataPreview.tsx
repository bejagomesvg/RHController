import React, { useMemo, useState } from 'react'
import { FileSpreadsheet, ArrowUp, ArrowDown, LoaderCircle, Plus, Minus } from 'lucide-react'
import type { SheetData } from '../views/Table_load'

// Versão específica para a tela de Operations (não impacta outros usos).
const formatDateCell = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-'

  // Excel serial number -> usar UTC para evitar fuso (off-by-one)
  if (typeof value === 'number') {
    const excelEpochUtc = Date.UTC(1899, 11, 30) // Excel epoch
    const ms = excelEpochUtc + value * 24 * 60 * 60 * 1000
    const date = new Date(ms)
    if (!Number.isNaN(date.getTime())) {
      return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    }
  }

  // ISO "YYYY-MM-DD" sem deslocar fuso
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (normalized === '00/00/0000' || normalized === '0000-00-00') return '-'

    const isoMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      const [, , m, d] = isoMatch
      return `${d}/${m}`
    }
    // já vem em dd/mm/aaaa ou dd/mm
    const brMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (brMatch) return `${brMatch[1]}/${brMatch[2]}`
  }

  return String(value)
}

const formatCpfCell = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-'
  const digits = String(value).replace(/\D/g, '')
  if (digits.length === 0) return '-'
  const padded = digits.length < 11 ? digits.padStart(11, '0') : digits.slice(0, 11)
  return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Converte o label da coluna Data (ex.: "05/12" ou "05/12 - 10/12") em um número para ordenação.
const parseDateLabelForSort = (value: any): number | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized || normalized === '-') return null

  const rangeMatch = normalized.match(/^(\d{2})\/(\d{2})\s*-\s*(\d{2})\/(\d{2})$/)
  if (rangeMatch) {
    const [, d1, m1, d2, m2] = rangeMatch
    const endVal = Number(m2) * 100 + Number(d2)
    const startVal = Number(m1) * 100 + Number(d1)
    return Number.isFinite(endVal) ? endVal : Number.isFinite(startVal) ? startVal : null
  }

  const singleMatch = normalized.match(/^(\d{2})\/(\d{2})$/)
  if (singleMatch) {
    const [, d, m] = singleMatch
    const val = Number(m) * 100 + Number(d)
    return Number.isFinite(val) ? val : null
  }

  return null
}

interface OperationsDataPreviewProps {
  show: boolean
  data: SheetData
  columns: string[]
  filterText?: string
  onFilterChange?: (value: string) => void
  isLoading?: boolean
  hideHeader?: boolean
  showFilterInput?: boolean
}

const OperationsDataPreview: React.FC<OperationsDataPreviewProps> = ({
  show,
  data,
  columns,
  filterText: externalFilter,
  onFilterChange,
  isLoading,
  hideHeader,
  showFilterInput = true,
}) => {
  const [localFilter, setLocalFilter] = useState('')
  const isControlled = onFilterChange !== undefined
  const filterText = isControlled ? (externalFilter ?? '') : localFilter
  const setFilterText = isControlled ? onFilterChange : setLocalFilter
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'Nome',
    direction: 'asc',
  })

  const dateColumns = useMemo(
    () => new Set(['nascimento', 'admissao', 'data afastamento', 'pagamento', 'data']),
    []
  )

  const filteredData = useMemo(() => {
    if (isControlled) return data
    if (!filterText.trim()) return data
    const needle = filterText.trim().toLowerCase()
    return data.filter((row) => {
      const cadastro = String(row['Cadastro'] ?? '').toLowerCase()
      const nome = String(row['Nome'] ?? '').toLowerCase()
      return cadastro.includes(needle) || nome.includes(needle)
    })
  }, [data, filterText, isControlled])

  const sortedData = useMemo(() => {
    // Define prioridades: 1) config atual; 2) Nome asc; 3) Data asc.
    const priorities: { key: string; direction: 'asc' | 'desc' }[] = []
    if (sortConfig) priorities.push(sortConfig)
    if (!priorities.some((p) => p.key === 'Nome')) priorities.push({ key: 'Nome', direction: 'asc' })
    if (!priorities.some((p) => p.key === 'Data')) priorities.push({ key: 'Data', direction: 'asc' })

    const totalsRows = filteredData.filter((row) => row._isTotalsRow)
    const regularRows = filteredData.filter((row) => !row._isTotalsRow)

    const sortedRegular = [...regularRows].sort((a, b) => {
      const parseVal = (key: string, v: any) => {
        if (key === 'Data') {
          const parsedDate = parseDateLabelForSort(v)
          if (parsedDate !== null) return parsedDate
        }
        if (v === null || v === undefined) return ''
        const num = Number(v)
        if (!Number.isNaN(num)) return num
        return String(v).toLowerCase()
      }

      for (const { key, direction } of priorities) {
        const va = parseVal(key, a[key])
        const vb = parseVal(key, b[key])
        if (va < vb) return direction === 'asc' ? -1 : 1
        if (va > vb) return direction === 'asc' ? 1 : -1
      }
      return 0
    })

    // Totals row sempre permanece na última linha
    return [...sortedRegular, ...totalsRows]
  }, [filteredData, sortConfig])

  const handleSort = (col: string) => {
    setSortConfig((prev) => {
      if (prev?.key === col) {
        return { key: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      const defaultDir = col === 'Data' ? 'asc' : 'asc'
      return { key: col, direction: defaultDir }
    })
  }

  if (!show) {
    return null
  }

  const uppercaseColumns = new Set(['data', 'cadastro', 'nome'])
  const renderHeaderButton = (col: string) => {
    const isSorted = sortConfig?.key === col
    const direction = sortConfig?.direction
    const colLower = String(col).toLowerCase()
    let label: React.ReactNode = uppercaseColumns.has(colLower) ? String(col).toUpperCase() : col

    if (col === 'Hrs 60%') {
      label = (
        <span className="flex items-center gap-1 justify-center">
          <Plus className="w-3 h-3" />
          60%
        </span>
      )
    } else if (col === 'Comp 60%') {
      label = (
        <span className="flex items-center gap-1 justify-center">
          <Minus className="w-3 h-3" />
          60%
        </span>
      )
    } else if (col === 'Hrs 100%') {
      label = (
        <span className="flex items-center gap-1 justify-center">
          <Plus className="w-3 h-3" />
          100%
        </span>
      )
    } else if (col === '60% Acumulado') {
      label = <span className="text-blue-300 font-semibold">60%</span>
    } else if (col === '100% Acumulado') {
      label = <span className="text-rose-300 font-semibold">100%</span>
    }

    return (
      <button
        type="button"
        onClick={() => handleSort(col)}
        className="w-full flex items-center justify-center gap-1 hover:text-emerald-200 transition-colors"
      >
        <span>{label}</span>
        {isSorted && (direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    )
  }

  const shouldShowHeaderBar = !hideHeader || showFilterInput || isLoading

  return (
    <div className="bg-slate-900/70 border border-white/10 rounded-xl overflow-hidden w-full">
      {shouldShowHeaderBar && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-white/10">
          {!hideHeader && (
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
              <p className="text-white font-semibold">
                {isLoading ? 'Carregando...' : `Dados carregados (${data.length} linha(s))`}
              </p>
              {isLoading && <LoaderCircle className="w-4 h-4 text-emerald-300 animate-spin" />}
            </div>
          )}
          {hideHeader && isLoading && (
            <div className="flex items-center gap-2">
              <LoaderCircle className="w-4 h-4 text-emerald-300 animate-spin" />
              <p className="text-white/70 text-sm">Carregando...</p>
            </div>
          )}
          {showFilterInput && (
            <div className="ml-auto w-full sm:w-64">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filtrar por cadastro ou nome"
                className="w-full bg-white/5 text-white text-xs border border-white/15 rounded-md px-3 py-2 outline-none focus:border-emerald-400"
              />
            </div>
          )}
        </div>
      )}
      <div
        className="overflow-x-auto overflow-y-auto max-h-[420px] min-h-[220px] custom-scroll preview-scroll"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="w-full text-[11px] text-white/80 border-collapse">
          <thead className="bg-emerald-900 border-b border-emerald-700 sticky top-0 z-30 text-white shadow-sm shadow-black/30">
            <tr className="bg-emerald-950/60 text-[11px]">
              <th rowSpan={2} className="px-3 py-2 font-semibold text-white/90 uppercase tracking-wide text-center align-middle">
                {renderHeaderButton('Data')}
              </th>
              <th rowSpan={2} className="px-3 py-2 font-semibold text-white/90 uppercase tracking-wide text-center align-middle">
                {renderHeaderButton('Cadastro')}
              </th>
              <th rowSpan={2} className="px-3 py-2 font-semibold text-white/90 uppercase tracking-wide text-center align-middle">
                {renderHeaderButton('Nome')}
              </th>
              <th colSpan={3} className="px-1 py-1 font-semibold text-white/90 uppercase tracking-wide text-center bg-emerald-900">
                DIA
              </th>
              <th colSpan={2} className="px-1 py-1 font-semibold text-white/90 uppercase tracking-wide text-center bg-indigo-900">
                MÊS
              </th>
              <th rowSpan={2} className="px-3 py-2 font-semibold text-white/90 uppercase tracking-wide text-center align-middle">
                {renderHeaderButton('ACOES')}
              </th>
            </tr>
            <tr>
              {['Hrs 60%', 'Comp 60%', 'Hrs 100%', '60% Acumulado', '100% Acumulado'].map((col) => (
                <th
                  key={col}
                  className={`px-1 py-1 font-semibold text-white/90 uppercase tracking-wide text-center ${
                    dayColumns.has(col) ? 'bg-emerald-900' : monthColumns.has(col) ? 'bg-indigo-900' : ''
                  }`}
                >
                  {renderHeaderButton(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading && sortedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-white/60">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
            {sortedData.map((row: Record<string, any>, rowIndex: number) => {
              const isTotalsRow = Boolean(row._isTotalsRow)
              return (
                <tr
                  key={rowIndex}
                  className={`${rowIndex % 2 === 0 ? 'bg-white/5' : 'bg-transparent'} hover:bg-emerald-500/10 transition-colors`}
                >
                  {columns.map((col) => {
                    const colKey = col.toLowerCase()
                    const normalizedKey = colKey.replace(/\s+/g, '')
                    let alignClass = 'text-center'
                    if (colKey === 'nome' && !isTotalsRow) {
                      alignClass = 'text-left'
                    } else if (normalizedKey === 'valorsalario') {
                      alignClass = 'text-right'
                    }
                    let colorClass = 'text-white/70'
                    if (dayColumns.has(col)) colorClass = 'text-emerald-100'
                    if (col === '60% Acumulado') colorClass = 'text-blue-300'
                    if (col === '100% Acumulado') colorClass = 'text-rose-300'
                    const monthEmphasis = monthColumns.has(col) ? 'font-semibold text-[12px]' : ''
                    const shouldFormatDate = dateColumns.has(colKey)
                    const displayValue = shouldFormatDate
                      ? formatDateCell(row[col])
                      : colKey === 'cpf'
                        ? formatCpfCell(row[col])
                        : (row[col] ?? '-')
                    
                    return (
                      <td
                        key={`${rowIndex}-${col}`}
                        className={`px-3 py-1 ${colorClass} truncate max-w-xs ${alignClass} ${monthEmphasis} ${
                          dayColumns.has(col) ? 'bg-emerald-900/20' : monthColumns.has(col) ? 'bg-indigo-900/20' : ''
                        }`}
                      >
                        {displayValue}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default OperationsDataPreview
  const dayColumns = new Set(['Hrs 60%', 'Comp 60%', 'Hrs 100%'])
  const monthColumns = new Set(['60% Acumulado', '100% Acumulado'])
