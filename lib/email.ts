/* ================================================================
   itda — 이메일 발송 추상화 레이어
   MVP: console.log 기반 mock
   교체 방법: sendRawEmail() 내부만 Resend / SMTP / Supabase SMTP로 교체
================================================================ */

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

/* ── 저수준: 실제 이메일 발송 (교체 포인트) ─────────────────── */
async function sendRawEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  // TODO: 아래 주석 중 하나를 실제 provider로 교체
  //
  // [Resend]
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // const { error } = await resend.emails.send({ from: 'noreply@itda.kr', ...payload })
  // if (error) return { success: false, error: error.message }
  //
  // [Nodemailer / SMTP]
  // const transporter = nodemailer.createTransport({ host: ..., auth: { ... } })
  // await transporter.sendMail({ from: 'noreply@itda.kr', to: payload.to, subject: payload.subject, html: payload.html })

  // MVP: 콘솔 출력
  console.log('━━━ [EMAIL MOCK] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`To:      ${payload.to}`)
  console.log(`Subject: ${payload.subject}`)
  console.log(`Body:    ${payload.text ?? payload.html.replace(/<[^>]+>/g, '')}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return { success: true }
}

/* ── 인증번호 이메일 ─────────────────────────────────────────── */
export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string,
  expiresInMinutes = 30,
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return sendRawEmail({
    to,
    subject: '[itda] 가입 인증번호 안내',
    text: `안녕하세요, ${name}님.\n\n인증번호: ${code}\n\n인증번호는 ${expiresInMinutes}분간 유효합니다.\n가입 페이지: ${appUrl}/auth/verify`,
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#2563eb;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">itda</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">급여관리 서비스</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 8px">안녕하세요, <strong>${name}</strong>님.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">아래 인증번호를 입력하여 가입을 완료해주세요.</p>

      <div style="background:#f1f5f9;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
        <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#2563eb;font-variant-numeric:tabular-nums">${code}</span>
        <p style="color:#64748b;font-size:12px;margin:12px 0 0">인증번호는 <strong>${expiresInMinutes}분</strong>간 유효합니다</p>
      </div>

      <a href="${appUrl}/auth/verify"
         style="display:block;background:#2563eb;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:20px">
        가입 완료하러 가기 →
      </a>

      <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6">
        본인이 요청하지 않은 경우 이 이메일을 무시하세요.<br>
        인증번호를 타인에게 공유하지 마세요.
      </p>
    </div>
  </div>
</body>
</html>`.trim(),
  })
}

/* ── 초대 완료 알림 이메일 (선택적) ─────────────────────────── */
export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  return sendRawEmail({
    to,
    subject: '[itda] 가입이 완료되었습니다',
    text: `환영합니다, ${name}님! itda 급여관리 서비스에 가입되었습니다.`,
    html: `<p>환영합니다, <strong>${name}</strong>님! itda에 오신 것을 환영합니다.</p>`,
  })
}
