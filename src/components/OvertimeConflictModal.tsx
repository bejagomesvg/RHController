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
  const { overtimeConflictRef, overtimeConflictDate, overtimePassword, overtimePasswordError, overtimePasswordAttempts, selectedFile } = state
  const sessionUser = loadSession()

  if (!overtimeConflictRef) return null

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
      pushMessage(`Excluindo horas extras da data: ${overtimeConflictRef}`)
      dispatch({ type: 'SET_STATUS', payload: 'uploading' })
      try {
        const deleteResult = await deleteOvertimeByDate(overtimeConflictDate, supabaseUrl, supabaseKey)
        if (!deleteResult.ok) {
          const errorMessage = deleteResult.error ?? 'Erro desconhecido ao excluir dados'
          dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [`XxX Erro ao excluir dados: ${errorMessage}`] } })
          dispatch({ type: 'RESET_OVERTIME_CONFLICT' })
          return
        }
        pushMessage(`OoO Total ${deleteResult.deleted} registro(s) excluido(s) do dia ${overtimeConflictRef}`)
        await insertHistory(
          {
            table: overtimeConflictRef ? `overtime Ref. ${overtimeConflictRef}` : 'overtime',
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
        <p>
          Horas extras da data {overtimeConflictRef} ja existem. Voce pode exclui-las e inserir novos dados. Isso ira
          excluir todos os dados dessa data definitivamente.
        </p>
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
