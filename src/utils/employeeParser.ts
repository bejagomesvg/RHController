// Mapeamento de campos da planilha para banco de dados
export const EMPLOYEE_FIELD_MAPPING = {
  // Campos obrigatorios (conforme SQL)
  Empresa: 'company',
  Cadastro: 'registration',
  Nome: 'name',
  CPF: 'cpf',
  Nascimento: 'date_birth',
  Admissao: 'date_hiring',
  Situacao: 'status',
  'Descricao (Situacao)': 'description_status',
  'Data Afastamento': 'date_status',
  'Título Reduzido (Cargo)': 'role',
  'Descricao do Local': 'sector',
  'Descricao (Nacionalidade)': 'nationality',
  'Descricao (Instrucao)': 'education',
  Sexo: 'sex',
  'Descricao (Estado Civil)': 'marital',
  'Descricao (Raca/Etnia)': 'ethnicity',
  'Valor Salario': 'salary',
}

// Funcoes de formatacao
export const formatCPF = (cpf: any): string => {
  if (!cpf) return ''
  // Remove tudo que nao e digito
  let cleaned = String(cpf).replace(/\D/g, '')
  // Se tiver menos de 11 digitos, adiciona zeros à frente
  if (cleaned.length < 11) {
    cleaned = cleaned.padStart(11, '0')
  }
  // Formata para XXX.XXX.XXX-XX
  return cleaned.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatDate = (date: any): string => {
  if (!date) return ''

  // Se for número (Excel serial date)
  if (typeof date === 'number') {
    // Converter Excel serial date para data JS
    const excelEpoch = new Date('1899-12-30')
    const resultDate = new Date(excelEpoch.getTime() + date * 24 * 60 * 60 * 1000)
    const formatted = resultDate.toISOString().split('T')[0]
    // Verifica se e data invalida ou zero
    if (formatted === '1899-12-30' || formatted === '0000-00-00') return ''
    return formatted
  }

  // Se for string
  const dateStr = String(date).trim()

  // Verifica se e "00/00/0000" ou "00-00-0000"
  if (dateStr === '00/00/0000' || dateStr === '00-00-0000' || dateStr === '0000-00-00') {
    return ''
  }

  // Tenta formato dd/mm/aaaa ou dd/mm/yyyy
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Se ja estiver em ISO (YYYY-MM-DD)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }

  return ''
}

export const formatSalary = (salary: any): string => {
  if (!salary && salary !== 0) return ''

  let numValue: number

  // Se for string com formatacao brasileira ###.###.##0,0000
  if (typeof salary === 'string') {
    // Remove pontos de milhar e substitui vírgula por ponto
    numValue = parseFloat(String(salary).replace(/\./g, '').replace(',', '.'))
  } else {
    numValue = parseFloat(String(salary))
  }

  if (isNaN(numValue)) return ''

  // Formata para R$ com 2 casas decimais
  return `R$ ${numValue.toFixed(2).replace('.', ',')}`
}

// Normalizacao para campos inteiros
export const formatInteger = (value: any): string => {
  if (value === null || value === undefined) return ''
  const cleaned = String(value).replace(/\D/g, '')
  return cleaned
}

// Campos obrigatorios que devem estar presentes na planilha
export const REQUIRED_FIELDS = [
  'Empresa',
  'Cadastro',
  'Nome',
  'CPF',
  'Nascimento',
  'Admissao',
  'Situacao',
  'Descricao (Situacao)',
  'Data Afastamento',
  'Titulo Reduzido (Cargo)',
  'Descricao do Local',
  'Descricao (Nacionalidade)',
  'Descricao (Instrucao)',
  'Sexo',
  'Descricao (Estado Civil)',
  'Descricao (Raca/Etnia)',
  'Valor Salario',
]

