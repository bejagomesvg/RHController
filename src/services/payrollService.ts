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
