import React from 'react'
import { Check, Filter, RotateCw, Settings, Trash2, X, Edit } from 'lucide-react'

type EmployeeSortKey = 'company' | 'registration' | 'name' | 'date_hiring' | 'sector' | 'status' | 'date_status'
type ClosingSortKey = 'company' | 'competence' | 'type_registration' | 'user_registration' | 'date_registration'

type EmployeeRow = {
  company: number | null
  registration: number | null
  name: string | null
  date_hiring: string | null
  sector: string | null
  status: number | null
  date_status: string | null
}

type ClosingPayrollRow = {
  id: number
  company: number | null
  registration: number | null
  competence: string | null
  name: string | null
  status_: number | null
  status_date: string | null
  type_registration: string | null
  user_registration: string | null
  date_registration: string | null
}

type PayrollConfigPanelProps = {
  employeeCompanyFilter: string
  setEmployeeCompanyFilter: (value: string) => void
  employeeCompanies: number[]
  employeeStatusFilter: string
  setEmployeeStatusFilter: (value: string) => void
  employeeStatuses: number[]
  statusDescriptions: Record<number, string>
  closingYearFilter: string
  setClosingYearFilter: (value: string) => void
  closingYears: number[]
  closingMonthFilter: string
  setClosingMonthFilter: (value: string) => void
  closingMonths: number[]
  onClearFilters: () => void
  employeeFilter: string
  setEmployeeFilter: (value: string) => void
  hasOpenPayroll: boolean
  hasPayrollPeriod: boolean
  hasClosingForFilters: boolean
  statusCounts: Array<{ label: string; count: number }>
  admissionDemissionCounts: { admissions: number; demissions: number }
  filteredEmployeesCount: number
  onOpenCloseModal: () => void
  employeeSort: { key: EmployeeSortKey; direction: 'asc' | 'desc' }
  toggleEmployeeSort: (key: EmployeeSortKey) => void
  renderSortIndicator: (isActive: boolean, direction: 'asc' | 'desc', type: 'text' | 'number') => React.ReactNode
  isLoadingEmployees: boolean
  employeeError: string | null
  filteredEmployeesLength: number
  sortedEmployees: EmployeeRow[]
  formatDateShort: (value?: string | null) => string
  editingRegistration: number | null
  editStatusValue: string
  setEditStatusValue: (value: string) => void
  editDateStatusValue: string
  setEditDateStatusValue: (value: string) => void
  isSavingEdit: boolean
  startEditRow: (row: EmployeeRow) => void
  cancelEditRow: () => void
  saveEditRow: () => void
  closingSort: { key: ClosingSortKey; direction: 'asc' | 'desc' }
  toggleClosingSort: (key: ClosingSortKey) => void
  isLoadingClosing: boolean
  closingError: string | null
  closingRowsLength: number
  groupedClosingRows: ClosingPayrollRow[]
  onStartDeleteClosing: (row: ClosingPayrollRow) => void
  formatCompetenceMonth: (value?: string | null) => string
  formatCompanyLabel: (value: number) => string
}

