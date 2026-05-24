/* ================================================================
   ModuHR — 직원 정보 CSV 내보내기 Route Handler
   GET /api/employees/export?companyId=N&status=active|inactive|all
   권한: admin(전체 또는 회사별), manager(본인 회사만)
================================================================ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* ── CSV 이스케이프 ── */
function esc(value: unknown): string {
  if (value == null || value === '') return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/* ── CSV 헤더 ── */
const HEADERS = [
  '회사명', '사번', '성명', '이메일', '생년월일', '성별',
  '부서', '직위', '직급', '직책', '직무', '전화번호',
  '근무지', '업무내용', '입사일', '퇴사일', '재직상태', '계정연결여부',
]

export async function GET(req: NextRequest) {
  const supabase = createClient()

  /* ── 인증 ── */
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role === 'employee') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  /* ── 파라미터 파싱 ── */
  const sp        = req.nextUrl.searchParams
  const companyId = sp.get('companyId') ? Number(sp.get('companyId')) : null
  const status    = sp.get('status') ?? 'all'   // active | inactive | all

  /* ── Manager: 본인 회사만 허용 ── */
  if (profile.role === 'manager') {
    if (!profile.company_id) return new NextResponse('Forbidden', { status: 403 })
    if (companyId && companyId !== profile.company_id) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  /* ── 데이터 조회 ── */
  let query = supabase
    .from('employees')
    .select('*, companies(name)')
    .order('company_id', { ascending: true })
    .order('name', { ascending: true })

  /* 회사 필터 */
  const targetCompanyId = profile.role === 'manager' ? profile.company_id : companyId
  if (targetCompanyId) {
    query = query.eq('company_id', targetCompanyId)
  }

  /* 재직 상태 필터 */
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data, error } = await query
  if (error) return new NextResponse(`DB Error: ${error.message}`, { status: 500 })

  const rows = data ?? []

  /* ── CSV 행 빌드 ── */
  const csvRows = rows.map(emp => {
    const co = emp.companies as { name?: string } | null
    const cells = [
      co?.name            ?? '',
      emp.employee_number ?? '',
      emp.name            ?? '',
      emp.email           ?? '',
      emp.birthdate       ?? '',
      emp.Sex === 'M' || emp.Sex === '남' ? '남성' : emp.Sex === 'F' || emp.Sex === '여' ? '여성' : (emp.Sex ?? ''),
      emp.department      ?? '',
      emp.position        ?? '',
      emp.Grade           ?? '',
      emp.Role            ?? '',
      emp.job             ?? '',
      emp.Tel             ?? '',
      emp['Working place'] ?? '',
      emp['Work details']  ?? '',
      emp.Date_of_joining ?? '',
      emp.quit_date       ?? '',
      emp.is_active ? '재직' : '퇴사',
      emp.user_id ? '연결됨' : '미연결',
    ]
    return cells.map(esc).join(',')
  })

  /* ── 파일명 ── */
  const today = new Date().toISOString().slice(0, 10)
  const statusLabel = status === 'active' ? '_재직' : status === 'inactive' ? '_퇴사' : ''
  let companyLabel = ''
  if (targetCompanyId && rows.length > 0) {
    const co = rows[0].companies as { name?: string } | null
    companyLabel = `_${co?.name ?? String(targetCompanyId)}`
  }
  const fileName = `employees${companyLabel}${statusLabel}_${today}.csv`

  /* ── CSV 응답 (UTF-8 BOM) ── */
  const BOM = '\uFEFF'
  const csv = BOM + [HEADERS.join(','), ...csvRows].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
