import React from 'react'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import type { Action, State } from '../views/Table_load'
import { loadSession } from '../services/sessionService'
import { verifyPassword } from '../services/authService'
import { deletePayrollByMonth } from '../services/payrollService'
import { insertHistory } from '../services/logService'

interface PayrollConflictModalProps {
  state: State
  dispatch: React.Dispatch<Action>
  pushMessage: (message: string) => void
  onHistoryUpdate: () => Promise<void>
  userName: string
  supabaseUrl: string
  supabaseKey: string
}

const PayrollConflictModal: React.FC<PayrollConflictModalProps> = ({
  state,
  dispatch,
  pushMessage,
  onHistoryUpdate,
  userName,
  supabaseUrl,
  supabaseKey,
}) => {
  const { payrollConflictRef, payrollConflictPassword, payrollPasswordErrorType, payrollPasswordAttempts, payrollConflictDate, selectedFile } = state
  const sessionUser = loadSession()

  if (!payrollConflictRef) return null

  const handleDelete = async () => {
    const pwd = payrollConflictPassword.trim()
    if (!pwd) {
      dispatch({ type: 'SET_PAYROLL_PASSWORD_ERROR', payload: 'required' })
      return
    }
    if (!sessionUser) {
      pushMessage('XxX Sessao invalida. Faça login novamente.')
      return
    }
    const passwordResult = await verifyPassword(pwd, sessionUser.password)
    if (!passwordResult) {
      dispatch({ type: 'INCREMENT_PASSWORD_ATTEMPTS' });
      dispatch({ type: 'SET_PAYROLL_PASSWORD_ERROR', payload: 'invalid' });
      if (payrollPasswordAttempts + 1 >= 3) {
        pushMessage('XxX Parece que voce nao tem acesso a exclusao');
        dispatch({ type: 'SET_STATUS', payload: 'error' });
        dispatch({ type: 'RESET_PAYROLL_CONFLICT' })
      }
      return
    }

    if (payrollConflictRef && payrollConflictDate) {
      pushMessage(`Excluindo fechamento da folha pgto : ${payrollConflictRef}`)
      dispatch({ type: 'SET_STATUS', payload: 'uploading' })
      try {
        const deleteResult = await deletePayrollByMonth(payrollConflictDate, supabaseUrl, supabaseKey)
        if (!deleteResult.ok) {
          const errorMessage = deleteResult.error ?? 'Erro desconhecido ao excluir dados'
          dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [`XxX Erro ao excluir dados: ${errorMessage}`] } })
          dispatch({ type: 'RESET_PAYROLL_CONFLICT' })
          return
        }
        pushMessage(`OoO Total ${deleteResult.deleted} registro(s) excluido(s) da folha ref. ${payrollConflictRef}`)
        await insertHistory({
            table: payrollConflictRef ? `payroll Ref. ${payrollConflictRef}` : 'payroll',
            actions: 'Delete',
            file: selectedFile?.name || '-',
            user: userName || '-',
            type: 'Importado',
          }, supabaseUrl, supabaseKey)
        await onHistoryUpdate()
        dispatch({ type: 'PAYROLL_DELETE_SUCCESS' })
        pushMessage('OoO Exclusão concluida. Voce já pode importar a nova Folha Pgto.')
      } catch (error) {
        dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [`XxX Erro ao excluir: ${(error as Error).message}`] } })
      }
    }
  }

  return (
    <ConfirmDeleteModal
      open={Boolean(payrollConflictRef)}
      title="Excluir Fechamento!"
      description={
        <p>
          Essa Folha de Pgto {payrollConflictRef} ja foi fechada, porem voce pode exclui-la e inserir novos dados. Isso
          ira excluir todos os dados definidivamente.
        </p>
      }
      passwordValue={payrollConflictPassword}
      passwordError={payrollPasswordErrorType}
      attempts={payrollPasswordAttempts}
      onPasswordChange={(value) => dispatch({ type: 'UPDATE_PAYROLL_PASSWORD', payload: value })}
      onCancel={() => {
        dispatch({ type: 'RESET_PAYROLL_CONFLICT' })
        pushMessage('XxX Voce cancelo a operacao')
        dispatch({ type: 'SET_STATUS', payload: 'error' })
      }}
      onConfirm={handleDelete}
    />
  )
}

export default PayrollConflictModal
