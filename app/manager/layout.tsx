import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role)) redirect('/employee')

  return (
    <div className="flex min-h-dvh">
      <Navbar role="manager" name={profile.name ?? profile.email} />
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
