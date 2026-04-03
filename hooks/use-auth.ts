'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CurrentUser } from '@/lib/supabase/queries/auth'
import type { Role } from '@/lib/navigation'

const ROLE_BG: Record<Role, string> = {
  admin:    '#4f46e5',
  manager:  '#0e7490',
  employee: '#1d4ed8',
}

function buildInitials(name: string | null, email: string): string {
  if (name && name.length >= 2) return name.slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

export function useAuth() {
  const [user, setUser]     = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setUser(null); setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, companies(name)')
      .eq('id', authUser.id)
      .single()

    if (!profile) { setUser(null); setLoading(false); return }

    const role = (profile.role ?? 'employee') as Role
    setUser({
      id: authUser.id,
      email: authUser.email ?? '',
      name: profile.name,
      role,
      companyId: profile.company_id,
      companyName: (profile.companies as any)?.name ?? null,
      avatarBg: ROLE_BG[role],
      avatarInitials: buildInitials(profile.name, authUser.email ?? ''),
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchUser())
    return () => subscription.unsubscribe()
  }, [fetchUser])

  return { user, loading }
}
