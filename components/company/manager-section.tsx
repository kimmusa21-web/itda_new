'use client'

import { useState, useTransition } from 'react'
import { UserCog, Check, X }       from 'lucide-react'
import { transferManagerRole }      from '@/lib/actions/manager-actions'

export interface ManagerProfile {
  id:    string
  name:  string | null
  email: string
}

export interface EligibleEmployee {
  id:      number
  name:    string
  email:   string
  user_id: string
}

interface Props {
  companyId:         number
  managers:          ManagerProfile[]
  eligibleEmployees: EligibleEmployee[]
}

export function ManagerSection({ companyId, managers, eligibleEmployees }: Props) {
  const [showModal,   setShowModal]   = useState(false)
  const [selectedId,  setSelectedId]  = useState<number | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [, startTransition]           = useTransition()

  function openModal() { setShowModal(true); setSelectedId(null) }
  function closeModal() { setShowModal(false); setSelectedId(null) }

  async function handleTransfer() {
    if (!selectedId) return
    setSaving(true)
    const result = await transferManagerRole(companyId, selectedId)
    setSaving(false)
    if (result.success) {
      closeModal()
      startTransition(() => { window.location.reload() })
    } else {
      alert('오류: ' + result.error)
    }
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">매니저</h2>
          </div>
          <button
            onClick={openModal}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {managers.length > 0 ? '매니저 변경' : '매니저 지정'}
          </button>
        </div>

        <div className="card p-4">
          {managers.length > 0 ? (
            <div className="space-y-3">
              {managers.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-700">
                      {(m.name ?? m.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">지정된 매니저가 없습니다</p>
          )}
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">매니저 변경</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  앱 계정이 있는 재직 직원에게 매니저 권한을 부여합니다.
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            {/* 직원 목록 */}
            {eligibleEmployees.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">
                <p>앱 계정이 있는 재직 직원이 없습니다.</p>
                <p className="text-xs mt-1">직원을 초대한 뒤 다시 시도해주세요.</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto mb-5">
                {eligibleEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedId(emp.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                      selectedId === emp.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.email}</p>
                    </div>
                    {selectedId === emp.id && (
                      <Check size={14} className="text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2">
              <button onClick={closeModal} className="btn-secondary flex-1">취소</button>
              <button
                onClick={handleTransfer}
                disabled={!selectedId || saving}
                className="btn-primary flex-1"
              >
                {saving ? '처리중...' : '권한 부여'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
