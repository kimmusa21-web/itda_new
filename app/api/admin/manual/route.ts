import { NextResponse }           from 'next/server'
import { createClient }            from '@/lib/supabase/server'
import React                       from 'react'
import { renderToBuffer }          from '@react-pdf/renderer'
import { UserManualPdf }           from '@/lib/pdf/user-manual'

export const maxDuration = 60

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager', 'employee'].includes(profile.role)) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const buffer = await renderToBuffer(React.createElement(UserManualPdf) as React.ReactElement)

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="ModuHR_사용설명서.pdf"',
      'Content-Length':      String(buffer.byteLength),
    },
  })
}
