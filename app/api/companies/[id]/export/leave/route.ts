/* ================================================================
   GET /api/companies/[id]/export/leave
   탈퇴기업 연차휴가 발생·사용 정보 CSV 다운로드 (admin 전용)
================================================================ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function esc(value: unknown): string {
  if (value == null || value === '') return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function num(v: unknown, digits = 1): string {
  if (v == null) return '0'
  return Number(v).toFixed(digits)
}

const BALANCE_HEADERS = [
  '사번', '성명', '기준', '기간', '구분',
  '부여시간', '사용시간', '조정시간', '잔여시간', '만료일',
]

const REQUEST_HEADERS = [
  '사번', '성명', '신청유형', '시작일', '종료일',
  '신청시간', '상태', '신청일',
]

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const companyId = Number(params.id)
  if (isNaN(companyId)) return new NextResponse('Bad Request', { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: company } = await service
    .from('companies').select('name').eq('id', companyId).single()

  const [{ data: balances, error: balErr }, { data: requests, error: reqErr }] = await Promise.all([
    service
      .from('leave_balances')
      .select('basis, period, period_type, total_hours, used_hours, adj_hours, expires_at, employees(employee_number, name)')
      .eq('company_id', companyId)
      .order('period', { ascending: false }),
    service
      .from('leave_requests')
      .select('leave_type, start_date, end_date, hours_requested, status, requested_at, employees(employee_number, name)')
      .eq('company_id', companyId)
      .order('requested_at', { ascending: false }),
  ])

  if (balErr) return new NextResponse('DB Error: ' + balErr.message, { status: 500 })
  if (reqErr) return new NextResponse('DB Error: ' + reqErr.message, { status: 500 })

  const leaveTypeLabel: Record<string, string> = {
    full_day: '연차(종일)', half_day_am: '오전반차', half_day_pm: '오후반차', hourly: '시간단위',
  }
  const statusLabel: Record<string, string> = {
    pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소',
  }
  const periodTypeLabel: Record<string, string> = {
    annual: '연간', monthly: '월차',
  }
  const basisLabel: Record<string, string> = {
    hire_date: '입사일기준', fiscal_year: '회계연도기준',
  }

  const balanceRows = (balances ?? []).map(b => {
    const emp = b.employees as { employee_number?: string; name?: string } | null
    const remaining = Number(b.total_hours) + Number(b.adj_hours) - Number(b.used_hours)
    return [
      emp?.employee_number ?? '',
      emp?.name ?? '',
      basisLabel[b.basis] ?? b.basis,
      b.period,
      periodTypeLabel[b.period_type] ?? b.period_type,
      num(b.total_hours),
      num(b.used_hours),
      num(b.adj_hours),
      num(remaining),
      b.expires_at ?? '',
    ].map(esc).join(',')
  })

  const requestRows = (requests ?? []).map(r => {
    const emp = r.employees as { employee_number?: string; name?: string } | null
    return [
      emp?.employee_number ?? '',
      emp?.name ?? '',
      leaveTypeLabel[r.leave_type] ?? r.leave_type,
      r.start_date ?? '',
      r.end_date ?? '',
      num(r.hours_requested),
      statusLabel[r.status] ?? r.status,
      r.requested_at ? new Date(r.requested_at).toISOString().slice(0, 10) : '',
    ].map(esc).join(',')
  })

  const today = new Date().toISOString().slice(0, 10)
  const fileName = `연차정보_${company?.name ?? companyId}_${today}.csv`
  const BOM = '﻿'
  const csv =
    BOM +
    '■ 연차 잔액 현황\r\n' +
    [BALANCE_HEADERS.join(','), ...balanceRows].join('\r\n') +
    '\r\n\r\n■ 연차 신청 이력\r\n' +
    [REQUEST_HEADERS.join(','), ...requestRows].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
