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
  const { payrollConflictRef, payrollConflictPassword, payrollPasswordErrorType, payrollPasswordAttempts, payrollConflictDate, selectedFile, previewMeta } = state
  const sessionUser = loadSession()

  if (!payrollConflictRef) return null

  const competenceLabel = React.useMemo(() => {
    if (payrollConflictRef && payrollConflictRef !== '-') return payrollConflictRef
    if (payrollConflictDate && /^\d{4}-\d{2}-\d{2}$/.test(payrollConflictDate)) {
      const [y, m] = payrollConflictDate.split('-')
      return `${m}/${y}`
    }
    return payrollConflictDate || ''
  }, [payrollConflictDate, payrollConflictRef])

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
      const nextAttempts = payrollPasswordAttempts + 1
      dispatch({ type: 'INCREMENT_PASSWORD_ATTEMPTS' })
      dispatch({ type: 'SET_PAYROLL_PASSWORD_ERROR', payload: 'invalid' })
      if (nextAttempts >= 3) {
        dispatch({ type: 'SET_STATUS', payload: 'error' })
        dispatch({ type: 'RESET_PAYROLL_CONFLICT' })
        pushMessage('XxX Parece que voce nao tem acesso a exclusao')
      }
      return
    }

    if (payrollConflictRef && payrollConflictDate) {
      pushMessage(`Excluindo fechamento da folha pgto : ${payrollConflictRef}`)
      dispatch({ type: 'SET_STATUS', payload: 'uploading' })
      try {
        const companyDigits = previewMeta ? (previewMeta.match(/\d{1,}/) || [])[0] : undefined
        const companyNum = companyDigits ? Number(companyDigits) : null
        const deleteResult = await deletePayrollByMonth(payrollConflictDate, companyNum, supabaseUrl, supabaseKey)
        if (!deleteResult.ok) {
          const errorMessage = deleteResult.error ?? 'Erro desconhecido ao excluir dados'
          dispatch({ type: 'IMPORT_FAILURE', payload: { messages: [`XxX Erro ao excluir dados: ${errorMessage}`] } })
          dispatch({ type: 'RESET_PAYROLL_CONFLICT' })
          return
        }
        pushMessage(`OoO Total ${deleteResult.deleted} registro(s) excluido(s) da folha ref. ${competenceLabel || payrollConflictRef}`)
        const companyLabel = companyDigits ? String(companyDigits).padStart(4, '0') : ''
        const payrollTableLabel =
          companyLabel && competenceLabel
            ? `payroll ${companyLabel}-${competenceLabel}`
            : companyLabel && payrollConflictRef
              ? `payroll ${companyLabel}-${payrollConflictRef}`
              : competenceLabel
                ? `payroll Ref. ${competenceLabel}`
                : payrollConflictRef
                  ? `payroll Ref. ${payrollConflictRef}`
                  : companyLabel
                    ? `payroll ${companyLabel}`
                    : 'payroll'
        await insertHistory({
            table: payrollTableLabel,
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
