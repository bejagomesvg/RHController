export const MODULE_MAPPING: Record<string, string> = {
  'Avaliação': 'evaluation',
  'Banco de Dados': 'database',
  'Benefícios': 'benefits',
  'Carga de Tabelas': 'table_load',
  'Comunicação': 'communication',
  'Desenvolvimento': 'development',
  'Escala & Férias': 'shift_schedule_and_vacation',
  'Folha de Pagamento': 'payroll',
  'Infraestrutura': 'infrastructure',
  'Recrutamento': 'recruitment',
  'Saúde e Segurança': 'health_and_safety',
  'Segurança': 'security',
  'Treinamento': 'training',
}

/**
 * Processa os módulos autorizados e extrai dados para o banco de dados
 * @param authorizedModules String contendo módulos no formato "Módulo (PERMISSION1,PERMISSION2)"
 * @returns Objeto com colunas do banco como chave e permissões como valor
 */
export function getModulesDataForDatabase(authorizedModules: string): Record<string, string> {
  if (!authorizedModules) return {}
  
  const result: Record<string, string> = {}
  const modulesArray = authorizedModules
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  
  modulesArray.forEach((moduleEntry) => {
    // Formato: "Avaliação (CREATER,READ,UPDATE)"
    const match = moduleEntry.match(/^(.+?)\s*\((.+?)\)$/)
    if (match) {
      const [, moduleName, permissions] = match
      const dbColumnName = MODULE_MAPPING[moduleName.trim()]
      if (dbColumnName) {
        result[dbColumnName] = permissions.trim().toUpperCase()
      }
    }
  })
  
  return result
}
