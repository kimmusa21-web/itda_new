import { redirect }                          from 'next/navigation'
import { createClient }                      from '@/lib/supabase/server'
import { getAdminPayrollListV2, getAdminAvailableMonthsV2 } from '@/lib/supabase/queries/payslip-v2'
import AdminPayrollClient                    from './client'

export const metadata = { title: '급여 조회' }

interface Props {
  searchParams: { company?: string; month?: string; q?: string }
}

export default async function AdminPayrollPage({ searchParams }: Props) {
  /* ── 1. 인증 + 역할 확인 ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  /* ── 2. 회사 목록 (필터 드롭다운) ── */
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('status', 'active')
    .order('name')

  /* ── 3. 검색 파라미터 파싱 ── */
  const companyId    = searchParams.company ? Number(searchParams.company) : undefined
  const accrualMonth = searchParams.month   ?? undefined

  /* ── 4. 사용 가능한 월 목록 ── */
  const months = await getAdminAvailableMonthsV2(companyId)
  const selectedMonth = accrualMonth ?? months[0] ?? ''

  /* ── 5. 급여 목록 조회 ── */
  const rows = selectedMonth
    ? await getAdminPayrollListV2({ companyId, accrualMonth: selectedMonth })
    : []

  return (
    <AdminPayrollClient
      companies={companies ?? []}
      initialCompanyId={companyId ?? null}
      initialMonths={months}
      initialMonth={selectedMonth}
      initialRows={rows}
    />
  )
}
