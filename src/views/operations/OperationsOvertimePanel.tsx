import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Edit,
  Trash2,
  Database,
  Users,
  Clock,
  DollarSign,
  Table,
  LayoutGrid,
  Filter,
  RotateCw,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import OperationsDataPreview from "../../components/OperationsDataPreview";
import { type SheetData } from '../../views/Table_load'
import { useOvertimeData } from '../../utils/useOvertimeData'
import StatCardSkeleton from '../../components/StatCardSkeleton'
import ChartSkeleton from '../../components/ChartSkeleton'

interface OperationsOvertimePanelProps {
  supabaseUrl?: string
  supabaseKey?: string
}

const OperationsOvertimePanel: React.FC<OperationsOvertimePanelProps> = ({ supabaseUrl, supabaseKey }) => {
  const [filterText, setFilterText] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1))
  const [filterStartDay, setFilterStartDay] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [companies, setCompanies] = useState<string[]>([])
  const [sectors, setSectors] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [days, setDays] = useState<string[]>([])
  const textFilterActive = filterText.trim().length > 0
  const [activeTab, setActiveTab] = useState<'paniel' | 'dados'>('paniel')

  const {
    isLoading: isLoadingOvertime,
    error: overtimeError,
    stats,
    moneyStats,
    sectorHoursChartData,
    sectorValuesChartData,
    chartSeries,
    previewRows: overtimePreviewRows,
    minutesToInterval,
  } = useOvertimeData({ active: 'overtime', supabaseUrl, supabaseKey, filterText, filterYear, filterMonth, filterStartDay, filterCompany, filterSector })

  const handleFilterChange = (value: string) => {
    setFilterText(value)
  }

  const handleYearChange = (value: string) => {
    setFilterYear(value)
  }

  const handleMonthChange = (value: string) => {
    setFilterMonth(value)
  }

  const handleStartDayChange = (value: string) => {
    setFilterStartDay(value)
  }

  const handleCompanyChange = (value: string) => {
    setFilterCompany(value)
  }

  const handleSectorChange = (value: string) => {
    setFilterSector(value)
  }

  const handleClearFilters = () => {
    const currentYear = new Date().getFullYear().toString()
    const currentMonth = String(new Date().getMonth() + 1)
    setFilterCompany('')
    setFilterSector('')
    setFilterYear(currentYear)
    setFilterMonth(currentMonth)
    setFilterStartDay('')
    setFilterText('')
  }

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return

    const fetchFilters = async () => {
      try {
        const empUrl = new URL(`${supabaseUrl}/rest/v1/employee`)
        empUrl.searchParams.set('select', 'company,sector')

        const res = await fetch(empUrl.toString(), {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          const uniqueCompanies = [...new Set(data.map((e: any) => String(e.company)))].sort()
          const uniqueSectors = [...new Set(data.map((e: any) => e.sector))].filter(Boolean).sort()
          setCompanies(uniqueCompanies as string[])
          setSectors(uniqueSectors as string[])
        }

        const overtimeUrl = new URL(`${supabaseUrl}/rest/v1/overtime`)
        overtimeUrl.searchParams.set('select', 'date_')

        const overtimeRes = await fetch(overtimeUrl.toString(), {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        })

        if (overtimeRes.ok) {
          const overtimeData = await overtimeRes.json()
          const uniqueYears = [...new Set(overtimeData.map((e: any) => {
            const match = e.date_?.match(/^(\d{4})/)
            return match ? match[1] : null
          }))].filter(Boolean).sort((a, b) => Number(b) - Number(a))
          setYears(uniqueYears as string[])
        }
      } catch {
      }
    }
    fetchFilters()
  }, [supabaseUrl, supabaseKey])

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey || !filterYear) return

    const fetchMonths = async () => {
      try {
        const url = new URL(`${supabaseUrl}/rest/v1/overtime`)
        url.searchParams.set('select', 'date_')
        url.searchParams.set('date_', `gte.${filterYear}-01-01`)
        url.searchParams.append('date_', `lte.${filterYear}-12-31`)

        const res = await fetch(url.toString(), {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          const uniqueMonths = [...new Set(data.map((e: any) => {
            const match = e.date_?.match(/^\d{4}-(\d{2})/)
            return match ? String(Number(match[1])) : null
          }))].filter(Boolean).sort((a, b) => Number(a) - Number(b))
          setMonths(uniqueMonths as string[])

          if (uniqueMonths.length > 0 && !uniqueMonths.includes(filterMonth)) {
            setFilterMonth(uniqueMonths[uniqueMonths.length - 1] as string)
          }
        }
      } catch {
      }
    }
    fetchMonths()
  }, [supabaseUrl, supabaseKey, filterYear])

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey || !filterYear || !filterMonth) return

    const fetchDays = async () => {
      try {
        let allowedRegistrations: number[] | null = null

        if (filterCompany || filterSector) {
          const empUrl = new URL(`${supabaseUrl}/rest/v1/employee`)
          empUrl.searchParams.set('select', 'registration')
          if (filterCompany) {
            empUrl.searchParams.set('company', `eq.${filterCompany}`)
          }
          if (filterSector) {
            empUrl.searchParams.set('sector', `eq.${filterSector}`)
          }

          const empRes = await fetch(empUrl.toString(), {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          })

          if (empRes.ok) {
            const empData = await empRes.json()
            allowedRegistrations = empData.map((e: any) => e.registration)
            if (allowedRegistrations && allowedRegistrations.length === 0) {
              setDays([])
              setFilterStartDay('')
              return
            }
          }
        }

        const month = filterMonth.padStart(2, '0')
        const lastDayOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 0).getDate()
        
        const buildSupabaseQueryForDays = (
          basePath: string,
          {
            filterText,
            allowedRegistrations,
          }: {
            filterText?: string
            allowedRegistrations?: number[] | null
          },
        ) => {
          const url = new URL(basePath)
          if (allowedRegistrations && allowedRegistrations.length > 0) {
            url.searchParams.set('registration', `in.(${allowedRegistrations.join(',')})`)
          }
          if (filterText?.trim()) {
            const needle = filterText.trim()
            url.searchParams.set('or', `(registration.ilike.${needle}*,name.ilike.*${needle}*)`)
          }
          return url
        }

        const buildUrl = () => {
          const url = buildSupabaseQueryForDays(`${supabaseUrl}/rest/v1/overtime`, { filterText, allowedRegistrations })
          url.searchParams.set('select', 'date_')
          url.searchParams.set('order', 'date_.asc')
          url.searchParams.set('date_', `gte.${filterYear}-${month}-01`)
          url.searchParams.append('date_', `lte.${filterYear}-${month}-${String(lastDayOfMonth).padStart(2, '0')}`)
          return url
        }

        const pageSize = 1000
        let from = 0
        let hasMore = true
        const allRows: any[] = []

        while (hasMore) {
          const url = buildUrl()
          const rangeHeader = `${from}-${from + pageSize - 1}`

          const res = await fetch(url.toString(), {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Range: rangeHeader,
              Prefer: 'count=exact',
            },
          })

          if (!res.ok) {
            hasMore = false
            break
          }

          const batch = await res.json()
          allRows.push(...batch)

          const contentRange = res.headers.get('content-range')
          const total = contentRange ? Number(contentRange.split('/')[1]) : null
          const received = batch.length

          if (!total || received < pageSize || from + received >= total) {
            hasMore = false
          } else {
            from += pageSize
          }
        }

        if (allRows.length > 0) {
          const uniqueDays = [...new Set(allRows.map((e: any) => {
            const match = e.date_?.match(/^\d{4}-\d{2}-(\d{2})/)
            return match ? match[1] : null
          }))].filter(Boolean).sort((a, b) => Number(a) - Number(b))
          setDays(uniqueDays as string[])

          if (uniqueDays.length === 0) {
            setFilterStartDay('')
            return
          }

          if (filterStartDay && !uniqueDays.includes(filterStartDay)) {
            setFilterStartDay('')
          }
        } else {
          setDays([])
          setFilterStartDay('')
        }
      } catch {
        setDays([])
        setFilterStartDay('')
      }
    }
    fetchDays()
  }, [supabaseUrl, supabaseKey, filterYear, filterMonth, filterCompany, filterSector, filterText, filterStartDay])

  const formatDate = useCallback((value: string) => {
    if (!value) return '-'
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, , month, day] = match
      return `${day}/${month}`
    }
    return value
  }, [])

  const formatCurrency = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    if (safeValue === 0) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(safeValue);
  }

  const formatDecimalToTime = (minutes: number) => minutesToInterval(minutes)

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
    abbreviated = abbreviated.replace(/SALA DE/g, 'S.');
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
          {abbreviateSector(payload.value)}
        </text>
      </g>
    )
  }



  interface OvertimeTooltipProps extends TooltipContentProps<any, any> {
    valueFormatter: (value: number) => string;
  }

  const OvertimeTooltip: React.FC<OvertimeTooltipProps> = ({ active, payload, label, valueFormatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-blue-500/60 bg-[#0f172a] px-3 py-2 text-xs text-white shadow-lg">
          <p className="font-semibold text-center mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((pld) => (
              <div key={pld.dataKey as string} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span style={{ backgroundColor: pld.color }} className="h-2 w-2 rounded-full" />
                  <span className="text-white/80">{pld.name}:</span>
                </div>
                <span className="font-semibold" style={{ color: pld.color }}>
                  {valueFormatter(pld.value as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const previewRows = useMemo(() => {
    let sum60 = 0
    let sumComp60 = 0
    let sum100 = 0
    let totalAccum60Fmt = '-'
    let totalAccum100Fmt = '-'

    const rows = overtimePreviewRows.map((item) => {
      let dataLabel = '-'
      if (item.firstDate && item.lastDate) {
        dataLabel = item.firstDate === item.lastDate
          ? formatDate(item.firstDate)
          : `${formatDate(item.firstDate)} - ${formatDate(item.lastDate)}`
      }

      const total60Fmt = minutesToInterval(item.total60)
      const totalCompFmt = minutesToInterval(item.comp60)
      const total100Fmt = minutesToInterval(item.total100)
      const accum60Fmt = minutesToInterval(item.accum60)
      const accum100Fmt = minutesToInterval(item.accum100)

      if (textFilterActive) {
        sum60 += item.total60
        sumComp60 += item.comp60
        sum100 += item.total100
        if (totalAccum60Fmt === '-' && totalAccum100Fmt === '-') {
          totalAccum60Fmt = accum60Fmt
          totalAccum100Fmt = accum100Fmt
        }
      }

      return {
        Data: dataLabel,
        Cadastro: item.registration,
        Nome: item.name,
        'Hrs 60%': total60Fmt,
        'Comp 60%': totalCompFmt,
        'Hrs 100%': total100Fmt,
        '60% Acumulado': textFilterActive ? '-' : accum60Fmt,
        '100% Acumulado': textFilterActive ? '-' : accum100Fmt,
        _isTotalsRow: false,
        ACOES: (
          <div className="flex items-center justify-center gap-1 text-white/80">
            <button
              type="button"
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4 text-blue-400" />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        ),
      }
    })

    if (textFilterActive && rows.length > 0) {
      rows.push({
        Data: String(rows.length),
        Cadastro: '-',
        Nome: 'Total',
        'Hrs 60%': minutesToInterval(sum60),
        'Comp 60%': minutesToInterval(sumComp60),
        'Hrs 100%': minutesToInterval(sum100),
        '60% Acumulado': totalAccum60Fmt,
        '100% Acumulado': totalAccum100Fmt,
        _isTotalsRow: true,
        ACOES: <div className="text-center text-white/50">-</div>,
      })
    }

    return rows
  }, [overtimePreviewRows, formatDate, minutesToInterval, textFilterActive])

  return (
    <div className="space-y-3">
      <div className="bg-white/5 border border-white/10 rounded-lg p-3 shadow-inner shadow-black/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-200 font-semibold">
            <Clock className="w-6 h-6 text-amber-300" />
            HORAS EXTRAS
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <div className="flex items-center gap-2 text-white/60 text-[11px] uppercase tracking-[0.2em]">
              <Filter className="w-4 h-4 text-emerald-300" />
              Filtros
            </div>
            <input
              type="text"
              value={filterText}
              onChange={(e) => handleFilterChange(e.target.value)}
              placeholder="Filtrar por nome ou cadastro"
              className="w-full sm:w-56 bg-white/5 text-emerald-300 text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
            />
            <select
              value={filterCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              disabled={textFilterActive}
              className={`bg-white/5 text-emerald-300 text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400 ${textFilterActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="" className="bg-[#1f2c4d] text-emerald-300">Empresa</option>
              {companies.map((c) => (
                <option key={c} value={c} className="bg-[#1f2c4d] text-emerald-300">{c}</option>
              ))}
            </select>
            <select
              value={filterSector}
              onChange={(e) => handleSectorChange(e.target.value)}
              disabled={textFilterActive}
              className={`bg-white/5 text-emerald-300 text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400 max-w-32 truncate ${textFilterActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="" className="bg-[#1f2c4d] text-emerald-300">Setor</option>
              {sectors.map((s) => (
                <option key={s} value={s} className="bg-[#1f2c4d] text-emerald-300">{s}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="bg-white/5 text-emerald-300 text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
            >
              <option value="" className="bg-[#1f2c4d] text-emerald-300">Ano</option>
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#1f2c4d] text-emerald-300">{y}</option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-white/5 text-emerald-300 text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
            >
              <option value="" className="bg-[#1f2c4d] text-emerald-300">Mês</option>
              {months.map((m) => {
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                return (
                  <option key={m} value={m} className="bg-[#1f2c4d] text-emerald-300">{monthNames[Number(m) - 1]}</option>
                )
              })}
            </select>
            <select
              value={filterStartDay}
              onChange={(e) => handleStartDayChange(e.target.value)}
              disabled={textFilterActive}
              className={`bg-white/5 text-emerald-300 text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400 ${textFilterActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="" className="bg-[#1f2c4d] text-emerald-300">Dia</option>
              {days.map((d) => (
                <option key={d} value={d} className="bg-[#1f2c4d] text-emerald-300">{d}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center text-emerald-100 rounded-full border border-transparent px-2 py-1.5 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
              title="Limpar filtros"
              aria-label="Limpar filtros"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <div className="flex">
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeTab === 'paniel'
                ? 'bg-emerald-500/20 text-emerald-100 border-b-2 border-emerald-400'
              : 'text-white/70 hover:text-white'
            }`}
            onClick={() => setActiveTab('paniel')}
          >
            <span className="inline-flex items-center gap-1 justify-center">
              <LayoutGrid className="w-4 h-4" />
              Paniel
            </span>
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeTab === 'dados'
                ? 'bg-emerald-500/20 text-emerald-100 border-b-2 border-emerald-400'
              : 'text-white/70 hover:text-white'
            }`}
            onClick={() => setActiveTab('dados')}
          >
            <span className="inline-flex items-center gap-1 justify-center">
              <Table className="w-4 h-4" />
              Dados
            </span>
          </button>
        </div>
        <div className="p-3">
          {activeTab === 'paniel' && (
            <>
              {isLoadingOvertime ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <ChartSkeleton />
                    <ChartSkeleton />
                    <ChartSkeleton />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-white">
                    {/* Card 1: Total Colaboradores */}
                    <div className="group relative bg-slate-800/50 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-sm overflow-hidden h-28 flex flex-col justify-between">
                      <div className="absolute -top-1/2 -right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-300"></div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Total Colaboradores</h3>
                        <Database className="w-5 h-5 text-amber-400/80" />
                      </div>
                      <div className="flex items-center justify-center text-center">
                        <span className="text-4xl font-extrabold tracking-tight">{stats.totalEmployees}</span>
                      </div>
                    </div>

                    {/* Card 2: Colaboradores com Horas */}
                    <div className="group relative bg-slate-800/50 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-sm overflow-hidden h-28 flex flex-col justify-between">
                      <div className="absolute -top-1/2 -right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-300"></div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Colaboradores c/ Horas</h3>
                        <Users className="w-5 h-5 text-emerald-400/80" />
                      </div>
                      <div className="flex items-center justify-center text-center">
                        <span className="text-4xl font-extrabold tracking-tight">{stats.employeesWithHours}</span>
                      </div>
                    </div>

                    {/* Card 3: Totais de Horas */}
                    <div className="group relative bg-slate-800/50 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-sm overflow-hidden h-28 flex flex-col justify-between">
                      <div className="absolute -top-1/2 -right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-300"></div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Totais de Horas</h3>
                        <Clock className="w-5 h-5 text-purple-400/80" />
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <div className="flex items-baseline gap-4">
                          <span className="text-lg font-bold text-blue-400">{formatDecimalToTime(stats.sum60)}</span>
                          <span className="text-lg font-bold text-purple-400">{formatDecimalToTime(stats.sum100)}</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="text-2xl font-extrabold tracking-tight">{formatDecimalToTime(stats.totalAll)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Valores Totais */}
                    <div className="group relative bg-slate-800/50 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-sm overflow-hidden h-28 flex flex-col justify-between">
                      <div className="absolute -top-1/2 -right-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-300"></div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Valores Totais</h3>
                        <DollarSign className="w-5 h-5 text-red-400/80" />
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <div className="flex items-baseline gap-4">
                          <span className="text-base font-bold text-blue-400">{formatCurrency(moneyStats.totalValue60)}</span>
                          <span className="text-base font-bold text-purple-400">{formatCurrency(moneyStats.totalValue100)}</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="text-2xl font-extrabold tracking-tight">{formatCurrency(moneyStats.totalValueAll)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <div className="bg-blue-900/30 border border-blue-500/40 rounded-xl p-4 shadow-lg">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Horas por Setor</p>
                      <div className="mt-3 h-64 rounded-lg border border-white/10 bg-white/5 chart-container">
                        {sectorHoursChartData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-white/50 text-sm">
                            Sem dados para exibir.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sectorHoursChartData} margin={{ top: 20, right: 16, left: 0, bottom: 12 }} barGap={0}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" />
                              <XAxis
                                dataKey="label"
                                interval={0}
                                height={80}
                                tick={<SectorTick />}
                                axisLine={{ stroke: '#475569' }}
                              />
                              <YAxis
                                tickFormatter={(tick) => formatDecimalToTime(Number(tick))}
                                tick={{ fill: '#9aa4b3ff', fontSize: 10 }}
                                axisLine={{ stroke: '#475569' }}
                              />
                              <RechartsTooltip content={(props) => (<OvertimeTooltip {...props} valueFormatter={formatDecimalToTime} />)} cursor={{ fill: 'transparent' }} />
                              <Bar dataKey="total60" name="60%" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                <LabelList
                                  dataKey="total60"
                                  position="top"
                                  formatter={(val: unknown) => formatDecimalToTime(Number(val))}
                                  fill="#FFFFFF"
                                  fontSize={12}
                                 
                                />
                              </Bar>
                              <Bar dataKey="total100" name="100%" fill="#a855f7" radius={[8, 8, 0, 0]}>
                                <LabelList
                                  dataKey="total100"
                                  position="top"
                                  formatter={(val: unknown) => formatDecimalToTime(Number(val))}
                                  fill="#FFFFFF"
                                  fontSize={12}
                                 
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-900/30 border border-blue-500/40 rounded-xl p-4 shadow-lg">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Valores por Setor</p>
                      <div className="mt-3 h-64 rounded-lg border border-white/10 bg-white/5 chart-container">
                        {sectorValuesChartData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-white/50 text-sm">
                            Sem dados para exibir.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sectorValuesChartData} margin={{ top: 20, right: 16, left: 0, bottom: 12 }} barGap={0}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" />
                              <XAxis
                                dataKey="label"
                                interval={0}
                                height={80}
                                tick={<SectorTick />}
                                axisLine={{ stroke: '#475569' }}
                              />
                              <YAxis
                                tickFormatter={(tick) => formatCurrency(Number(tick))}
                                tick={{ fill: '#9aa4b3ff', fontSize: 10 }}
                                axisLine={{ stroke: '#475569' }}
                              />
                              <RechartsTooltip content={(props) => (<OvertimeTooltip {...props} valueFormatter={formatCurrency} />)} cursor={{ fill: 'transparent' }} />
                              <Bar dataKey="value60" name="60%" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                <LabelList
                                  dataKey="value60"
                                  position="top"
                                  formatter={(val: unknown) => formatCurrency(Number(val))}
                                  fill="#FFFFFF"
                                  fontSize={12}
                                 
                                />
                              </Bar>
                              <Bar dataKey="value100" name="100%" fill="#a855f7" radius={[8, 8, 0, 0]}>
                                <LabelList
                                  dataKey="value100"
                                  position="top"
                                  formatter={(val: unknown) => formatCurrency(Number(val))}
                                  fill="#FFFFFF"
                                  fontSize={12}
                                 
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-900/30 border border-blue-500/40 rounded-xl p-4 shadow-lg">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Histórico de Horas Extras</p>
                      <div className="mt-3 h-52 rounded-lg border border-white/10 bg-white/5 chart-container">
                        {chartSeries.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-white/50 text-sm">
                            Sem dados para exibir.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartSeries} margin={{ top: 20, right: 16, left: 0, bottom: 12 }} barGap={0}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" />
                              <XAxis
                                dataKey="label"
                                interval={0}
                                height={40}
                                tick={{ fill: '#9aa4b3ff', fontSize: 10 }}
                                axisLine={{ stroke: '#475569' }}
                              />
                              <YAxis
                                tickFormatter={(tick) => formatDecimalToTime(Number(tick))}
                                tick={{ fill: '#9aa4b3ff', fontSize: 10 }}
                                axisLine={{ stroke: '#475569' }}
                              />
                              <RechartsTooltip content={(props) => (<OvertimeTooltip {...props} valueFormatter={formatDecimalToTime} />)} cursor={{ fill: 'transparent' }} />
                              <Bar dataKey="total60" name="60%" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                              <Bar dataKey="total100" name="100%" fill="#a855f7" radius={[8, 8, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {activeTab === 'dados' && (
            <>
              {overtimeError && <p className="text-rose-300 text-sm">{overtimeError}</p>}
              {!overtimeError && (
                <OperationsDataPreview
                  show
                  data={previewRows as SheetData}
                  columns={[
                    'Data',
                    'Cadastro',
                    'Nome',
                    'Hrs 60%',
                    'Comp 60%',
                    'Hrs 100%',
                    '60% Acumulado',
                    '100% Acumulado',
                    'ACOES',
                  ]}
                  filterText={filterText}
                  onFilterChange={handleFilterChange}
                  isLoading={isLoadingOvertime}
                  hideHeader
                  showFilterInput={false}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default OperationsOvertimePanel
