import { redirect }                    from 'next/navigation'
import { Settings, FileText }          from 'lucide-react'
import { createClient }                from '@/lib/supabase/server'
import { getAppSetting }               from '@/lib/supabase/queries/app-settings'
import { DefaultPayslipNoteEditor }    from '@/components/admin/default-payslip-note-editor'

export const metadata = { title: '시스템 설정 | itda' }

export default async function AdminSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const defaultNote = await getAppSetting('default_payslip_note')

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings size={20} className="text-slate-400" />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">시스템 설정</h1>
          <p className="text-sm text-slate-500 mt-0.5">전체 시스템에 적용되는 기본값을 관리합니다</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <FileText size={15} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">급여명세서 산출 근거 기본값</h2>
        </div>
        <DefaultPayslipNoteEditor initialNote={defaultNote} />
      </div>
    </div>
  )
}
