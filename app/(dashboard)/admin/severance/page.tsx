import { redirect }        from 'next/navigation'
import { createClient }    from '@/lib/supabase/server'
import SeveranceClient     from './client'

export const metadata = { title: '퇴직금 산정 | itda' }

export default async function SeverancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${profile?.role ?? 'employee'}`)

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('status', 'active')
    .order('name')

  return <SeveranceClient companies={companies ?? []} />
}
