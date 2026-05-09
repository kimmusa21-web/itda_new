/* ================================================================
   GET /api/companies/[id]/export/leave-usage
   연차 정책 변경 전 사용 내역 Excel 다운로드 (매니저용)
================================================================ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import * as XLSX                     from 'xlsx'
import { dailyHours }                from '@/lib/leave-calculator'

const LEAVE_TYPE: Record<string, string> = {
  full_day: '연차(종일)', half_day_am: '오전반차', half_day_pm: '오후반차', hourly: '시간단위',
}
const STATUS: Record<string, string> = {
  pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소',
}
const PERIOD_TYPE: Record<string, string> = {
  annual: '연간', monthly: '월차',
}
const BASIS: Record<string, string> = {
  hire_date: '입사일 기준', fiscal_year: '회계연도 기준',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const companyId = Number(params.id)
  if (isNaN(companyId)) return new NextResponse('Bad Request', { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // 매니저 권한 확인 (해당 회사 소속이어야 함)
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    const { data: emp } = await supabase
      .from('employees')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!emp || emp.company_id !== companyId || emp.role !== 'manager') {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  const [
    { data: company },
    { data: employees },
    { data: balances },
    { data: requests },
  ] = await Promise.all([
    supabase.from('companies').select('name').eq('id', companyId).single(),
    supabase
      .from('employees')
      .select('id, name, department, position, "Date_of_joining", weekly_work_hours')
      .eq('company_id', companyId)
      .eq('is_active', true),
    supabase
      .from('leave_balances')
      .select('*')
      .eq('company_id', companyId)
      .order('employee_id')
      .order('period'),
    supabase
      .from('leave_requests')
      .select('*, employees(name, department, position, "Date_of_joining")')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false }),
  ])

  const empMap = new Map((employees ?? []).map(e => [e.id, e]))

  // ── Sheet 1: 잔액 현황 ───────────────────────────────────────
  const balHeaders = [
    '직원명', '부서', '직책', '입사일', '기준', '기간', '구분',
    '발생(h)', '발생(일)', '조정(h)', '사용(h)', '사용(일)', '잔여(h)', '잔여(일)', '만료일',
  ]
  const balRows = (balances ?? []).map(b => {
    const emp = empMap.get(b.employee_id)
    const dh  = dailyHours(emp?.weekly_work_hours ?? null)
    const rem = Number(b.total_hours) + Number(b.adj_hours) - Number(b.used_hours)
    return [
      emp?.name          ?? '',
      emp?.department    ?? '',
      emp?.position      ?? '',
      emp?.Date_of_joining ?? '',
      BASIS[b.basis]     ?? b.basis,
      b.period,
      PERIOD_TYPE[b.period_type] ?? b.period_type,
      Number(b.total_hours),
      dh > 0 ? +(Number(b.total_hours) / dh).toFixed(1) : 0,
      Number(b.adj_hours),
      Number(b.used_hours),
      dh > 0 ? +(Number(b.used_hours) / dh).toFixed(1) : 0,
      +rem.toFixed(1),
      dh > 0 ? +(rem / dh).toFixed(1) : 0,
      b.expires_at ?? '',
    ]
  })

  const wsBalance = XLSX.utils.aoa_to_sheet([balHeaders, ...balRows])
  wsBalance['!cols'] = [14, 10, 10, 12, 12, 8, 6, 8, 7, 8, 8, 7, 8, 7, 12]
    .map(wch => ({ wch }))

  // ── Sheet 2: 신청 이력 ───────────────────────────────────────
  const reqHeaders = [
    '직원명', '부서', '직책', '입사일', '신청유형', '시작일', '종료일',
    '사용시간(h)', '사용일수', '상태', '사유', '신청일',
  ]
  const reqRows = (requests ?? []).map(r => {
    type EmpInfo = { name?: string; department?: string; position?: string; Date_of_joining?: string } | null
    const emp = (r.employees as EmpInfo[])?.[0] ?? null
    const fullEmp = emp?.name ? empMap.get(
      [...empMap.values()].find(e => e.name === emp.name)?.id ?? -1,
    ) : null
    const dh = dailyHours(fullEmp?.weekly_work_hours ?? null)
    return [
      emp?.name         ?? '',
      emp?.department   ?? '',
      emp?.position     ?? '',
      emp?.Date_of_joining ?? '',
      LEAVE_TYPE[r.leave_type] ?? r.leave_type,
      r.start_date      ?? '',
      r.end_date        ?? '',
      Number(r.hours_requested),
      dh > 0 ? +(Number(r.hours_requested) / dh).toFixed(1) : 0,
      STATUS[r.status]  ?? r.status,
      r.reason          ?? '',
      r.requested_at ? new Date(r.requested_at).toISOString().slice(0, 10) : '',
    ]
  })

  const wsRequest = XLSX.utils.aoa_to_sheet([reqHeaders, ...reqRows])
  wsRequest['!cols'] = [14, 10, 10, 12, 10, 10, 10, 10, 8, 6, 20, 12]
    .map(wch => ({ wch }))

  // ── Workbook 생성 ────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsBalance, '잔액현황')
  XLSX.utils.book_append_sheet(wb, wsRequest, '신청이력')

  const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const today    = new Date().toISOString().slice(0, 10)
  const fileName = `연차사용내역_${company?.name ?? companyId}_${today}.xlsx`

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
