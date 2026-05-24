import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link             from 'next/link'
import { FileText, UserMinus, CalendarDays, Building2, ChevronRight, Star } from 'lucide-react'

export const metadata = { title: '이직확인서' }

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function serviceDays(join: string | null, quit: string | null) {
  if (!join || !quit) return null
  const days = Math.round((new Date(quit).getTime() - new Date(join).getTime()) / 86400000)
  if (days < 0) return null
  const years  = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  return years > 0 ? `${years}년 ${months}개월` : `${months}개월 (${days}일)`
}

export default async function SeparationListPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, email, Tel, department, position, Date_of_joining, quit_date, quit_reason, unemployment_claim, unemployment_code, registration_number, companies(id, name, biz_number)')
    .eq('is_active', false)
    .not('quit_date', 'is', null)
    .order('quit_date', { ascending: false })

  const list = (employees ?? []) as any[]
  const withClaim    = list.filter(e => e.unemployment_claim)
  const withoutClaim = list.filter(e => !e.unemployment_claim)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">이직확인서</h1>
          <p className="text-sm text-slate-500 mt-0.5">퇴사 직원의 이직확인서를 작성하고 인쇄하세요</p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
          총 {list.length}명
        </span>
      </div>

      {list.length === 0 && (
        <div className="card p-12 text-center">
          <FileText size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">퇴사일이 기록된 직원이 없습니다</p>
        </div>
      )}

      {/* 실업급여 신청 직원 */}
      {withClaim.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Star size={13} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">실업급여 신청 ({withClaim.length}명)</h2>
            <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">우선 처리</span>
          </div>
          <div className="space-y-2">
            {withClaim.map(emp => <EmployeeRow key={emp.id} emp={emp} highlight />)}
          </div>
        </section>
      )}

      {/* 일반 퇴사자 */}
      {withoutClaim.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">일반 퇴사 ({withoutClaim.length}명)</h2>
          <div className="space-y-2">
            {withoutClaim.map(emp => <EmployeeRow key={emp.id} emp={emp} highlight={false} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function EmployeeRow({ emp, highlight }: { emp: any; highlight: boolean }) {
  return (
    <Link
      href={`/admin/separation/${emp.id}`}
      className={`flex items-center gap-4 p-4 rounded-xl border bg-white hover:bg-slate-50 transition-all group ${
        highlight ? 'border-amber-200' : 'border-slate-200'
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        highlight ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-500'
      }`}>
        <UserMinus size={15} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">{emp.name}</span>
          {emp.unemployment_code && (
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              코드 {emp.unemployment_code}
            </span>
          )}
          {highlight && (
            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">실업급여</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Building2 size={10} />
            {(emp.companies as any)?.name ?? '-'}
          </span>
          {emp.department && <span>{emp.department}</span>}
          <span className="flex items-center gap-1">
            <CalendarDays size={10} />
            퇴사일 {new Date(emp.quit_date).toLocaleDateString('ko-KR')}
          </span>
          {serviceDays(emp.Date_of_joining, emp.quit_date) && (
            <span className="text-slate-400">근속 {serviceDays(emp.Date_of_joining, emp.quit_date)}</span>
          )}
        </div>
        {emp.quit_reason && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">사유: {emp.quit_reason}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-blue-600 group-hover:text-blue-700 font-medium hidden sm:block">이직확인서 작성</span>
        <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600" />
      </div>
    </Link>
  )
}
