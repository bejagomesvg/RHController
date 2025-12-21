import React from 'react'
import { AlertTriangle, TriangleAlert } from 'lucide-react'

interface ConfirmAdicionarModalProps {
  open: boolean
  title: string
  description: React.ReactNode
  passwordLabel?: string
  passwordValue: string
  passwordError: 'required' | 'invalid' | null
  attempts: number
  maxAttempts?: number
  onPasswordChange: (value: string) => void
  confirmLabel?: string
  cancelLabel?: string
  onCancel: () => void
  onConfirm: () => void
}

const ConfirmAdicionarModal: React.FC<ConfirmAdicionarModalProps> = ({
  open,
  title,
  description,
  passwordLabel = 'Senha de confirmacao',
  passwordValue,
  passwordError,
  attempts,
  maxAttempts = 3,
  onPasswordChange,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onCancel,
  onConfirm,
}) => {
  if (!open) return null

  return (
    <div className="absolute inset-x-0 bottom-0 -top-[15px] z-40 flex items-center justify-center bg-black/70 px-4 rounded-2xl overflow-hidden">
      <div className="relative w-full max-w-xl bg-[#0d1425] border border-amber-400/40 rounded-2xl shadow-[0_25px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-white/5 to-transparent pointer-events-none" />
        <div className="relative p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-400/70 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-8 h-8 text-amber-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-semibold">{title}</h3>
              <div className="text-white/80 text-sm mt-2 leading-relaxed">{description}</div>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-4 flex-wrap justify-between">
            <div className="w-full max-w-[220px]">
              <label className="text-white/70 text-xs mb-1 block">
                {passwordLabel} <span className="text-amber-300">{Math.min(attempts, maxAttempts)}/{maxAttempts}</span>
              </label>
              <input
                type="password"
                value={passwordValue}
                onChange={(e) => onPasswordChange(e.target.value)}
                className={`w-full bg-white/5 text-white text-sm border rounded-lg px-3 py-2.5 outline-none focus:border-amber-300 ${
                  passwordError ? 'border-amber-400' : 'border-white/10'
                }`}
                placeholder="Digite sua senha"
              />
              {passwordError === 'required' && (
                <div className="flex items-center gap-1 text-amber-300 text-xs mt-1">
                  <TriangleAlert className="w-4 h-4" />
                  <span>Obrigatorio!!!</span>
                </div>
              )}
              {passwordError === 'invalid' && (
                <div className="flex items-center gap-1 text-amber-300 text-xs mt-1">
                  <TriangleAlert className="w-4 h-4" />
                  <span>Senha Incorreta - {Math.max(attempts, 1)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                className="px-5 py-2.5 h-[44px] rounded-lg bg-white/5 border border-white/15 text-white hover:bg-white/10 transition-colors"
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className="px-5 py-2.5 h-[44px] rounded-lg bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition-colors"
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmAdicionarModal
