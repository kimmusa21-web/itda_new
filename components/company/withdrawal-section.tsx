'use client'

import { useState } from 'react'
import { AlertTriangle, X, Download, CheckSquare, Square } from 'lucide-react'

interface Props {
  companyId:   number
  companyName: string
  hasPending:  boolean
}

type Step = 'idle' | 'warning' | 'confirm'

export function WithdrawalSection({ companyId, companyName, hasPending }: Props) {
  const [step,            setStep]           = useState<Step>('idle')
  const [dataDownloaded,  setDataDownloaded] = useState(false)
  const [note,            setNote]           = useState('')
  const [loading,         setLoading]        = useState(false)
  const [done,            setDone]           = useState(hasPending)
  const [error,           setError]          = useState('')

  function openModal() {
    setStep('warning')
    setDataDownloaded(false)
    setNote('')
    setError('')
  }

  function closeModal() {
    setStep('idle')
    setDataDownloaded(false)
    setNote('')
    setError('')
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/company/withdrawal-request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ note: note.trim() || null, data_downloaded: dataDownloaded }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '오류가 발생했습니다')
      setDone(true)
      closeModal()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── 섹션 ── */}
      <div className="pt-6 mt-6 border-t border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">회사 탈퇴신청</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              탈퇴 신청 후 어드민 검토를 거쳐 처리됩니다. 데이터는 법정 기간(3년) 보존 후 삭제됩니다.
            </p>
          </div>
          {done ? (
            <span className="flex-shrink-0 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
              신청 접수됨
            </span>
          ) : (
            <button
              onClick={openModal}
              className="flex-shrink-0 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              탈퇴신청
            </button>
          )}
        </div>
      </div>

      {/* ── 1단계: 경고 모달 ── */}
      {step === 'warning' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">탈퇴 전 반드시 확인하세요</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{companyName}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-red-700">탈퇴 시 다음 정보에 접근이 불가해집니다</p>
                <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                  <li>전체 직원 급여대장 및 급여명세서</li>
                  <li>근로소득 원천징수 내역</li>
                  <li>4대보험 관련 급여 데이터</li>
                  <li>연말정산 기초 자료</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">법적 보관 의무:</span> 근로기준법 및 세법에 따라
                  급여·세무 서류는 최소 3년간 보관해야 합니다. 탈퇴 전 반드시 필요한 자료를 다운로드하세요.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Download size={13} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">다운로드 권장 항목</p>
                </div>
                <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside">
                  <li>월별 급여대장 (엑셀)</li>
                  <li>직원별 급여명세서</li>
                  <li>연간 근로소득 원천징수 영수증</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={closeModal} className="btn-secondary flex-1">취소</button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                내용 확인 후 계속
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2단계: 신청 확인 모달 ── */}
      {step === 'confirm' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">탈퇴신청 확인</h3>
                <p className="text-xs text-slate-500 mt-0.5">신청 후 어드민 검토를 거쳐 처리됩니다</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              {/* 다운로드 확인 체크박스 */}
              <button
                onClick={() => setDataDownloaded(v => !v)}
                className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-colors text-left"
              >
                {dataDownloaded
                  ? <CheckSquare size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  : <Square      size={18} className="text-slate-300 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-sm font-medium text-slate-800">필요한 급여 데이터를 모두 다운로드했습니다</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    급여대장, 급여명세서, 원천징수 내역 등 법정 보관 서류를 사전에 저장했음을 확인합니다.
                  </p>
                </div>
              </button>

              {/* 사유 입력 (선택) */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">
                  탈퇴 사유 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <textarea
                  className="input text-sm resize-none min-h-[72px]"
                  placeholder="탈퇴 사유를 간략히 적어주세요"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('warning')}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? '신청 중...' : '탈퇴신청 제출'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
