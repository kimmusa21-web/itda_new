import { createClient } from '@supabase/supabase-js'
import { NextResponse }  from 'next/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: '파일을 읽을 수 없습니다' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 })
  }

  const service = serviceClient()
  const bytes    = await file.arrayBuffer()
  const buffer   = Buffer.from(bytes)

  /* ── Supabase Storage 업로드 ─────────────────────────────── */
  const ext      = file.name.split('.').pop() ?? 'pdf'
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const { data: uploadData, error: uploadError } = await service.storage
    .from('biz-docs')
    .upload(fileName, buffer, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    console.error('[extract-biz-doc] Storage 업로드 실패:', uploadError.message)
    return NextResponse.json({ error: '파일 업로드에 실패했습니다: ' + uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = service.storage
    .from('biz-docs')
    .getPublicUrl(uploadData.path)

  /* ── Claude API로 내용 추출 ──────────────────────────────── */
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // API 키 없으면 URL만 반환 (수동 입력 유도)
    return NextResponse.json({ url: publicUrl, extracted: null })
  }

  try {
    const base64 = buffer.toString('base64')
    const isImage = file.type.startsWith('image/')
    const mediaType = file.type || 'application/pdf'

    const contentBlock = isImage
      ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
      : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'pdfs-2024-09-25',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: `이 사업자등록증에서 아래 항목을 추출해 JSON으로만 응답하세요. 없는 항목은 null로 처리하세요.
{
  "company_name": "상호(법인명)",
  "biz_number": "사업자등록번호 (숫자와 하이픈만, 예: 123-45-67890)",
  "representative": "대표자 성명",
  "business_type": "업태",
  "industry": "종목",
  "address": "사업장 소재지",
  "opening_date": "개업연월일 (YYYY-MM-DD 형식)"
}
JSON 외 다른 텍스트는 절대 포함하지 마세요.`,
            },
          ],
        }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[extract-biz-doc] Claude API 오류:', errText)
      return NextResponse.json({ url: publicUrl, extracted: null })
    }

    const claudeData = await claudeRes.json()
    const text = claudeData.content?.[0]?.text ?? ''

    // JSON 파싱 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    return NextResponse.json({ url: publicUrl, extracted })
  } catch (e) {
    console.error('[extract-biz-doc] 추출 실패:', e)
    return NextResponse.json({ url: publicUrl, extracted: null })
  }
}
