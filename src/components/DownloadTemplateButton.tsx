import React from 'react'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'
import type { SheetType } from '../views/Table_load'

interface DownloadTemplateButtonProps {
  sheetType: SheetType
  cadastroHeaders: string[]
  folhaHeaders: string[]
  overtimeHeaders: string[]
  showLabel?: boolean
}

const DownloadTemplateButton: React.FC<DownloadTemplateButtonProps> = ({
  sheetType,
  cadastroHeaders,
  folhaHeaders,
  overtimeHeaders,
  showLabel = true,
}) => {
  const handleDownload = () => {
    if (!sheetType) return

    let headers: string[] = []
    let fileName = ''

    if (sheetType === 'CADASTRO') {
      headers = cadastroHeaders
      fileName = 'modelo_cadastro.xlsx'
    } else if (sheetType === 'FOLHA PGTO') {
      headers = folhaHeaders
      fileName = 'modelo_folha_pgto.xlsx'
    } else if (sheetType === 'HORAS EXTRAS') {
      headers = overtimeHeaders
      fileName = 'modelo_horas_extras.xlsx'
    } else {
      return // No template for this type
    }

    // Create an empty object with headers as keys
    const templateData = [headers.reduce((acc, header) => ({ ...acc, [header]: '' }), {})]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo')

    XLSX.writeFile(workbook, fileName)
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="px-2 py-2 rounded-md bg-transparent border border-blue-500/60 text-blue-300 font-semibold hover:bg-blue-500/20 hover:border-blue-400/80 transition-all flex items-center gap-2 whitespace-nowrap"
      title="Baixar planilha modelo"
    >
      <Download className="w-5 h-5" />
      {showLabel && <span className="text-sm">Modelo</span>}
    </button>
  )
}

export default DownloadTemplateButton
