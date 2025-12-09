import React, { useMemo, useState } from 'react'
import { FileSpreadsheet, AlertTriangle } from 'lucide-react'
import type { SheetData, RowError } from '../views/Table_load'

const formatDateCell = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-'

  // Excel serial number -> usar UTC para evitar fuso (off-by-one)
  if (typeof value === 'number') {
    const excelEpochUtc = Date.UTC(1899, 11, 30) // Excel epoch
    const ms = excelEpochUtc + value * 24 * 60 * 60 * 1000
    const date = new Date(ms)
    if (!Number.isNaN(date.getTime())) {
      return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
    }
  }

  // ISO "YYYY-MM-DD" sem deslocar fuso
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (normalized === '00/00/0000' || normalized === '0000-00-00') return '-'

    const isoMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      const [, y, m, d] = isoMatch
      return `${d}/${m}/${y}`
    }
    // já vem em dd/mm/aaaa
    const brMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (brMatch) return value
  }

  // fallback
  return String(value)
}

const formatCpfCell = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-'
  const digits = String(value).replace(/\D/g, '')
  if (digits.length === 0) return '-'
  const padded = digits.length < 11 ? digits.padStart(11, '0') : digits.slice(0, 11)
  return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

interface DataPreviewProps {
  show: boolean
  data: SheetData
  columns: string[]
  isFolha: boolean
  rowErrors: RowError[]
}

const DataPreview: React.FC<DataPreviewProps> = ({ show, data, columns, isFolha: _isFolha, rowErrors }) => {
  const [filterText, setFilterText] = useState('')
  const errorMap = useMemo(() => {
    const map = new Map<number, Map<string, string>>()
    rowErrors.forEach(error => {
      const cellErrors = new Map<string, string>()
      error.errors.forEach((errMsg: string) => {
        const field = errMsg.split(' ')[0].toLowerCase()
        cellErrors.set(field, errMsg)
      })
      map.set(error.rowIndex, cellErrors)
    })
    return map
  }, [rowErrors])

  const dateColumns = useMemo(
    () => new Set(['nascimento', 'admissao', 'data afastamento', 'pagamento']),
    []
  )

  const filteredData = useMemo(() => {
    if (!filterText.trim()) return data
    const needle = filterText.trim().toLowerCase()
    return data.filter((row) => {
      const cadastro = String(row['Cadastro'] ?? '').toLowerCase()
      const nome = String(row['Nome'] ?? '').toLowerCase()
      return cadastro.includes(needle) || nome.includes(needle)
    })
  }, [data, filterText])

  if (!show || data.length === 0) {
    return null
  }

  return (
    <div className="bg-slate-900/70 border border-white/10 rounded-xl overflow-hidden w-full">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
          <p className="text-white font-semibold">Dados carregados ({data.length} linha(s))</p>
        </div>
        <div className="ml-auto w-full sm:w-64">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrar por cadastro ou nome"
            className="w-full bg-white/5 text-white text-xs border border-white/15 rounded-md px-3 py-2 outline-none focus:border-emerald-400"
          />
        </div>
      </div>
      <div
        className="overflow-x-auto overflow-y-auto max-h-[420px] min-h-[220px] custom-scroll preview-scroll"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="w-full text-[11px] text-white/80 border-collapse">
          <thead className="bg-blue-900 border-b border-blue-700 sticky top-0 z-30 text-white shadow-sm shadow-black/30">
            <tr>
              <th className="px-2 py-2 font-semibold text-white/90 uppercase tracking-wide text-center w-8"></th>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 font-semibold text-white/90 uppercase tracking-wide text-center">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row: Record<string, any>, rowIndex: number) => {
              const errorsForThisRow = errorMap.get(rowIndex + 2) // rowIndex is 0-based, error.rowIndex is 1-based from sheet
              const hasError = !!errorsForThisRow

              return (
                <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white/5' : 'bg-transparent'} ${hasError ? 'bg-rose-500/10' : ''}`}>
                  <td className="px-2 py-2 text-center">
                    {hasError && <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" />}
                  </td>
                  {columns.map((col) => {
                    const colKey = col.toLowerCase()
                    const cellError = errorsForThisRow?.get(colKey)
                    const isCellInvalid = !!cellError

                    // alinhamento: centro padrão, nome à esquerda, valor salário à direita
                    const normalizedKey = colKey.replace(/\s+/g, '')
                    let alignClass = 'text-center'
                    if (colKey === 'nome') {
                      alignClass = 'text-left'
                    } else if (normalizedKey === 'valorsalario') {
                      alignClass = 'text-right'
                    }
                    const shouldFormatDate = dateColumns.has(colKey)
                    const displayValue = shouldFormatDate
                      ? formatDateCell(row[col])
                      : colKey === 'cpf'
                        ? formatCpfCell(row[col])
                        : (row[col] ?? '-')
                    
                    return (
                      <td
                        key={`${rowIndex}-${col}`}
                        className={`px-3 py-2 text-white/70 truncate max-w-xs ${alignClass} ${isCellInvalid ? 'ring-1 ring-rose-500 ring-inset' : ''}`}
                        title={cellError}
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

export default DataPreview