export const validateEmployeeSheet = (columns: string[]): { valid: boolean; missingFields: string[] } => {
  const missingFields = REQUIRED_FIELDS.filter((field) => !columns.includes(field))
  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

export const validateEmployeeRow = (row: Record<string, any>): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Validar campos obrigatorios nao vazios
  if (!row['Empresa'] || String(row['Empresa']).trim() === '') errors.push('Empresa e obrigatoria')
  if (!row['Cadastro'] || String(row['Cadastro']).trim() === '') errors.push('Cadastro e obrigatorio')
  if (!row['Nome'] || String(row['Nome']).trim() === '') errors.push('Nome e obrigatorio')
/*   if (!row['CPF'] || String(row['CPF']).trim() === '') errors.push('Cpf e obrigatorio')    */ 
  if (!row['Nascimento'] || String(row['Nascimento']).trim() === '') errors.push('Nascimento e obrigatorio')
  if (!row['Admissao'] || String(row['Admissao']).trim() === '') errors.push('Admissao e obrigatoria')
  if (!row['Situacao'] || String(row['Situacao']).trim() === '') errors.push('Situacao e obrigatoria')
  if (!row['Titulo Reduzido (Cargo)'] || String(row['Titulo Reduzido (Cargo)']).trim() === '')
    errors.push('Cargo e obrigatorio')
  if (!row['Descricao do Local'] || String(row['Descricao do Local']).trim() === '') errors.push('Setor e obrigatorio')
  if (!row['Valor Salario'] && row['Valor Salario'] !== 0) errors.push('Salario e obrigatorio')

  // Validar CPF quando informado (nao e obrigatorio)
  if (row['CPF']) {
    const cpfDigits = String(row['CPF']).replace(/\D/g, '')
    if (cpfDigits.length !== 11) {
      errors.push('CPF invalido: deve ter 11 digitos')
    }
  }

  // Validar campos numericos (Empresa, Situacao)
  if (row['Empresa']) {
    const empresa = formatInteger(row['Empresa'])
    if (!empresa || isNaN(Number(empresa))) {
      errors.push('Empresa deve ser numerica (inteiro)')
    }
  }
  if (row['Situacao']) {
    const situacao = formatInteger(row['Situacao'])
    if (!situacao || isNaN(Number(situacao))) {
      errors.push('Situacao deve ser numerica (inteiro)')
    }
  }

  // Validar e formatar datas
  const dateFields = ['Nascimento', 'Admissao', 'Data Afastamento']
  dateFields.forEach((field) => {
    if (row[field]) {
      const formattedDate = formatDate(row[field])
      // Data Afastamento e opcional, pode estar vazia (00/00/0000)
      if (field !== 'Data Afastamento' && !formattedDate) {
        errors.push(`${field} em formato invalido. Use dd/mm/aaaa ou YYYY-MM-DD`)
      } else if (field !== 'Data Afastamento' && formattedDate) {
        // Validar se e uma data valida (apenas para datas obrigatorias)
        if (isNaN(new Date(formattedDate).getTime())) {
          errors.push(`${field} e uma data invalida`)
        }
      }
    }
  })

  // Validar Salario (deve ser numerico)
  if (row['Valor Salario']) {
    const formatted = formatSalary(row['Valor Salario'])
    if (!formatted) {
      errors.push('Valor Salario deve ser numerico')
    }
  }

  // Validar Sexo (M, F, Masculino, Feminino, etc.)
  if (row['Sexo']) {
    const sexo = String(row['Sexo']).toUpperCase()
    if (!['M', 'F', 'MASCULINO', 'FEMININO'].includes(sexo)) {
      errors.push('Sexo deve ser M/F ou Masculino/Feminino')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export const formatRowData = (row: Record<string, any>): Record<string, any> => {
  return {
    ...row,
    Empresa: formatInteger(row['Empresa']),
    CPF: formatCPF(row['CPF']),
    Nascimento: formatDate(row['Nascimento']),
    Admissao: formatDate(row['Admissao']),
    'Data Afastamento': formatDate(row['Data Afastamento']),
    Situacao: formatInteger(row['Situacao']),
    'Valor Salario': formatSalary(row['Valor Salario']),
  }
}
