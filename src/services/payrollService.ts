import { formatDate } from '../utils/employeeParser'

export interface PayrollPayload {
  registration: number | null
  name: string | null
  events_payroll: number | null
  references_payroll: number | null
  date_payroll: string | null
  type_registration: string
  user_registration: string | null
  date_registration: string
}

export interface PayrollResult {
  ok: boolean
  inserted: number
  error?: string
}

export interface PayrollMonthCheck {
  ok: boolean
  exists: boolean
  error?: string
}

export interface PayrollDeleteResult {
  ok: boolean
  deleted: number
  error?: string
}

const parseNumber = (val: any): number | null => {
  const num = Number(String(val ?? '').replace(/\D/g, ''))
  return Number.isNaN(num) ? null : num
}

const parseDecimal = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null
  const num = Number(String(val).replace(/[^\d,-]/g, '').replace(',', '.'))
  return Number.isNaN(num) ? null : num
}

const parseDateIso = (val: any): string | null => {
  const formatted = formatDate(val)
  return formatted || null
}

export const insertPayroll = async (
  data: Record<string, any>[],
  userName: string | undefined,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<PayrollResult> => {
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, inserted: 0, error: 'Missing Supabase credentials' }
  }
  try {
  const payload: PayrollPayload[] = data.map((row) => ({
    registration: parseNumber(row['cadastro']),
    name: row['Colaborador'] ? String(row['Colaborador']).trim() : null,
    events_payroll: parseNumber(row['Evento']),
    references_payroll: parseDecimal(row['Referencia']),
    date_payroll: parseDateIso(row['Pagamento']),
      type_registration: 'Importado',
      user_registration: userName || null,
      date_registration: new Date().toISOString(),
    }))

    const insertUrl = new URL(`${supabaseUrl}/rest/v1/payroll`)
    const resInsert = await fetch(insertUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    })
    if (!resInsert.ok) {
      const errTxt = await resInsert.text()
      console.error('Erro ao inserir payroll', errTxt)
      return { ok: false, inserted: 0, error: errTxt }
    }

    return { ok: true, inserted: payload.length }
  } catch (error) {
    console.error('Erro ao salvar payroll', error)
    return { ok: false, inserted: 0, error: (error as Error).message }
  }
}

export const checkPayrollMonthExists = async (
  paymentDate: any,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<PayrollMonthCheck> => {
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, exists: false, error: 'Missing Supabase credentials' }
  }

  const iso = formatDate(paymentDate)
  if (!iso) {
    return { ok: false, exists: false, error: 'Data de pagamento invalida' }
  }

  const start = new Date(iso)
  if (Number.isNaN(start.getTime())) {
    return { ok: false, exists: false, error: 'Data de pagamento invalida' }
  }
  const monthStart = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1, 0, 0, 0))
  const nextMonth = new Date(Date.UTC(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0))

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/payroll`)
    url.searchParams.set('select', 'date_payroll')
    url.searchParams.append('date_payroll', `gte.${monthStart.toISOString()}`)
    url.searchParams.append('date_payroll', `lt.${nextMonth.toISOString()}`)
    url.searchParams.set('limit', '1')

    const res = await fetch(url.toString(), {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (!res.ok) {
      return { ok: false, exists: false, error: await res.text() }
    }
    const rows = (await res.json()) as Array<{ date_payroll: string }>
    return { ok: true, exists: rows.length > 0 }
  } catch (error) {
    return { ok: false, exists: false, error: (error as Error).message }
  }
}

export const deletePayrollByMonth = async (
  paymentDate: any,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<PayrollDeleteResult> => {
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, deleted: 0, error: 'Missing Supabase credentials' }
  }

  const iso = formatDate(paymentDate)
  if (!iso) return { ok: false, deleted: 0, error: 'Data de pagamento invalida' }

  const base = new Date(iso)
  if (Number.isNaN(base.getTime())) return { ok: false, deleted: 0, error: 'Data de pagamento invalida' }

  const monthStart = new Date(Date.UTC(base.getFullYear(), base.getMonth(), 1, 0, 0, 0))
  const nextMonth = new Date(Date.UTC(base.getFullYear(), base.getMonth() + 1, 1, 0, 0, 0))

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/payroll`)
    url.searchParams.append('date_payroll', `gte.${monthStart.toISOString()}`)
    url.searchParams.append('date_payroll', `lt.${nextMonth.toISOString()}`)

    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (!res.ok) {
      return { ok: false, deleted: 0, error: await res.text() }
    }
    const deletedHeader = res.headers.get('content-range')
    const deleted = deletedHeader ? Number(deletedHeader.split('/')[1] || 0) : 0
    return { ok: true, deleted: Number.isNaN(deleted) ? 0 : deleted }
  } catch (error) {
    return { ok: false, deleted: 0, error: (error as Error).message }
  }
}
