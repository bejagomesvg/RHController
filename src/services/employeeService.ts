import { formatCPF, formatDate } from '../utils/employeeParser'

export interface EmployeePayload {
  company: number | null
  registration: number | null
  name: string
  cpf: string
  date_birth: string | null
  date_hiring: string | null
  status: number | null
  date_status: string | null
  role: string | null
  sector: string | null
  nationality: string | null
  education: string | null
  sex: string | null
  marital: string | null
  ethnicity: string | null
  salary: number | null
  type_registration: string
  user_registration: string | null
  date_registration: string
}

export interface EmployeeResult {
  ok: boolean
  newCount: number
  updatedCount: number
}

export interface EmployeeRegistryList {
  ok: boolean
  registrations: Set<number>
}

const parseNumber = (val: any): number | null => {
  const num = Number(String(val ?? '').replace(/\D/g, ''))
  return Number.isNaN(num) ? null : num
}

const parseDateIso = (val: any): string | null => {
  const formatted = formatDate(val)
  return formatted || null
}

const parseSalary = (val: any): number | null => {
  if (!val && val !== 0) return null
  const parsed = Number(String(val).replace(/[^\d,-]/g, '').replace(',', '.'))
  return Number.isNaN(parsed) ? null : parsed
}

export const mapRowToEmployee = (row: Record<string, any>, userName?: string | null): EmployeePayload => {
  return {
    company: parseNumber(row['Empresa']),
    registration: parseNumber(row['Cadastro']),
    name: String(row['Nome'] || '').trim(),
    cpf: formatCPF(row['CPF']),
    date_birth: parseDateIso(row['Nascimento']),
    date_hiring: parseDateIso(row['Admissao']),
    status: parseNumber(row['Situacao']),
    date_status: parseDateIso(row['Data Afastamento']),
    role: row['Titulo Reduzido (Cargo)'] ? String(row['Titulo Reduzido (Cargo)']).trim() : null,
    sector: row['Descricao do Local'] ? String(row['Descricao do Local']).trim() : null,
    nationality: row['Descricao (Nacionalidade)'] ? String(row['Descricao (Nacionalidade)']).trim() : null,
    education: row['Descricao (Instrucao)'] ? String(row['Descricao (Instrucao)']).trim() : null,
    sex: row['Sexo'] ? String(row['Sexo']).trim() : null,
    marital: row['Descricao (Estado Civil)'] ? String(row['Descricao (Estado Civil)']).trim() : null,
    ethnicity: row['Descricao (Raça/Etnia)'] ? String(row['Descricao (Raca/Etnia)']).trim() : null,
    salary: parseSalary(row['Valor Salario']),
    type_registration: 'Importado',
    user_registration: userName || null,
    date_registration: new Date().toISOString(),
  }
}

export const insertEmployees = async (
  data: Record<string, any>[],
  userName: string | undefined,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<EmployeeResult> => {
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, newCount: 0, updatedCount: 0 }
  }

  try {
    const payload: EmployeePayload[] = data.map((row) => mapRowToEmployee(row, userName))
    const existingUrl = new URL(`${supabaseUrl}/rest/v1/employee`)
    existingUrl.searchParams.set('select', 'registration')
    const existingRes = await fetch(existingUrl.toString(), {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (!existingRes.ok) {
      console.error('Erro ao buscar registros existentes', await existingRes.text())
      return { ok: false, newCount: 0, updatedCount: 0 }
    }

    const existingData = (await existingRes.json()) as Array<{ registration: number }>
    const existingSet = new Set(existingData.map((r) => r.registration))

    const filtered = payload.filter((p) => p.registration !== null)
    const toUpdate = filtered.filter((p) => p.registration !== null && existingSet.has(p.registration))
    const toInsert = filtered.filter((p) => p.registration !== null && !existingSet.has(p.registration))

    if (filtered.length === 0) {
      console.error('Nenhuma linha com registro valido para employee')
      return { ok: false, newCount: 0, updatedCount: 0 }
    }

    for (const entry of toUpdate) {
      const updateUrl = new URL(`${supabaseUrl}/rest/v1/employee`)
      updateUrl.searchParams.set('registration', `eq.${entry.registration}`)
      const res = await fetch(updateUrl.toString(), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(entry),
      })
      if (!res.ok) {
        const errTxt = await res.text()
        console.error('Erro ao atualizar employee', errTxt)
        return { ok: false, newCount: 0, updatedCount: 0 }
      }
    }

    if (toInsert.length > 0) {
      const insertUrl = new URL(`${supabaseUrl}/rest/v1/employee`)
      const resInsert = await fetch(insertUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(toInsert),
      })
      if (!resInsert.ok) {
        const errTxt = await resInsert.text()
        console.error('Erro ao inserir employee', errTxt)
        return { ok: false, newCount: 0, updatedCount: 0 }
      }
    }

    return { ok: true, newCount: toInsert.length, updatedCount: toUpdate.length }
  } catch (error) {
    console.error('Erro ao salvar employee', error)
    return { ok: false, newCount: 0, updatedCount: 0 }
  }
}

export const fetchEmployeeRegistrations = async (
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<EmployeeRegistryList> => {
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, registrations: new Set() }
  }
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/employee`)
    url.searchParams.set('select', 'registration')
    const res = await fetch(url.toString(), {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (!res.ok) {
      console.error('Erro ao buscar registros existentes', await res.text())
      return { ok: false, registrations: new Set() }
    }
    const rows = (await res.json()) as Array<{ registration: number }>
    return { ok: true, registrations: new Set(rows.map((r) => r.registration)) }
  } catch (err) {
    console.error('Erro ao buscar registros existentes', err)
    return { ok: false, registrations: new Set() }
  }
}
