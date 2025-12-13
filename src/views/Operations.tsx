import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  ArrowLeft,
  Settings,
  Bell,
  Clock3,
  CalendarX2,
  Factory,
  Edit,
  Trash2,
  X,
  Database,
  Users,
  Clock,
  DollarSign,
  Table,
  LayoutGrid,
} from 'lucide-react'
import OperationsDataPreview from '../components/OperationsDataPreview'
import { type SheetData } from './Table_load' // This line was corrected
import { useOvertimeData } from '../utils/useOvertimeData'
import VerticalBarChart from '../components/VerticalBarChart'
import ChartMini from '../components/ChartMini'
import StatCardSkeleton from '../components/StatCardSkeleton'
import ChartSkeleton from '../components/ChartSkeleton'

interface OperationsProps {
  onBack: () => void
  userName?: string
  userRole?: string
  title?: string
  description?: string
  supabaseUrl?: string
  supabaseKey?: string
}

const sidebarItems = [
  { key: 'faltas', label: 'Faltas', icon: CalendarX2 },
  { key: 'overtime', label: 'Horas Extras', icon: Clock3 },
  { key: 'producao', label: 'Producao', icon: Factory },
  { key: 'alerts', label: 'Alerta', icon: Bell },
  { key: 'config', label: 'Configuracao', icon: Settings },
]

