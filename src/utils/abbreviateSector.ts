export const abbreviateSector = (sector: string | null | undefined): string => {
  if (!sector) return 'Sem setor'
  let abbreviated = sector.toUpperCase()
  abbreviated = abbreviated.replace('ADMINISTRATIVO', 'ADM.')
  abbreviated = abbreviated.replace('ADMINISTRAÇÃO', 'ADM.')
  abbreviated = abbreviated.replace('HIGIENIZAÇÃO', 'HIG.')
  abbreviated = abbreviated.replace('INDUSTRIAL', 'IND.')
  abbreviated = abbreviated.replace('SECUNDÁRIA', 'SEC.')
  abbreviated = abbreviated.replace('ALMOXARIFADO', 'ALMOX.')
  abbreviated = abbreviated.replace('EMBARQUE', 'EMB.')
  abbreviated = abbreviated.replace('BUCHARIA', 'BUCH.')
  abbreviated = abbreviated.replace('TÉCNICO', 'TÉC.')
  abbreviated = abbreviated.replace('INFORMÁTICA', 'INFOR.')
  abbreviated = abbreviated.replace('CONTROLE DE', 'C.')
  abbreviated = abbreviated.replace('SERVIÇOS', 'SERV.')
  abbreviated = abbreviated.replace('GERAIS', 'G.')
  abbreviated = abbreviated.replace('DEP.PESSOAL', 'D. P.')
  abbreviated = abbreviated.replace('PANTANEIRA', '')
  abbreviated = abbreviated.replace('SALA DE', 'S.')
  return abbreviated
}
