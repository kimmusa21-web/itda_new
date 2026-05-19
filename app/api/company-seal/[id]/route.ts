import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function requireAdmin() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

async function ensureBucket(service: ReturnType<typeof serviceClient>) {
  const { data: buckets } = await service.storage.listBuckets()
  if (!buckets?.find(b => b.name === 'company-seals')) {
    await service.storage.createBucket('company-seals', { public: true })
  }
}

/* ── POST: 직인 이미지 업로드 ───────────────────────────────── */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '어드민 권한이 필요합니다' }, { status: 403 })

  const companyId = Number(params.id)
  if (isNaN(companyId)) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const formData = await req.formData().catch(() => null)
  const file     = formData?.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다' }, { status: 400 })

  const ext     = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const allowed = ['png', 'jpg', 'jpeg', 'webp']
  if (!allowed.includes(ext))
    return NextResponse.json({ error: 'PNG, JPG, WEBP 파일만 가능합니다' }, { status: 400 })

  const service = serviceClient()
  await ensureBucket(service)

  // 기존 커스텀 직인이 있으면 삭제
  const { data: existing } = await service
    .from('companies').select('seal_image_url').eq('id', companyId).single()
  if (existing?.seal_image_url) {
    const old = decodeURIComponent(existing.seal_image_url).split('/company-seals/').pop()?.split('?')[0]
    if (old) await service.storage.from('company-seals').remove([old])
  }

  const fileName = `${companyId}_${Date.now()}.${ext}`
  const bytes    = await file.arrayBuffer()

  const { data: uploadData, error: uploadErr } = await service.storage
    .from('company-seals')
    .upload(fileName, Buffer.from(bytes), {
      contentType: file.type || 'image/png',
      upsert: true,
    })

  if (uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage
    .from('company-seals')
    .getPublicUrl(uploadData.path)

  await service.from('companies')
    .update({ seal_image_url: publicUrl })
    .eq('id', companyId)

  return NextResponse.json({ url: publicUrl })
}

/* ── DELETE: 커스텀 직인 삭제 (자동 생성으로 복귀) ─────────── */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '어드민 권한이 필요합니다' }, { status: 403 })

  const companyId = Number(params.id)
  if (isNaN(companyId)) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const service = serviceClient()

  const { data: company } = await service
    .from('companies').select('seal_image_url').eq('id', companyId).single()

  if (company?.seal_image_url) {
    const fileName = decodeURIComponent(company.seal_image_url)
      .split('/company-seals/').pop()?.split('?')[0]
    if (fileName) await service.storage.from('company-seals').remove([fileName])
  }

  await service.from('companies')
    .update({ seal_image_url: null })
    .eq('id', companyId)

  return NextResponse.json({ success: true })
}
