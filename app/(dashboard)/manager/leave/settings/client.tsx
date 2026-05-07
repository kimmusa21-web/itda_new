'use client'

import { useState }        from 'react'
import { useRouter }       from 'next/navigation'
import { Settings, CheckCircle, XCircle, Loader2, Info } from 'lucide-react'
import { cn }              from '@/lib/utils'
import { saveLeavePolicy } from '@/lib/actions/leave-actions'
import type { LeaveBasis } from '@/types/leave'

interface Props { policy: {
  basis: LeaveBasis; allow_negative: boolean; auto_approve: boolean; settle_on_resign: boolean
} | null }

export function LeaveSettingsClient({ policy }: Props) {
  const router  = useRouter()
  const isNew   = !policy

  const [basis,          setBasis]          = useState<LeaveBasis>(policy?.basis ?? 'hire_date')
  const [allowNegative,  setAllowNegative]  = useState(policy?.allow_negative  ?? false)
  const [autoApprove,    setAutoApprove]    = useState(policy?.auto_approve     ?? false)
  const [settleOnResign, setSettleOnResign] = useState(policy?.settle_on_resign ?? true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    const res = await saveLeavePolicy({ basis, allow_negative: allowNegative, auto_approve: autoApprove, settle_on_resign: settleOnResign })
    setSaving(false)
    if (!res.success) { showToast(res.error ?? '저장 실패', false); return }
    showToast('연차 정책이 저장되었습니다')
    if (isNew) router.push('/manager/leave')
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Settings size={20} className="text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-800">연차 정책 설정</h2>
        {isNew && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">최초 설정</span>}
      </div>

      {isNew && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            연차 정책은 최초 1회 설정 후 변경이 가능합니다. 기준 방식은 신중하게 선택해주세요.
          </p>
        </div>
      )}

      <div className="card p-6 space-y-6">

        {/* 발생 기준 */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">연차 발생 기준</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['hire_date',    '입사일 기준',    '직원 입사일 기념일마다 연차 발생'],
              ['fiscal_year',  '회계연도 기준',  '매년 1월 1일 기준으로 연차 일괄 발생'],
            ] as [LeaveBasis, string, string][]).map(([val, label, desc]) => (
              <button
                key={val}
                onClick={() => setBasis(val)}
                className={cn(
                  'text-left p-4 rounded-xl border-2 transition-all',
                  basis === val
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <p className={cn('text-sm font-semibold', basis === val ? 'text-emerald-700' : 'text-slate-700')}>{label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* 토글 옵션들 */}
        {([
          [allowNegative,  setAllowNegative,  '마이너스 연차 허용',   '잔여 연차가 없어도 신청·승인 가능 (추후 차감)'],
          [autoApprove,    setAutoApprove,    '자동 승인',            '직원 신청 시 매니저 승인 없이 즉시 처리'],
          [settleOnResign, setSettleOnResign, '퇴직 시 정산',         '퇴직 처리 시 미사용 연차를 자동으로 비교·계산'],
        ] as [boolean, (v: boolean) => void, string, string][]).map(([val, setter, label, desc]) => (
          <label key={label} className="flex items-start justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => setter(!val)}
              className={cn(
                'flex-shrink-0 mt-0.5 w-11 h-6 rounded-full transition-colors relative',
                val ? 'bg-emerald-500' : 'bg-slate-200',
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                val ? 'translate-x-5' : 'translate-x-0',
              )} />
            </button>
          </label>
        ))}
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? <><Loader2 size={16} className="animate-spin" />저장 중...</> : '설정 저장'}
      </button>

      {toast && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-medium z-50',
          toast.ok ? 'bg-slate-900 text-white' : 'bg-red-600 text-white',
        )}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
