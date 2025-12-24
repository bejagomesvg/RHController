import React, { useEffect, useMemo, useState } from 'react'
import { CalendarX, Filter, Hospital, RotateCw, UserMinus, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'

type PayrollAbsencesPanelProps = {
  supabaseUrl?: string
  supabaseKey?: string
}

type ClosingRow = {
  company: number | null
  competence: string | null
  registration: number | null
}

type EmployeeSectorRow = {
  registration: number | string | null
  sector: string | null
  company: number | null
  status: number | null
  date_hiring: string | null
  date_status: string | null
}

type PayrollEventRow = {
  registration: number | string | null
  events: number | null
  volue: number | null
  references_: number | null
  competence: string | null
}

const CHART_COLORS = ['#8b5cf6', '#f97316', '#ef4444', '#f59e0b', '#22c55e', '#0ea5e9']

// Hypothetical Absence Event IDs
const ABSENCE_EVENT_IDS = {
  MEDICAL_LEAVE: [56, 57], // Atestados (already in PayrollMonthlyPanel for absenteeism)
  UNJUSTIFIED_ABSENCE: [502, 651, 652], // Faltas (already in PayrollMonthlyPanel for absenteeism)
  VACATION: [700], // Hypothetical
  MATERNITY_LEAVE: [701], // Hypothetical
  PATERNITY_LEAVE: [702], // Hypothetical
}

const PayrollAbsencesPanel: React.FC<PayrollAbsencesPanelProps> = ({ supabaseKey, supabaseUrl }) => {
  const [closingRows, setClosingRows] = useState<ClosingRow[]>([])
  const [employeeInfo, setEmployeeInfo] = useState<
    Map<string, { sector: string | null; company: number | null; status: number | null; date_hiring: string | null; date_status: string | null }>
  >(new Map())
  const [absenceEventRows, setAbsenceEventRows] = useState<PayrollEventRow[]>([])
  const [isLoadingAbsences, setIsLoadingAbsences] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')

  const parseYearMonth = (value?: string | null) => {
    if (!value) return null
    const parts = value.split('-')
    if (parts.length < 2) return null
    const year = Number(parts[0])
    const month = Number(parts[1])
    if (Number.isNaN(year) || Number.isNaN(month)) return null
    return { year, month }
  }

  const normalizeDateOnly = (value?: string | null) => {
    if (!value) return null
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? match[1] : value
  }

  const normalizeRegistration = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return null
    return String(value).trim()
  }

  const abbreviateSector = (sector: string | null): string => {
    if (!sector) return 'Sem setor';
    let abbreviated = sector.toUpperCase();
    abbreviated = abbreviated.replace('ADMINISTRATIVO', 'ADM.');
    abbreviated = abbreviated.replace('ADMINISTRAÇÃO', 'ADM.');
    abbreviated = abbreviated.replace('HIGIENIZAÇÃO', 'HIG.');
    abbreviated = abbreviated.replace('INDUSTRIAL', 'IND.');
    abbreviated = abbreviated.replace('SECUNDÁRIA', 'SEC.');
    abbreviated = abbreviated.replace('ALMOXARIFADO', 'ALMOX.');
    abbreviated = abbreviated.replace('EMBARQUE', 'EMB.');
    abbreviated = abbreviated.replace('BUCHARIA', 'BUCH.');
    abbreviated = abbreviated.replace('TÉCNICO', 'TÉC.');
    abbreviated = abbreviated.replace('INFORMÁTICA', 'INFOR.');
    abbreviated = abbreviated.replace('CONTROLE DE', 'C.');
    abbreviated = abbreviated.replace('SERVIÇOS', 'SERV.');
    abbreviated = abbreviated.replace('GERAIS', 'G.');
    abbreviated = abbreviated.replace('DEP.PESSOAL', 'D. P.');
    abbreviated = abbreviated.replace('PANTANEIRA', '');
    abbreviated = abbreviated.replace('SALA DE', 'S.');
    return abbreviated;
  };

  const SectorTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) => {
    if (x === undefined || y === undefined || !payload) return null
    return (
      <g transform={`translate(${x},${y}) rotate(-90)`}>
        <text
          textAnchor="end"
          dominantBaseline="central"
          fill="#9aa4b3ff"
          fontSize={10}
          fontWeight={600}
        >
          {payload.value}
        </text>
      </g>
    )
  }

  const countTooltip = ({ active, payload }: TooltipContentProps<any, any>) => {
    if (!active || !payload || payload.length === 0) return null
    const data = payload[0]?.payload as { label?: string; totalValue?: number; color: string } | undefined
    if (!data?.totalValue) return null
    return (
      <div className="rounded-lg border border-blue-500/60 bg-[#0f172a] px-3 py-2 text-xs text-white shadow-lg text-center">
        <div className="font-semibold flex items-center justify-center gap-2">
          <span style={{ backgroundColor: data.color }} className="h-2 w-2 rounded-full" />
          <div>{data?.label}</div>
        </div>
        <div className="mt-1 text-purple-300">{Number(data?.totalValue ?? 0).toLocaleString('pt-BR')}</div>
      </div>
    )
  }

  const formatLabelNumber = (value: unknown) => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric.toLocaleString('pt-BR') : ''
  }

  const formatIndicator = (value: number) => {
    if (value === 0) return '--'
    return value.toLocaleString('pt-BR')
  }

  const formatPercent = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0
    return `${safe.toFixed(1)}%`
  }

  const formatCompanyLabel = (value: number) => {
    if (value === 4) return 'Frigosul'
    if (value === 5) return 'Pantaneira'
    return String(value)
  }

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) {
      return
    }
    const controller = new AbortController()
    const fetchBase = async () => {
      try {
        const closingData: ClosingRow[] = []
        const closingUrl = new URL(`${supabaseUrl}/rest/v1/closing_payroll`)
        closingUrl.searchParams.set('select', 'company,competence,registration')
        const closingPageSize = 1000
        let closingStart = 0
        let closingHasMore = true
        while (closingHasMore) {
          const closingRes = await fetch(closingUrl.toString(), {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Range: `${closingStart}-${closingStart + closingPageSize - 1}`,
            },
            signal: controller.signal,
          })
          if (!closingRes.ok) {
            throw new Error(await closingRes.text())
          }
          const closingChunk = (await closingRes.json()) as ClosingRow[]
          closingData.push(...closingChunk)
          if (closingChunk.length < closingPageSize) {
            closingHasMore = false
          } else {
            closingStart += closingPageSize
          }
        }
        setClosingRows(closingData)

        const employeeData: EmployeeSectorRow[] = []
        const employeeUrl = new URL(`${supabaseUrl}/rest/v1/employee`)
        employeeUrl.searchParams.set('select', 'registration,sector,company,status,date_hiring,date_status')
        const employeePageSize = 1000
        let employeeStart = 0
        let employeeHasMore = true
        while (employeeHasMore) {
          const employeeRes = await fetch(employeeUrl.toString(), {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Range: `${employeeStart}-${employeeStart + employeePageSize - 1}`,
            },
            signal: controller.signal,
          })
          if (!employeeRes.ok) {
            throw new Error(await employeeRes.text())
          }
          const employeeChunk = (await employeeRes.json()) as EmployeeSectorRow[]
          employeeData.push(...employeeChunk)
          if (employeeChunk.length < employeePageSize) {
            employeeHasMore = false
          } else {
            employeeStart += employeePageSize
          }
        }
        const sectorMap = new Map<string, { sector: string | null; company: number | null; status: number | null; date_hiring: string | null; date_status: string | null }>()
        employeeData.forEach((row) => {
          const regKey = normalizeRegistration(row.registration)
          if (!regKey) return
          sectorMap.set(regKey, {
            sector: row.sector ?? null,
            company: row.company ?? null,
            status: row.status ?? null,
            date_hiring: row.date_hiring ?? null,
            date_status: row.date_status ?? null,
          })
        })
        setEmployeeInfo(sectorMap)
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          // No UI surface yet for filter errors.
        }
      } finally {
      }
    }
    fetchBase()
    return () => controller.abort()
  }, [supabaseKey, supabaseUrl])

  const companyOptions = useMemo(() => {
    const values = closingRows
      .map((row) => row.company)
      .filter((value): value is number => value !== null && value !== undefined)
    return Array.from(new Set(values)).sort((a, b) => a - b)
  }, [closingRows])

  const competenceOptions = useMemo(() => {
    const values = closingRows
      .map((row) => normalizeDateOnly(row.competence))
      .filter((value): value is string => Boolean(value))
    return Array.from(new Set(values))
  }, [closingRows])

  const yearOptions = useMemo(() => {
    const years = competenceOptions
      .map((value) => parseYearMonth(value)?.year)
      .filter((value): value is number => value !== null && value !== undefined)
    return Array.from(new Set(years)).sort((a, b) => b - a)
  }, [competenceOptions])

  const monthOptions = useMemo(() => {
    const months = competenceOptions
      .map((value) => parseYearMonth(value))
      .filter((value): value is { year: number; month: number } => Boolean(value))
      .filter((value) => (!yearFilter ? true : value.year === Number(yearFilter)))
      .map((value) => value.month)
    return Array.from(new Set(months)).sort((a, b) => a - b)
  }, [competenceOptions, yearFilter])

  const sectorOptions = useMemo(() => {
    const sectors: string[] = []
    const targetYear = Number(yearFilter)
    const targetMonth = Number(monthFilter)
    closingRows.forEach((row) => {
      if (companyFilter && String(row.company ?? '') !== companyFilter) return
      const parsed = parseYearMonth(row.competence)
      if (yearFilter && (!parsed || parsed.year !== targetYear)) return
      if (monthFilter && (!parsed || parsed.year !== targetYear || parsed.month !== targetMonth)) return
      const regKey = normalizeRegistration(row.registration)
      if (!regKey) return
      const sector = employeeInfo.get(regKey)?.sector
      if (sector) sectors.push(sector)
    })
    return Array.from(new Set(sectors)).sort((a, b) => a.localeCompare(b))
  }, [closingRows, companyFilter, employeeInfo, monthFilter, yearFilter])

  useEffect(() => {
    if (!companyFilter && companyOptions.length > 0) {
      setCompanyFilter(String(companyOptions[0]))
    }
  }, [companyOptions, companyFilter])

  useEffect(() => {
    if (!yearFilter && yearOptions.length > 0) {
      setYearFilter(String(yearOptions[0]))
    }
  }, [yearOptions, yearFilter])

  useEffect(() => {
    if (!monthFilter && monthOptions.length > 0) {
      setMonthFilter(String(monthOptions[0]))
    } else if (monthFilter && monthOptions.length > 0 && !monthOptions.includes(Number(monthFilter))) {
      setMonthFilter(String(monthOptions[0]))
    }
  }, [monthFilter, monthOptions])

  useEffect(() => {
    if (sectorFilter && sectorOptions.length > 0 && !sectorOptions.includes(sectorFilter)) {
      setSectorFilter('')
    }
  }, [sectorFilter, sectorOptions])

  const filteredRegistrations = useMemo(() => {
    const regs = new Set<string>()
    const targetYear = Number(yearFilter)
    const targetMonth = Number(monthFilter)
    closingRows.forEach((row) => {
      if (companyFilter && String(row.company ?? '') !== companyFilter) return
      const parsed = parseYearMonth(row.competence)
      if (yearFilter && (!parsed || parsed.year !== targetYear)) return
      if (monthFilter && (!parsed || parsed.year !== targetYear || parsed.month !== targetMonth)) return
      if (sectorFilter) {
        const regKey = normalizeRegistration(row.registration)
        const sector = regKey ? employeeInfo.get(regKey)?.sector ?? null : null
        if (!sector || sector !== sectorFilter) return
      }
      const regKey = normalizeRegistration(row.registration)
      if (!regKey) return
      regs.add(regKey)
    })
    return regs
  }, [closingRows, companyFilter, employeeInfo, monthFilter, sectorFilter, yearFilter])

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return
    if (!yearFilter || !monthFilter) return
    if (filteredRegistrations.size === 0) {
      setAbsenceEventRows([])
      return
    }
    const controller = new AbortController()
    const fetchAbsences = async () => {
      setIsLoadingAbsences(true)
      try {
        const competence = `${yearFilter}-${String(monthFilter).padStart(2, '0')}-01`
        const url = new URL(`${supabaseUrl}/rest/v1/payroll`)
        url.searchParams.set('select', 'registration,events,volue,references_,competence')
        url.searchParams.set('competence', `eq.${competence}`)
        
        const allAbsenceEventIds = Object.values(ABSENCE_EVENT_IDS).flat();
        if (allAbsenceEventIds.length > 0) {
            url.searchParams.set('events', `in.(${allAbsenceEventIds.join(',')})`);
        }

        const registrations = Array.from(filteredRegistrations)
        if (registrations.length > 0 && registrations.length <= 500) {
          url.searchParams.set('registration', `in.(${registrations.join(',')})`)
        }
        
        const payrollData: PayrollEventRow[] = []
        const pageSize = 1000
        let start = 0
        let hasMore = true
        while (hasMore) {
          const res = await fetch(url.toString(), {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Range: `${start}-${start + pageSize - 1}`,
            },
            signal: controller.signal,
          })
          if (!res.ok) {
            throw new Error(await res.text())
          }
          const chunk = (await res.json()) as PayrollEventRow[]
          payrollData.push(...chunk)
          if (chunk.length < pageSize) {
            hasMore = false
          } else {
            start += pageSize
          }
        }
        setAbsenceEventRows(payrollData)
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setAbsenceEventRows([])
        }
      } finally {
        setIsLoadingAbsences(false)
      }
    }
    fetchAbsences()
    return () => controller.abort()
  }, [filteredRegistrations, supabaseKey, supabaseUrl, yearFilter, monthFilter])

  const absenceIndicators = useMemo(() => {
    let totalAbsenceDays = 0
    let medicalLeaveDays = 0
    let unjustifiedAbsenceDays = 0
    let vacationDays = 0
    let maternityLeaveDays = 0
    let paternityLeaveDays = 0
    let totalEmployeesWithAbsence = new Set<string>()

    absenceEventRows.forEach((row) => {
      const days = row.references_ ?? 0 // Assuming 'references_' stores days
      if (days > 0) {
        totalAbsenceDays += days
        if (row.registration) {
          totalEmployeesWithAbsence.add(normalizeRegistration(row.registration)!)
        }
      }

      if (ABSENCE_EVENT_IDS.MEDICAL_LEAVE.includes(row.events!)) medicalLeaveDays += days
      if (ABSENCE_EVENT_IDS.UNJUSTIFIED_ABSENCE.includes(row.events!)) unjustifiedAbsenceDays += days
      if (ABSENCE_EVENT_IDS.VACATION.includes(row.events!)) vacationDays += days
      if (ABSENCE_EVENT_IDS.MATERNITY_LEAVE.includes(row.events!)) maternityLeaveDays += days
      if (ABSENCE_EVENT_IDS.PATERNITY_LEAVE.includes(row.events!)) paternityLeaveDays += days
    })

    const totalActiveEmployees = filteredRegistrations.size; // Total employees for the period
    const avgAbsenceDaysPerEmployee = totalActiveEmployees > 0 ? totalAbsenceDays / totalActiveEmployees : 0;
    const absenceRate = totalActiveEmployees > 0 ? (totalAbsenceDays / (totalActiveEmployees * 22)) * 100 : 0; // Assuming 22 working days/month

    return {
      totalAbsenceDays,
      medicalLeaveDays,
      unjustifiedAbsenceDays,
      vacationDays,
      maternityLeaveDays,
      paternityLeaveDays,
      avgAbsenceDaysPerEmployee,
      totalEmployeesWithAbsence: totalEmployeesWithAbsence.size,
      absenceRate,
    }
  }, [absenceEventRows, filteredRegistrations])

  const absenceByTypeChartData = useMemo(() => {
    const data = [
      { label: 'Atestados', value: absenceIndicators.medicalLeaveDays },
      { label: 'Faltas Injust.', value: absenceIndicators.unjustifiedAbsenceDays },
      { label: 'Férias', value: absenceIndicators.vacationDays },
      { label: 'Lic. Maternidade', value: absenceIndicators.maternityLeaveDays },
      { label: 'Lic. Paternidade', value: absenceIndicators.paternityLeaveDays },
    ].filter(item => item.value > 0)

    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map((item, idx) => ({
      ...item,
      percent: total > 0 ? (item.value / total) * 100 : 0,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    })).sort((a,b) => b.value - a.value)
  }, [absenceIndicators])

  const absenceBySectorChartData = useMemo(() => {
    const sectorAbsences = new Map<string, number>()
    absenceEventRows.forEach((row) => {
      const regKey = normalizeRegistration(row.registration)
      if (!regKey || !filteredRegistrations.has(regKey)) return
      const sector = abbreviateSector(employeeInfo.get(regKey)?.sector ?? null)
      sectorAbsences.set(sector, (sectorAbsences.get(sector) || 0) + (row.references_ ?? 0)) // Assuming references_ is days
    })
    return Array.from(sectorAbsences.entries())
      .map(([label, totalValue], idx) => ({ label, totalValue, color: CHART_COLORS[idx % CHART_COLORS.length] }))
      .sort((a,b) => b.totalValue - a.totalValue)
  }, [absenceEventRows, filteredRegistrations, employeeInfo])

  const handleClearFilters = () => {
    setCompanyFilter(companyOptions.length ? String(companyOptions[0]) : '')
    setYearFilter(yearOptions.length ? String(yearOptions[0]) : '')
    setMonthFilter(monthOptions.length ? String(monthOptions[0]) : '')
    setSectorFilter('')
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-lg p-3 shadow-inner shadow-black/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-200 font-semibold">
            <CalendarX className="w-6 h-6 text-amber-300" />
            AFASATAMENTOS
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <div className="flex items-center gap-2 text-white/60 text-[11px] uppercase tracking-[0.2em]">
              <Filter className="w-4 h-4 text-emerald-300" />
              Filtros
            </div>
            <select
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="bg-white/5 text-emerald-300 text-[11px] border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
            >
              {companyOptions.map((company) => (
                <option key={company} value={String(company)} className="bg-[#1f2c4d] text-emerald-300">
                  {formatCompanyLabel(company)}
                </option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="bg-white/5 text-emerald-300 text-[11px] border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
            >
              {yearOptions.map((year) => (
                <option key={year} value={String(year)} className="bg-[#1f2c4d] text-emerald-300">
                  {year}
                </option>
              ))}
            </select>
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="bg-white/5 text-emerald-300 text-[11px] border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
            >
              {monthOptions.map((month) => (
                <option key={month} value={String(month)} className="bg-[#1f2c4d] text-emerald-300">
                  {String(month).padStart(2, '0')}
                </option>
              ))}
            </select>
            <select
              value={sectorFilter}
              onChange={(event) => setSectorFilter(event.target.value)}
              className="bg-white/5 text-emerald-300 text-[11px] border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
            >
              <option value="" className="bg-[#1f2c4d] text-emerald-300">
                Setor
              </option>
              {sectorOptions.map((sector) => (
                <option key={sector} value={sector} className="bg-[#1f2c4d] text-emerald-300">
                  {sector}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center text-emerald-100 rounded-full border border-transparent px-2 py-1.5 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
              title="Limpar filtros"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-gradient-to-br from-purple-300/25 via-purple-500/20 to-slate-900/45 border border-purple-300/30 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Total Dias Ausentes</p>
              <div className="-mt-1">
                <CalendarX className="w-5 h-5 text-purple-300" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-2xl font-semibold text-purple-200">
                {isLoadingAbsences ? '...' : formatIndicator(absenceIndicators.totalAbsenceDays)}
              </p>
            </div>
            <div className="h-4" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-cyan-300/25 via-cyan-500/20 to-slate-900/45 border border-cyan-300/30 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Dias Ausentes p/ Colaborador</p>
              <div className="-mt-1">
                <UserMinus className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-2xl font-semibold text-cyan-200">
                {isLoadingAbsences ? '...' : absenceIndicators.avgAbsenceDaysPerEmployee.toFixed(1)}
              </p>
            </div>
            <div className="h-4" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-300/25 via-pink-500/20 to-slate-900/45 border border-pink-300/30 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Taxa de Ausencia</p>
              <div className="-mt-1">
                <Hospital className="w-5 h-5 text-pink-300" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-2xl font-semibold text-pink-200">
                {isLoadingAbsences ? '...' : formatPercent(absenceIndicators.absenceRate)}
              </p>
            </div>
            <div className="h-4" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-teal-300/25 via-teal-500/20 to-slate-900/45 border border-teal-300/30 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Colaboradores c/ Ausencia</p>
              <div className="-mt-1">
                <Users className="w-5 h-5 text-teal-300" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-2xl font-semibold text-teal-200">
                {isLoadingAbsences ? '...' : formatIndicator(absenceIndicators.totalEmployeesWithAbsence)}
              </p>
            </div>
            <div className="h-4" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="bg-blue-900/30 border border-blue-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-white mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Ausências por Tipo</p>
            </div>
            <span className="text-emerald-300 text-xs font-semibold">{formatIndicator(absenceIndicators.totalAbsenceDays)} dias</span>
          </div>
          {isLoadingAbsences ? (
            <div className="h-64 flex items-center justify-center text-white/50 text-sm">Carregando...</div>
          ) : absenceByTypeChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-white/50 text-sm">Sem dados para exibir.</div>
          ) : (
            <div className="relative mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={absenceByTypeChartData} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    height={80}
                    tick={<SectorTick />}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    tick={{ fill: '#9aa4b3ff', fontSize: 10 }}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <RechartsTooltip content={countTooltip} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {absenceByTypeChartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={formatLabelNumber}
                      fill="#FFFFFF"
                      fontSize={12}
                     
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-blue-900/30 border border-blue-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Ausências por Setor</p>
            <span className="text-emerald-300 text-xs font-semibold">{formatIndicator(absenceIndicators.totalAbsenceDays)} dias</span>
          </div>
          {isLoadingAbsences ? (
            <div className="h-64 flex items-center justify-center text-white/50 text-sm">Carregando...</div>
          ) : absenceBySectorChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-white/50 text-sm">Sem dados para exibir.</div>
          ) : (
            <div className="mt-3 h-64 rounded-lg border border-white/10 bg-white/5 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={absenceBySectorChartData} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    height={80}
                    tick={<SectorTick />}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    tick={{ fill: '#9aa4b3ff', fontSize: 10 }}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <RechartsTooltip content={countTooltip} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="totalValue" radius={[8, 8, 0, 0]}>
                    {absenceBySectorChartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="totalValue"
                      position="top"
                      formatter={formatLabelNumber}
                      fill="#FFFFFF"
                      fontSize={12}
                     
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PayrollAbsencesPanel