'use server'
import { createClient } from '@/lib/supabase/server'

export interface CompanyRow {
  id: number
  name: string
  biz_number: string | null
  representative: string | null
  'Business type': string | null
  Industry: string | null
  Telephone: string | null
  Fax: string | null
  address: string | null
  'tax invoice email': string | null
  payslip_note: string | null
}

export async function getAllCompanies(): Promise<CompanyRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('companies')
    .select('*')
    .order('name')
  return (data ?? []) as CompanyRow[]
}

export async function getCompanyById(id: number): Promise<CompanyRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()
  return data as CompanyRow | null
}

export interface RequestRow {
  id: number
  created_at: string
  company_name: string | null
  biz_number: string | null
  representative: string | null
  business_type: string | null
  industry: string | null
  telephone: string | null
  address: string | null
  admin_name: string | null
  admin_email: string | null
  admin_phone: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_at: string | null
  reject_reason: string | null
}

export async function getRequests(status?: string): Promise<RequestRow[]> {
  const supabase = createClient()
  let q = supabase
    .from('company_admin_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data } = await q
  return (data ?? []) as RequestRow[]
}
