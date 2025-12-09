import React from 'react'
import { AlertTriangle, TriangleAlert } from 'lucide-react'
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-xl bg-[#0d1425] border border-white/10 rounded-2xl shadow-[0_25px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/05 via-rose-500/8 to-transparent pointer-events-none" />
        <div className="relative p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-400/60 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-semibold">Excluir Horas Extras!</h3>
              <p className="text-white/80 text-sm mt-2 leading-relaxed">
                Horas extras da data {overtimeConflictRef} já existem. Você pode excluí-las e inserir novos dados.
                Isso irá excluir todos os dados dessa data definitivamente.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-4 flex-wrap justify-between">
            <div className="w-full max-w-[220px]">
              <label className="text-white/70 text-xs mb-1 block">
                Senha de confirmacao <span className="text-rose-400">{Math.min(overtimePasswordAttempts, 3)}/3</span>
              </label>
              <input
                type="password"
                value={overtimePassword}
                onChange={(e) => dispatch({ type: 'UPDATE_OVERTIME_PASSWORD', payload: e.target.value })}
                className={`w-full bg-white/5 text-white text-sm border rounded-lg px-3 py-2.5 outline-none focus:border-emerald-400 ${overtimePasswordError ? 'border-rose-400' : 'border-white/10'}`}
                placeholder="Digite sua senha"
              />
              {overtimePasswordError === 'required' && (
                <div className="flex items-center gap-1 text-amber-300 text-xs mt-1">
                  <TriangleAlert className="w-4 h-4" />
                  <span>Obrigatorio!!!</span>
                </div>
              )}
              {overtimePasswordError === 'invalid' && (
                <div className="flex items-center gap-1 text-rose-300 text-xs mt-1">
                  <TriangleAlert className="w-4 h-4" />
                  <span>Senha Incorreta - {Math.max(overtimePasswordAttempts, 1)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                className="px-5 py-2.5 h-[44px] rounded-lg bg-white/5 border border-white/15 text-white hover:bg-white/10 transition-colors"
                onClick={() => {
                  dispatch({ type: 'RESET_OVERTIME_CONFLICT' })
                  pushMessage('XxX Voce cancelou a operacao')
                  dispatch({ type: 'SET_STATUS', payload: 'error' })
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-5 py-2.5 h-[44px] rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
                onClick={handleDelete}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OvertimeConflictModal