const Operations: React.FC<OperationsProps> = ({ onBack, userName, userRole, title, description, supabaseUrl, supabaseKey, }) => {
  const [active, setActive] = useState<string>('overtime')
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
  const activeSidebarItem = sidebarItems.find((item) => item.key === active)
  const ActiveSidebarIcon = activeSidebarItem?.icon
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
  } = useOvertimeData({ active, supabaseUrl, supabaseKey, filterText, filterYear, filterMonth, filterStartDay, filterCompany, filterSector })

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
            return match ? String(Number(match[1])) : null
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

  const formatCurrency = (val: number) => {
    const safe = Number.isFinite(val) ? val : 0
    return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
  }

  const formatDecimalToTime = (minutes: number) => minutesToInterval(minutes)

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">{title || 'Operacoes'}</p>
          <h3 className="text-white text-xl font-semibold mt-1">
            {description || 'Gestao de operacoes RH, Producao e Controle de Horas Extras.'}
          </h3>
        </div>
        <div className="flex items-center gap-3 bg-white/10 border border-white/15 px-4 py-3 rounded-xl shadow-inner shadow-black/20">
          <div>
            <p className="text-emerald-300 font-semibold leading-tight">{userName}</p>
            <p className="text-white/60 text-[11px] uppercase tracking-[0.25em]">{userRole}</p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-emerald-100 bg-emerald-500/15 border border-emerald-500/40 px-3 py-2 rounded-lg hover:bg-emerald-500/25 hover:border-emerald-400/70 transition-colors text-xs font-semibold uppercase tracking-wide"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>

      <div className="flex gap-0">
        {/* Adiciona a classe 'group' para controlar o hover de toda a barra lateral */}
        <div className="group relative self-start">
          {/* A largura se expande no hover do grupo. Adiciona transição. */}
          <div className="flex flex-col bg-white/5 border border-white/10 border-r-0 rounded-l-xl overflow-hidden w-12 group-hover:w-40 transition-all duration-300 shadow-inner shadow-black/20">
            {sidebarItems.map((item, idx) => {
              const Icon = item.icon
              const isLast = idx === sidebarItems.length - 1
            return (
              <button
                key={item.key}
                type="button"
                className={`relative flex items-center gap-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors h-11 ${
                  !isLast ? 'border-b border-white/5' : ''
                } ${active === item.key ? 'bg-emerald-500/15 text-emerald-100' : ''}`}
                title={item.label}
                onClick={() => setActive(item.key)}
                aria-pressed={active === item.key}
                aria-current={active === item.key ? 'page' : undefined}
              >
                {Icon && (
                  <Icon
                    className={`w-5 h-5 shrink-0 ${active === item.key ? 'text-emerald-300' : 'text-white/80'}`}
                  />
                )}
                <span className="font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {item.label}
                </span>
              </button>
            )
            })}
          </div>
        </div>

        <div className="flex-1 bg-white/5 border border-white/10 rounded-r-xl rounded-bl-xl rounded-tl-none p-3 shadow-inner shadow-black/10 min-h-[540px]">
          {active === 'overtime' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <h4 className="flex items-center gap-2 text-emerald-200 font-semibold">
                    {ActiveSidebarIcon && <ActiveSidebarIcon className="w-4 h-4" />}
                    Apuração de Horas Extras
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <input
                      type="text"
                      value={filterText}
                      onChange={(e) => handleFilterChange(e.target.value)}
                    placeholder="Filtrar por nome ou cadastro"
                    className="w-full sm:w-56 bg-white/5 text-white text-xs border border-white/15 rounded-md px-3 py-1.5 outline-none focus:border-emerald-400"
                  />
                  <select
                    value={filterCompany}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    disabled={textFilterActive}
                    className={`bg-white/5 text-white text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400 ${textFilterActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="" className="bg-slate-800 text-white">Empresa</option>
                    {companies.map((c) => (
                      <option key={c} value={c} className="bg-slate-800 text-white">{c}</option>
                    ))}
                  </select>
                  <select
                    value={filterSector}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    disabled={textFilterActive}
                    className={`bg-white/5 text-white text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400 max-w-32 truncate ${textFilterActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="" className="bg-slate-800 text-white">Setor</option>
                    {sectors.map((s) => (
                      <option key={s} value={s} className="bg-slate-800 text-white">{s}</option>
                    ))}
                  </select>
                  <select
                    value={filterYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="bg-white/5 text-white text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
                  >
                    <option value="" className="bg-slate-800 text-white">Ano</option>
                    {years.map((y) => (
                      <option key={y} value={y} className="bg-slate-800 text-white">{y}</option>
                    ))}
                  </select>
                  <select
                    value={filterMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="bg-white/5 text-white text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400"
                  >
                    <option value="" className="bg-slate-800 text-white">Mês</option>
                    {months.map((m) => {
                      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                      return (
                        <option key={m} value={m} className="bg-slate-800 text-white">{monthNames[Number(m) - 1]}</option>
                      )
                    })}
                  </select>
                  <select
                    value={filterStartDay}
                    onChange={(e) => handleStartDayChange(e.target.value)}
                    disabled={textFilterActive}
                    className={`bg-white/5 text-white text-xs border border-white/15 rounded-md px-2 py-1.5 outline-none focus:border-emerald-400 ${textFilterActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="" className="bg-slate-800 text-white">Dia</option>
                    {days.map((d) => (
                      <option key={d} value={d} className="bg-slate-800 text-white">{d}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-2 py-1.5 rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors"
                    title="Limpar filtros"
                    aria-label="Limpar filtros"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                            <VerticalBarChart
                              title="Horas por Setor"
                              subtitle="Totais do mês"
                              data={sectorHoursChartData}
                              series={[
                                { key: 'total60', label: '60%', color: '#3b82f6' },
                                { key: 'total100', label: '100%', color: '#a855f7' },
                              ]}
                              formatValue={(val) => formatDecimalToTime(Math.round(val))}
                            />
                            <VerticalBarChart
                              title="Valores por Setor"
                              subtitle="Totais do mês"
                              data={sectorValuesChartData}
                              series={[
                                { key: 'value60', label: '60%', color: '#3b82f6' },
                                { key: 'value100', label: '100%', color: '#a855f7' },
                              ]}
                              formatValue={formatCurrency}
                            />
                            <ChartMini series={chartSeries} formatDecimalToTime={formatDecimalToTime} />
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
          )}
        </div>
      </div>
    </div>
  )
}

export default Operations
