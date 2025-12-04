type ModuleConfig = { label: string; column: string }

const MODULES: ModuleConfig[] = [
  { label: 'AVALIACAO', column: 'evaluation' },
  { label: 'BANCO DE DADOS', column: 'database' },
  { label: 'BENEFICIOS', column: 'benefits' },
  { label: 'CARGA DE TABELAS', column: 'table_load' },
  { label: 'COMUNICACAO', column: 'communication' },
  { label: 'DESENVOLVIMENTO', column: 'development' },
  { label: 'ESCALA & FERIAS', column: 'shift_schedule_and_vacation' },
  { label: 'FOLHA DE PAGAMENTO', column: 'payroll' },
  { label: 'INFRAESTRUTURA', column: 'infrastructure' },
  { label: 'RECRUTAMENTO', column: 'recruitment' },
  { label: 'SAUDE E SEGURANCA', column: 'health_and_safety' },
  { label: 'SEGURANCA', column: 'security' },
  { label: 'TREINAMENTO', column: 'training' },
]

export const MODULE_LABELS = MODULES.map((m) => m.label)

export const MODULE_MAPPING: Record<string, string> = MODULES.reduce((acc, { label, column }) => {
  acc[label] = column
  return acc
}, {} as Record<string, string>)

const NORMALIZED_MAPPING: Record<string, string> = MODULES.reduce((acc, { label, column }) => {
  acc[normalizeModuleName(label)] = column
  return acc
}, {} as Record<string, string>)

const COLUMN_NAMES = new Set(MODULES.map((m) => m.column))
const COLUMN_LIST = MODULES.map((m) => m.column)

function normalizeModuleName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9& ]/g, '')
    .trim()
}

function findColumnForModuleName(name: string): string | undefined {
  const normalized = normalizeModuleName(name)
  if (NORMALIZED_MAPPING[normalized]) return NORMALIZED_MAPPING[normalized]
  const directColumn = Array.from(COLUMN_NAMES).find((c) => c.toLowerCase() === name.trim().toLowerCase())
  return directColumn
}

/**
 * Processa os modulos autorizados e extrai dados para o banco de dados
 * @param authorizedModules String contendo modulos no formato "Modulo (PERMISSION1,PERMISSION2)"
 * @returns Objeto com colunas do banco como chave e permissoes como valor
 */
export function getModulesDataForDatabase(authorizedModules: string): Record<string, string> {
  if (!authorizedModules) return {}
  
  const result: Record<string, string> = {}
  const modulesArray = authorizedModules
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  
  modulesArray.forEach((moduleEntry) => {
    // Formato: "Avaliacao (CREATER,READ,UPDATE)"
    const match = moduleEntry.match(/^(.+?)\s*\((.+?)\)$/)
    if (match) {
      const [, moduleName, permissions] = match
      const dbColumnName = findColumnForModuleName(moduleName)
      if (dbColumnName) {
        result[dbColumnName] = permissions.trim().toUpperCase()
      }
    }
  })
  
  return result
}

/**
 * Retorna payload completo, preenchendo null para modulos removidos
 */
export function getFullModulesPayload(authorizedModules: string): Record<string, string | null> {
  const parsed = getModulesDataForDatabase(authorizedModules)
  const payload: Record<string, string | null> = {}
  COLUMN_LIST.forEach((column) => {
    payload[column] = parsed[column] ?? null
  })
  return payload
}
