import React from 'react'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import type { Action, State } from '../views/Table_load'
import { loadSession } from '../services/sessionService'
import { verifyPassword } from '../services/authService'
import { deleteOvertimeByDate } from '../services/overtimeService'
import { insertHistory } from '../services/logService'

interface OvertimeConflictModalProps {
  state: State
  dispatch: React.Dispatch<Action>
  pushMessage: (message: string) => void
  onHistoryUpdate: () => Promise<void>
  userName: string
  supabaseUrl: string
  supabaseKey: string
}

const OvertimeConflictModal: React.FC<OvertimeConflictModalProps> = ({
  state,
  dispatch,
  pushMessage,
  onHistoryUpdate,
  userName,
  supabaseUrl,
  supabaseKey,
}) => {
  const {
    overtimeConflictRef,
    overtimeConflictDate,
    overtimePassword,
    overtimePasswordError,
    overtimePasswordAttempts,
    selectedFile,
    previewMeta,
  } = state
  const sessionUser = loadSession()

  if (!overtimeConflictRef) return null

  const formatDateDisplay = (val?: string | null) => {
    if (!val) return '-'
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) return val.trim()
    const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      const [, y, m, d] = isoMatch
      return `${d}/${m}/${y}`
    }
    return val
  }
  const companyDigits = previewMeta ? (previewMeta.match(/\d{1,}/) || [])[0] : undefined
  const companyLabel = companyDigits ? String(Number(companyDigits)).padStart(4, '0') : '-'
  const dateLabel = formatDateDisplay(overtimeConflictRef || overtimeConflictDate)

  const handleDelete = async () => {
    const pwd = overtimePassword.trim()
    if (!pwd) {
      dispatch({ type: 'SET_OVERTIME_PASSWORD_ERROR', payload: 'required' })
      return
    }
    if (!sessionUser) {
      pushMessage('XxX Sessao invalida. Faça login novamente.')
      return
    }
    const passwordResult = await verifyPassword(pwd, sessionUser.password)
    if (!passwordResult) {
      dispatch({ type: 'INCREMENT_OVERTIME_PASSWORD_ATTEMPTS' })
      dispatch({ type: 'SET_OVERTIME_PASSWORD_ERROR', payload: 'invalid' })
      if (overtimePasswordAttempts + 1 >= 3) {
        pushMessage('XxX Parece que voce nao tem acesso a exclusao')
        dispatch({ type: 'SET_STATUS', payload: 'error' })
        dispatch({ type: 'RESET_OVERTIME_CONFLICT' })
      }
      return
    }

    if (overtimeConflictRef && overtimeConflictDate) {
      const dateDisplay = formatDateDisplay(overtimeConflictRef || overtimeConflictDate)
      pushMessage(`Excluindo horas extras da data: ${dateDisplay}`)
      dispatch({ type: 'SET_STATUS', payload: 'uploading' })
      try {
        const companyNum = companyDigits ? Number(companyDigits) : null
        const deleteResult = await deleteOvertimeByDate(overtimeConflictDate, companyNum, supabaseUrl, supabaseKey)
        if (!deleteResult.ok) {
          const errorMessage = deleteResult.error ?? 'Erro desconhecido ao excluir dados'
          dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [`XxX Erro ao excluir dados: ${errorMessage}`] } })
          dispatch({ type: 'RESET_OVERTIME_CONFLICT' })
          return
        }
        const companyLabelLog = companyDigits ? String(Number(companyDigits)).padStart(4, '0') : ''
        const tableLabel =
          companyLabelLog && dateDisplay
            ? `overtime ${companyLabelLog}-${dateDisplay}`
            : companyLabelLog && overtimeConflictRef
              ? `overtime ${companyLabelLog}-${overtimeConflictRef}`
              : companyLabelLog
                ? `overtime ${companyLabelLog}`
                : dateDisplay
                  ? `overtime Ref. ${dateDisplay}`
                  : overtimeConflictRef
                    ? `overtime Ref. ${overtimeConflictRef}`
                    : 'overtime'
        pushMessage(`OoO Total ${deleteResult.deleted} registro(s) excluido(s) do dia ${dateDisplay}`)
        await insertHistory(
          {
            table: tableLabel,
            actions: 'Delete',
            file: selectedFile?.name || '-',
            user: userName || '-',
            type: 'Importado',
          },
          supabaseUrl,
          supabaseKey
        )
        await onHistoryUpdate()
        dispatch({ type: 'OVERTIME_DELETE_SUCCESS' })
        pushMessage('OoO Exclusao concluida. Voce ja pode importar as novas horas extras.')
      } catch (error) {
        dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [`XxX Erro ao excluir: ${(error as Error).message}`] } })
      }
    }
  }

  return (
    <ConfirmDeleteModal
      open={Boolean(overtimeConflictRef)}
      title="Excluir Horas Extras!"
      description={
        <div className="space-y-2 text-sm leading-relaxed text-white/90">
          <p>
            Foi identificado que já existem horas extras registradas para <strong className='text-amber-200'>Emp: {companyLabel}</strong> na{' '}
            <strong className='text-amber-200'>Data: {dateLabel}</strong>.
          </p>
          <p>Para inserir novos dados, será necessário excluir os registros existentes.</p>
          <p className="text-amber-200 flex items-start gap-1">
              <strong>Atenção:</strong> esta operação irá excluir definitivamente todos os dados referentes à empresa e à data informada.
          </p>
        </div>
      }
      passwordValue={overtimePassword}
      passwordError={overtimePasswordError}
      attempts={overtimePasswordAttempts}
      onPasswordChange={(value) => dispatch({ type: 'UPDATE_OVERTIME_PASSWORD', payload: value })}
      onCancel={() => {
        dispatch({ type: 'RESET_OVERTIME_CONFLICT' })
        pushMessage('XxX Voce cancelou a operacao')
        dispatch({ type: 'SET_STATUS', payload: 'error' })
      }}
      onConfirm={handleDelete}
    />
  )
}

export default OvertimeConflictModal