const PayrollConfigPanel: React.FC<PayrollConfigPanelProps> = ({
  employeeCompanyFilter,
  setEmployeeCompanyFilter,
  employeeCompanies,
  employeeStatusFilter,
  setEmployeeStatusFilter,
  employeeStatuses,
  statusDescriptions,
  closingYearFilter,
  setClosingYearFilter,
  closingYears,
  closingMonthFilter,
  setClosingMonthFilter,
  closingMonths,
  onClearFilters,
  employeeFilter,
  setEmployeeFilter,
  hasOpenPayroll,
  hasPayrollPeriod,
  hasClosingForFilters,
  statusCounts,
  admissionDemissionCounts,
  filteredEmployeesCount,
  onOpenCloseModal,
  employeeSort,
  toggleEmployeeSort,
  renderSortIndicator,
  isLoadingEmployees,
  employeeError,
  filteredEmployeesLength,
  sortedEmployees,
  formatDateShort,
  editingRegistration,
  editStatusValue,
  setEditStatusValue,
  editDateStatusValue,
  setEditDateStatusValue,
  isSavingEdit,
  startEditRow,
  cancelEditRow,
  saveEditRow,
  closingSort,
  toggleClosingSort,
  isLoadingClosing,
  closingError,
  closingRowsLength,
  groupedClosingRows,
  onStartDeleteClosing,
  formatCompetenceMonth,
  formatCompanyLabel,
}) => (
  <div className="space-y-3">
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 shadow-inner shadow-black/10">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-emerald-200 font-semibold">
          <Settings className="w-6 h-6 text-amber-300" />
          CONFIGURACAO
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 text-white/60 text-[11px] uppercase tracking-[0.2em]">
            <Filter className="w-4 h-4 text-emerald-300" />
            Filtros
          </div>
          <select
            value={employeeCompanyFilter}
            onChange={(event) => setEmployeeCompanyFilter(event.target.value)}
            className="bg-white/5 text-emerald-300 text-[11px] border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
          >
            {employeeCompanies.map((company) => (
              <option key={company} value={String(company)} className="bg-[#1f2c4d] text-emerald-300">
                {formatCompanyLabel(company)}
              </option>
            ))}
          </select>
          <select
            value={employeeStatusFilter}
            onChange={(event) => setEmployeeStatusFilter(event.target.value)}
            className="bg-white/5 text-emerald-300 text-[11px] border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
          >
            <option value="" className="bg-[#1f2c4d] text-emerald-300">
              STATUS
            </option>
            {employeeStatuses.map((status) => (
              <option key={status} value={String(status)} className="bg-[#1f2c4d] text-emerald-300">
                {statusDescriptions[status] || status}
              </option>
            ))}
          </select>
          <select
            value={closingYearFilter}
            onChange={(event) => setClosingYearFilter(event.target.value)}
            className="bg-white/5 text-emerald-300 text-[11px] border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
          >
            {closingYears.map((year) => (
              <option key={year} value={String(year)} className="bg-[#1f2c4d] text-emerald-300">
                {year}
              </option>
            ))}
          </select>
          <select
            value={closingMonthFilter}
            onChange={(event) => setClosingMonthFilter(event.target.value)}
            className="bg-white/5 text-emerald-300 text-[11px] border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
          >
            {closingMonths.map((month) => (
              <option key={month} value={String(month)} className="bg-[#1f2c4d] text-emerald-300">
                {String(month).padStart(2, '0')}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center justify-center text-emerald-100 rounded-full border border-transparent px-2 py-1.5 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
            title="Limpar filtros"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
    <div className="bg-blue-900/30 border border-blue-500/40 rounded-xl p-4 shadow-lg backdrop-blur-sm overflow-hidden w-full">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex-1 w-full flex flex-col lg:items-start items-center text-center lg:text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Fechamento da Folha de Pagamento</p>
          <h5 className="text-lg font-semibold text-white mt-1">
            Referencia:
            <span className="ml-2 text-emerald-300 font-semibold">
              {closingMonthFilter && closingYearFilter
                ? `${String(closingMonthFilter).padStart(2, '0')}/${closingYearFilter}`
                : '-'}
            </span>
          </h5>
          <div className="mt-2 w-full">
            <input
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              placeholder="Localizar por Nome ou Registro"
              className="w-full bg-white/5 text-white text-xs border border-white/15 rounded-md px-4 py-2.5 outline-none focus:border-emerald-400"
            />
          </div>
        </div>
        {hasOpenPayroll && (
          <div className="flex flex-[1.6] justify-center">
            <div className="w-full max-w-sm rounded-lg border border-white/15 bg-white/5 overflow-hidden">
              <table className="w-full text-xs text-white/80">
                <tbody>
                  {(() => {
                    const baseRows = statusCounts.map((item) => ({
                      label: item.label,
                      count: item.count,
                    }))
                    baseRows.push({ label: 'Admissao', count: admissionDemissionCounts.admissions })
                    baseRows.push({ label: 'Demissao', count: admissionDemissionCounts.demissions })

                    const rowCount = Math.max(5, Math.ceil(baseRows.length / 2))
                    const rightOffset = rowCount

                    return Array.from({ length: rowCount }).map((_, idx) => {
                      const left = baseRows[idx]
                      const right = baseRows[idx + rightOffset]
                      return (
                        <tr
                          key={idx}
                          className={`${idx === 0 ? '' : 'border-t border-white/10'}`}
                        >
                          <td className="w-1/2 px-3 py-0.5 border-r border-white/10 hover:bg-white/5 transition-colors">
                            {left ? (
                              <span className="flex w-full items-center justify-between">
                                <span className="text-white/80">{left.label}:</span>
                                <span className="text-emerald-300 font-semibold">{left.count}</span>
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="w-1/2 px-3 py-0.5 text-right hover:bg-white/5 transition-colors">
                            {right ? (
                              <span className="flex w-full items-center justify-between">
                                <span className="text-white/80">{right.label}:</span>
                                <span className="text-emerald-300 font-semibold">{right.count}</span>
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center gap-3 shrink-0">
          {hasOpenPayroll && (
            <>
              <span className="text-white/70 font-semibold">
                Totais de Colaborador:
                <span className="ml-1 text-emerald-300 font-semibold">{filteredEmployeesCount}</span>
              </span>
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-amber-400 text-amber-200 font-semibold hover:bg-amber-400/10 transition-colors"
                onClick={onOpenCloseModal}
              >
                Fechar Folha
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
        <div className="max-h-[320px] overflow-auto custom-scroll">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="bg-blue-900 border-b border-blue-700 sticky top-0 z-10 text-white shadow-sm shadow-black/30 text-[9px] tracking-[0.25em]">
              <tr>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleEmployeeSort('company')}
                  >
                    EMP
                    {renderSortIndicator(employeeSort.key === 'company', employeeSort.direction, 'number')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleEmployeeSort('registration')}
                  >
                    CAD
                    {renderSortIndicator(employeeSort.key === 'registration', employeeSort.direction, 'number')}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center"
                    onClick={() => toggleEmployeeSort('name')}
                  >
                    NOME
                    {renderSortIndicator(employeeSort.key === 'name', employeeSort.direction, 'text')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleEmployeeSort('date_hiring')}
                  >
                    ADMISSAO
                    {renderSortIndicator(employeeSort.key === 'date_hiring', employeeSort.direction, 'number')}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center"
                    onClick={() => toggleEmployeeSort('sector')}
                  >
                    SETOR
                    {renderSortIndicator(employeeSort.key === 'sector', employeeSort.direction, 'text')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleEmployeeSort('status')}
                  >
                    STATUS
                    {renderSortIndicator(employeeSort.key === 'status', employeeSort.direction, 'number')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleEmployeeSort('date_status')}
                  >
                    DT STATUS
                    {renderSortIndicator(employeeSort.key === 'date_status', employeeSort.direction, 'number')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">ACOES</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingEmployees && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-white/60">
                    Carregando colaboradores...
                  </td>
                </tr>
              )}
              {!isLoadingEmployees && !hasPayrollPeriod && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-amber-300">
                    NAO FOI ENCONTRADA FOLHA PARA FECHAMENTO
                  </td>
                </tr>
              )}
              {!isLoadingEmployees && hasClosingForFilters && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-amber-300">
                    FOLHA DE PAGAMENTO JA ENCONTRA FECHADA
                  </td>
                </tr>
              )}
              {!isLoadingEmployees && employeeError && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-rose-300">
                    {employeeError}
                  </td>
                </tr>
              )}
              {!isLoadingEmployees && hasOpenPayroll && !employeeError && filteredEmployeesLength === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-white/60">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              )}
              {!isLoadingEmployees &&
                hasOpenPayroll &&
                !employeeError &&
                sortedEmployees.map((row) => {
                  const isEditing = editingRegistration !== null && row.registration === editingRegistration
                  const statusOptions = employeeStatuses.length
                    ? employeeStatuses
                    : row.status !== null && row.status !== undefined
                      ? [row.status]
                      : []
                  return (
                    <tr
                      key={`${row.registration ?? 'sem-reg'}-${row.name ?? ''}`}
                      className="border-t border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-3 py-2 text-center font-semibold text-white/70">{row.company ?? '-'}</td>
                      <td className="px-3 py-2 text-center font-semibold text-white/70">{row.registration ?? '-'}</td>
                      <td className="px-3 py-2 text-white">{row.name ?? '-'}</td>
                      <td className="px-3 py-2 text-center text-white/70">{formatDateShort(row.date_hiring)}</td>
                      <td className="px-3 py-2 text-white/70">{row.sector ?? '-'}</td>
                      <td className="px-3 py-2 text-center text-white/70">
                        {isEditing ? (
                          <select
                            value={editStatusValue}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              setEditStatusValue(nextValue)
                              if (Number(nextValue) === 1) {
                                setEditDateStatusValue('')
                              }
                            }}
                            className="bg-white/5 text-emerald-200 text-xs border border-white/15 rounded-md px-2 py-1 outline-none focus:border-emerald-400"
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={String(status)} className="bg-[#1f2c4d] text-emerald-300">
                                {statusDescriptions[status] || status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          row.status ?? '-'
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-white/70">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDateStatusValue}
                            onChange={(event) => setEditDateStatusValue(event.target.value)}
                            disabled={Number(editStatusValue) === 1}
                            className="bg-white/5 text-white text-xs border border-white/15 rounded-md px-2 py-1 outline-none focus:border-emerald-400 disabled:opacity-60"
                          />
                        ) : (
                          formatDateShort(row.date_status)
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="text-emerald-300 hover:text-emerald-200 hover:scale-110 transition-transform disabled:opacity-50"
                                title="Confirmar"
                                onClick={saveEditRow}
                                disabled={isSavingEdit}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="text-white/60 hover:text-white hover:scale-110 transition-transform"
                                title="Cancelar"
                                onClick={cancelEditRow}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="text-emerald-200 hover:text-emerald-100 hover:scale-110 transition-transform disabled:opacity-50"
                                title="Editar"
                                onClick={() => startEditRow(row)}
                                disabled={!row.registration || isSavingEdit}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="text-rose-300 hover:text-rose-200 hover:scale-110 transition-transform"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div className="mt-4 bg-blue-900/30 border border-blue-500/40 rounded-xl p-4 shadow-lg backdrop-blur-sm overflow-hidden w-full">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
        Fechamentos registrados
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
        <div className="max-h-[240px] overflow-auto custom-scroll">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="bg-blue-900 border-b border-blue-700 sticky top-0 z-10 text-white shadow-sm shadow-black/30 text-[9px] uppercase tracking-[0.25em]">
              <tr>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleClosingSort('company')}
                  >
                    EMP
                    {renderSortIndicator(closingSort.key === 'company', closingSort.direction, 'number')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleClosingSort('competence')}
                  >
                    COMPETENCIA
                    {renderSortIndicator(closingSort.key === 'competence', closingSort.direction, 'number')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleClosingSort('type_registration')}
                  >
                    TIPO
                    {renderSortIndicator(closingSort.key === 'type_registration', closingSort.direction, 'text')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleClosingSort('user_registration')}
                  >
                    USUARIO
                    {renderSortIndicator(closingSort.key === 'user_registration', closingSort.direction, 'text')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full"
                    onClick={() => toggleClosingSort('date_registration')}
                  >
                    DT REGISTRO
                    {renderSortIndicator(closingSort.key === 'date_registration', closingSort.direction, 'number')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">ACOES</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingClosing && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-white/60">
                    Carregando fechamentos...
                  </td>
                </tr>
              )}
              {!isLoadingClosing && closingError && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-rose-300">
                    {closingError}
                  </td>
                </tr>
              )}
              {!isLoadingClosing && !closingError && closingRowsLength === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-white/60">
                    Nenhum fechamento encontrado.
                  </td>
                </tr>
              )}
              {!isLoadingClosing &&
                !closingError &&
                groupedClosingRows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-center font-semibold text-white/70">
                      {row.company ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-white/70">
                      {formatCompetenceMonth(row.competence)}
                    </td>
                    <td className="px-3 py-2 text-center text-white/70">
                      {row.type_registration ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-white/70">
                      {row.user_registration ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-white/70">
                      {formatDateShort(row.date_registration)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="text-rose-300 hover:text-rose-200 hover:scale-110 transition-transform"
                        title="Excluir"
                        onClick={() => onStartDeleteClosing(row)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
)

export default PayrollConfigPanel
