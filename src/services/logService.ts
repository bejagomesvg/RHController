export interface HistoryEntry {
  id?: number
  date: string
  banco: string
  arquivo: string
  usuario: string
}

export const fetchHistory = async (
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<HistoryEntry[]> => {
  if (!supabaseUrl || !supabaseKey) return []
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/log_table_load`)
    url.searchParams.set('select', 'id,registration,date_registration,file_,user_registration')
    url.searchParams.set('order', 'date_registration.desc')
    const res = await fetch(url.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
    })
    if (!res.ok) {
      console.error('Erro ao buscar historico', await res.text())
      return []
    }
    const data = (await res.json()) as Array<{
      id: number
      registration: string
      date_registration: string
      file_: string
      user_registration: string
    }>
    return data.map((item) => ({
      id: item.id,
      banco: item.registration,
      date: item.date_registration,
      arquivo: item.file_,
      usuario: item.user_registration,
    }))
  } catch (error) {
    console.error('Erro ao buscar historico', error)
    return []
  }
}

export const insertHistory = async (
  entry: { registration: string; date: string; file: string; user: string },
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<boolean> => {
  if (!supabaseUrl || !supabaseKey) {
    return false
  }
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/log_table_load`)
    const payload = {
      registration: entry.registration,
      // Usa timestamp atual do servidor/cliente em ISO para preservar data e hora completas
      date_registration: new Date().toISOString(),
      file_: entry.file,
      user_registration: entry.user,
    }
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errTxt = await res.text()
      console.error('Erro ao gravar historico', errTxt)
      return false
    }
    return true
  } catch (error) {
    console.error('Erro ao gravar historico', error)
    return false
  }
}
