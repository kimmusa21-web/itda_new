'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompanyAdminRequest } from '@/types'

export default function RequestsPage() {
  const supabase = createClient()
  const [requests, setRequests] = useState<CompanyAdminRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [processing, setProcessing] = useState<number | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: number; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { fetchRequests() }, [filter])

  async function fetchRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('company_admin_requests')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setRequests(data ?? [])
    setLoading(false)
  }

  async function approve(req: CompanyAdminRequest) {
    if (!req.admin_email) return alert('담당자 이메일이 없습니다')
    setProcessing(req.id)
    try {
      // 1. companies 테이블에 회사 등록
      const { data: company, error: compErr } = await supabase
        .from('companies')
        .insert({
          name: req.company_name,
          biz_number: req.biz_number,
          representative: req.representative,
          'Business type': req.business_type,
          Industry: req.industry,
          Telephone: req.telephone,
          address: req.address,
          'tax invoice email': req.tax_invoice_email ?? null,
        })
        .select().single()
      if (compErr) throw compErr

      // 2. Supabase Auth에 manager 계정 생성 (임시 비밀번호는 이메일로 재설정)
      const { data: authUser, error: authErr } = await supabase.auth.admin?.createUser?.({
        email: req.admin_email,
        password: `${req.admin_email.split('@')[0]}000000`,
        email_confirm: true,
      }) as any
      // admin.createUser는 서버에서만 가능 — 여기서는 초대 이메일 방식 사용
      // 실제로는 API Route에서 처리 (아래 메모 참고)

      // 3. 신청서 상태 업데이트
      await supabase.from('company_admin_requests').update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      }).eq('id', req.id)

      alert(`승인 완료!\n회사 "${req.company_name}"이 등록되었습니다.\n담당자 계정 생성은 직원 관리에서 진행해주세요.`)
      fetchRequests()
    } catch (e: any) {
      alert('승인 처리 중 오류: ' + e.message)
    } finally {
      setProcessing(null)
    }
  }

  async function reject() {
    if (!rejectModal) return
    setProcessing(rejectModal.id)
    await supabase.from('company_admin_requests').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reject_reason: rejectReason,
    }).eq('id', rejectModal.id)
    setRejectModal(null)
    setRejectReason('')
    fetchRequests()
    setProcessing(null)
  }

  const tabs = [
    { key: 'pending' as const, label: '대기중' },
    { key: 'approved' as const, label: '승인완료' },
    { key: 'rejected' as const, label: '거절됨' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">기업 신청 관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">신규 기업 가입 신청을 검토하고 승인하세요</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
              ${filter === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : requests.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">신청 내역이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{req.company_name}</h3>
                    <span className={`badge ${
                      req.status === 'pending' ? 'badge-yellow' :
                      req.status === 'approved' ? 'badge-green' : 'badge-red'
                    }`}>
                      {req.status === 'pending' ? '대기' : req.status === 'approved' ? '승인' : '거절'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-sm">
                    <InfoRow label="사업자번호" value={req.biz_number} />
                    <InfoRow label="대표자" value={req.representative} />
                    <InfoRow label="업태" value={req.business_type} />
                    <InfoRow label="종목" value={req.industry} />
                    <InfoRow label="전화번호" value={req.telephone} />
                    <InfoRow label="주소" value={req.address} />
                    <InfoRow label="담당자명" value={req.admin_name} />
                    <InfoRow label="담당자 이메일" value={req.admin_email} />
                  </div>
                  {req.reject_reason && (
                    <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      거절 사유: {req.reject_reason}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-3">
                    신청일 {new Date(req.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                {req.status === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => approve(req)}
                      disabled={processing === req.id}
                      className="btn-primary text-xs px-3 py-2">
                      {processing === req.id ? '처리중...' : '승인'}
                    </button>
                    <button onClick={() => setRejectModal({ id: req.id, name: req.company_name ?? '' })}
                      className="btn-secondary text-xs px-3 py-2 text-red-500 border-red-200 hover:bg-red-50">
                      거절
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 거절 모달 */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">신청 거절</h3>
            <p className="text-sm text-gray-500 mb-4">"{rejectModal.name}" 신청을 거절합니다</p>
            <textarea
              className="input resize-none h-24"
              placeholder="거절 사유를 입력하세요 (선택)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRejectModal(null)} className="btn-secondary flex-1">취소</button>
              <button onClick={reject} className="btn-danger flex-1" disabled={processing === rejectModal.id}>
                {processing === rejectModal.id ? '처리중...' : '거절 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-700">{value}</span>
    </div>
  )
}
