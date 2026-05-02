'use client'

import { useState, useEffect, useTransition } from 'react'
import type { ElementType } from 'react'
import { Bell, Users, Building2, UserMinus, CheckCheck, X, ExternalLink, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import type { Notification } from '@/types'
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/supabase/queries/notifications'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const TYPE_META: Record<string, { label: string; color: string; icon: ElementType }> = {
  new_employee_registered: { label: '직원 등록',    color: 'bg-emerald-100 text-emerald-600', icon: Users      },
  new_company_request:     { label: '기업 가입신청', color: 'bg-blue-100 text-blue-600',       icon: Building2  },
  employee_resignation:    { label: '퇴사 통보',    color: 'bg-rose-100 text-rose-600',        icon: UserMinus  },
}

/* ── 상세 패널 ─────────────────────────────────────────────────── */
function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="w-24 flex-shrink-0 text-xs text-slate-400">{label}</span>
      <span className="text-xs text-slate-700 font-medium">{value}</span>
    </div>
  )
}

function salaryLabel(type?: string | null) {
  if (type === 'annual')  return '연봉제'
  if (type === 'monthly') return '월급제'
  if (type === 'hourly')  return '시급제'
  return type ?? null
}

function DetailPanel({
  notification,
  onClose,
  onProcessed,
}: {
  notification: Notification
  onClose: () => void
  onProcessed: (id: number) => void
}) {
  const [detail,    setDetail]    = useState<Record<string, any> | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState<string | null>(null)
  const [done,      setDone]      = useState(false)
  const [processing, setProcessing] = useState(false)

  /* 마운트 시 fetch */
  useEffect(() => {
    if (!notification.target_id) return
    setLoading(true)
    fetch(`/api/admin/notification-detail?type=${notification.type}&target_id=${notification.target_id}`)
      .then(r => r.json())
      .then(res => {
        if (res.error) setErr(res.error)
        else           setDetail(res.data)
      })
      .catch(() => setErr('데이터를 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [notification.target_id, notification.type])

  async function handleProcess() {
    setProcessing(true)
    await markNotificationRead(notification.id)
    setProcessing(false)
    setDone(true)
    onProcessed(notification.id)
    setTimeout(onClose, 800)
  }

  const meta = TYPE_META[notification.type] ?? { label: notification.type, color: 'bg-slate-100 text-slate-500', icon: Bell }
  const Icon = meta.icon

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* 패널 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${meta.color}`}>
              <Icon size={13} />
            </div>
            <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-xs text-slate-400">{timeAgo(notification.created_at)}</p>

          {loading && <p className="text-xs text-slate-400">불러오는 중...</p>}
          {err     && <p className="text-xs text-rose-500">{err}</p>}

          {detail && notification.type === 'new_company_request' && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">기업 정보</p>
              <Row label="회사명"     value={detail.company_name} />
              <Row label="사업자번호" value={detail.biz_number} />
              <Row label="대표자"     value={detail.representative} />
              <Row label="업태"       value={detail.business_type} />
              <Row label="종목"       value={detail.industry} />
              <Row label="전화번호"   value={detail.telephone} />
              <Row label="주소"       value={detail.address} />
              <p className="text-xs font-semibold text-slate-500 mb-2 mt-4 uppercase tracking-wide">담당자 정보</p>
              <Row label="이름"       value={detail.admin_name} />
              <Row label="이메일"     value={detail.admin_email} />
              <Row label="연락처"     value={detail.admin_phone} />
              <p className="text-xs text-slate-400 mt-3">
                신청일: {new Date(detail.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          )}

          {detail && notification.type === 'new_employee_registered' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">기본 정보</p>
                <Row label="소속 기업"  value={(detail.companies as any)?.name} />
                <Row label="사번"       value={detail.employee_number} />
                <Row label="이름"       value={detail.name} />
                <Row label="이메일"     value={detail.email} />
                <Row label="연락처"     value={detail.Tel} />
                <Row label="생년월일"   value={detail.birthdate} />
                <Row label="성별"       value={detail.Sex === 'M' ? '남' : detail.Sex === 'F' ? '여' : null} />
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">인사 정보</p>
                <Row label="부서"       value={detail.department} />
                <Row label="직위"       value={detail.position} />
                <Row label="직급"       value={detail.Grade} />
                <Row label="직책"       value={detail.job} />
                <Row label="입사일"     value={detail.Date_of_joining} />
                <Row label="근무지"     value={detail['Working place']} />
                <Row label="고용 형태"  value={detail.is_contract ? `계약직${detail.contract_end_date ? ` (~ ${detail.contract_end_date})` : ''}` : '정규직'} />
                <Row label="주소정근로" value={detail.weekly_work_hours ? `${detail.weekly_work_hours}시간` : null} />
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">급여 정보</p>
                <Row label="급여 유형"  value={salaryLabel(detail.salary_type)} />
                <Row label="지급 기준"  value={detail.salary_basis === 'gross' ? '세전' : detail.salary_basis === 'net' ? '세후' : null} />
                <Row label="급여 금액"  value={detail.salary_amount ? `${Number(detail.salary_amount).toLocaleString('ko-KR')}원` : null} />
                {Array.isArray(detail.non_taxable_items) && detail.non_taxable_items.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-[10px] text-slate-400 mb-1">비과세 항목</p>
                    {detail.non_taxable_items.map((item: any, i: number) => (
                      <Row key={i} label={item.name} value={`${Number(item.amount).toLocaleString('ko-KR')}원`} />
                    ))}
                    <Row label="과세총액" value={detail.taxable_total ? `${Number(detail.taxable_total).toLocaleString('ko-KR')}원` : null} />
                  </div>
                )}
              </div>
              {detail.is_foreigner && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">외국인 정보</p>
                  <Row label="국적"       value={detail.nationality} />
                  <Row label="비자 유형"  value={detail.visa_type} />
                </div>
              )}
            </div>
          )}

          {detail && notification.type === 'employee_resignation' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">직원 정보</p>
                <Row label="소속 기업"  value={(detail.companies as any)?.name} />
                <Row label="이름"       value={detail.name} />
                <Row label="이메일"     value={detail.email} />
                <Row label="연락처"     value={detail.Tel} />
                <Row label="생년월일"   value={detail.birthdate} />
                <Row label="성별"       value={detail.Sex === 'M' ? '남' : detail.Sex === 'F' ? '여' : null} />
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">재직 / 퇴직 정보</p>
                <Row label="부서"       value={detail.department} />
                <Row label="직위"       value={detail.position} />
                <Row label="직급"       value={detail.Grade} />
                <Row label="직책"       value={detail.job} />
                <Row label="입사일"     value={detail.Date_of_joining} />
                <Row label="퇴사일"     value={detail.quit_date} />
                <Row label="퇴사사유"   value={detail.quit_reason} />
                <Row label="고용 형태"  value={detail.is_contract ? '계약직' : '정규직'} />
                <Row label="주소정근로" value={detail.weekly_work_hours ? `${detail.weekly_work_hours}시간` : null} />
              </div>
              <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                <p className="text-[10px] font-semibold text-rose-400 mb-2 uppercase tracking-wide">실업급여</p>
                <Row label="신청 여부"      value={detail.unemployment_claim ? '신청' : '미신청'} />
                {detail.unemployment_claim && (
                  <Row label="이직 사유 코드" value={detail.unemployment_code} />
                )}
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">급여 정보</p>
                <Row label="급여 유형"  value={salaryLabel(detail.salary_type)} />
                <Row label="급여 금액"  value={detail.salary_amount ? `${Number(detail.salary_amount).toLocaleString('ko-KR')}원` : null} />
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2">
          {notification.type === 'new_company_request' && (
            <Link
              href="/admin/requests"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              기업신청 처리하기
              <ExternalLink size={13} />
            </Link>
          )}
          {notification.type === 'new_employee_registered' && (
            <button
              onClick={handleProcess}
              disabled={processing || done}
              className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                done
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
              }`}
            >
              {done ? <><CheckCircle size={14} />처리됨</> : processing ? '처리 중...' : <><CheckCircle size={14} />처리 완료</>}
            </button>
          )}
          {notification.type === 'employee_resignation' && (
            <button
              onClick={handleProcess}
              disabled={processing || done}
              className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                done
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50'
              }`}
            >
              {done ? <><CheckCircle size={14} />처리됨</> : processing ? '처리 중...' : <><CheckCircle size={14} />처리 완료</>}
            </button>
          )}
          {(notification.type === 'new_employee_registered' || notification.type === 'employee_resignation') && (
            <Link
              href={notification.type === 'employee_resignation' ? '/admin/employees/resigned' : '/admin/employees'}
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
            >
              {notification.type === 'employee_resignation' ? '퇴사자 목록' : '직원 목록'}
              <ExternalLink size={13} />
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

/* ── 메인 패널 ─────────────────────────────────────────────────── */
interface Props {
  notifications: Notification[]
}

export default function AdminNotificationsPanel({ notifications: initial }: Props) {
  const [items,    setItems]    = useState(initial)
  const [selected, setSelected] = useState<Notification | null>(null)
  const [, startTransition]    = useTransition()

  const unreadCount = items.filter(n => !n.is_read).length

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    })
  }

  function handleClick(n: Notification) {
    setSelected(n)
    if (!n.is_read) {
      startTransition(async () => {
        await markNotificationRead(n.id)
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      })
    }
  }

  return (
    <>
      <section>
        <div className="section-header">
          <div className="flex items-center gap-2">
            <h2 className="section-title">알림</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              <CheckCheck size={13} />
              모두 읽음
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="card p-8 text-center">
            <Bell size={22} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">새 알림이 없습니다</p>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-slate-50">
            {items.map(n => {
              const meta = TYPE_META[n.type] ?? { label: n.type, color: 'bg-slate-100 text-slate-500', icon: Bell }
              const Icon = meta.icon
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex gap-3 px-5 py-4 text-left transition-colors cursor-pointer ${
                    !n.is_read ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.color}`}>
                    <Icon size={14} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                    {n.message && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate">{n.message}</p>
                    )}
                    <span className="text-xs text-blue-500 mt-1 inline-block">상세 보기 →</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {selected && (
        <DetailPanel
          notification={selected}
          onClose={() => setSelected(null)}
          onProcessed={(id) => {
            setItems(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x))
          }}
        />
      )}
    </>
  )
}
