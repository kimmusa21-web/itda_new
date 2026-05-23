import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GuideClient } from './client'

export const metadata = { title: '사용 설명서 | itda' }

export default async function GuidePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <GuideClient />
}
