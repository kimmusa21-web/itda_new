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
/*
  실제 발송으로 전환하려면 아래 중 하나를 선택하세요.

  ━━━ [Resend — 권장] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. npm install resend
  2. .env.local에 RESEND_API_KEY=re_xxx 추가
  3. 아래 mock 블록을 주석처리하고 Resend 블록 주석 해제

  ━━━ [Nodemailer / SMTP] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. npm install nodemailer @types/nodemailer
  2. .env.local에 SMTP 설정 추가
  3. 아래 SMTP 블록 주석 해제
*/
async function sendRawEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {

  // ── [Resend — RESEND_API_KEY가 있으면 실제 발송] ─────────────
  console.log('[EMAIL] RESEND_API_KEY 존재 여부:', !!process.env.RESEND_API_KEY)
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.EMAIL_FROM ?? 'itda <noreply@itda.kr>'
    const { error } = await resend.emails.send({
      from,
      to:      payload.to,
      subject: payload.subject,
      html:    payload.html,
      text:    payload.text,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // ── [콘솔 mock — API KEY 미설정 시 fallback] ─────────────────
  console.log('━━━ [EMAIL MOCK — RESEND_API_KEY 미설정] ━━━━━━')
  console.log(`To:      ${payload.to}`)
  console.log(`Subject: ${payload.subject}`)
  console.log(`Body:\n${payload.text ?? payload.html.replace(/<[^>]+>/g, '')}`)
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

/* ── 급여명세서 발송 알림 이메일 ─────────────────────────────── */
export async function sendPayslipNotificationEmail(
  to: string,
  name: string,
  params: {
    companyName: string
    accrualMonth: string     // YYYY-MM
    paymentDate: string | null
    payslipUrl: string       // 직접 링크
  },
): Promise<{ success: boolean; error?: string }> {
  const { companyName, accrualMonth, paymentDate, payslipUrl } = params
  const [year, month] = accrualMonth.split('-')
  const monthLabel    = `${year}년 ${parseInt(month)}월`
  const payDateLabel  = paymentDate
    ? new Date(paymentDate).toLocaleDateString('ko-KR')
    : '미정'

  return sendRawEmail({
    to,
    subject: `[itda] ${companyName} ${monthLabel} 급여명세서 안내`,
    text: [
      `안녕하세요, ${name}님.`,
      ``,
      `${companyName}의 ${monthLabel} 급여명세서가 등록되었습니다.`,
      ``,
      `  지급일: ${payDateLabel}`,
      ``,
      `아래 링크에서 급여명세서를 확인하세요:`,
      payslipUrl,
      ``,
      `본 메일은 itda 급여관리 서비스에서 자동 발송되었습니다.`,
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">

    <!-- 헤더 -->
    <div style="background:#2563eb;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">itda</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">급여관리 서비스</p>
    </div>

    <!-- 본문 -->
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:16px;margin:0 0 4px">안녕하세요, <strong>${name}</strong>님.</p>
      <p style="color:#64748b;font-size:14px;margin:0 0 28px">
        ${companyName}의 <strong>${monthLabel}</strong> 급여명세서가 등록되었습니다.
      </p>

      <!-- 요약 박스 -->
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;margin-bottom:28px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="color:#64748b;font-size:13px;padding:4px 0">귀속월</td>
            <td style="color:#0f172a;font-size:13px;font-weight:600;text-align:right;padding:4px 0">${monthLabel}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;padding:4px 0">지급일</td>
            <td style="color:#0f172a;font-size:13px;font-weight:600;text-align:right;padding:4px 0">${payDateLabel}</td>
          </tr>
        </table>
      </div>

      <!-- CTA 버튼 -->
      <a href="${payslipUrl}"
         style="display:block;background:#2563eb;color:white;text-align:center;padding:15px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:24px;letter-spacing:-0.01em">
        급여명세서 확인하기 →
      </a>

      <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.7">
        급여 내역 상세 조회는 로그인 후 확인 가능합니다.<br>
        본 이메일은 itda 급여관리 서비스에서 자동 발송되었습니다.
      </p>
    </div>

    <!-- 푸터 -->
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">
        © itda 급여관리 · 본 메일은 발신 전용입니다.
      </p>
    </div>
  </div>
</body>
</html>`.trim(),
  })
}

/* ── 직원 초대 링크 이메일 ───────────────────────────────────── */
export async function sendInviteEmail(
  to: string,
  name: string,
  token: string,
  expiresInHours = 24,
): Promise<{ success: boolean; error?: string }> {
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/auth/invite?token=${encodeURIComponent(token)}`

  return sendRawEmail({
    to,
    subject: '[itda] 급여관리 서비스 초대 안내',
    text: [
      `안녕하세요, ${name}님.`,
      ``,
      `itda 급여관리 서비스에 초대되었습니다.`,
      `아래 링크를 클릭하여 비밀번호를 설정하고 가입을 완료해주세요.`,
      ``,
      inviteUrl,
      ``,
      `링크는 ${expiresInHours}시간 동안 유효합니다.`,
      `본인이 요청하지 않은 경우 이 이메일을 무시하세요.`,
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#2563eb;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">itda</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">급여관리 서비스</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:16px;margin:0 0 6px">안녕하세요, <strong>${name}</strong>님.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 28px;line-height:1.6">
        itda 급여관리 서비스에 초대되었습니다.<br>
        아래 버튼을 클릭하여 비밀번호를 설정하고 가입을 완료해주세요.
      </p>

      <a href="${inviteUrl}"
         style="display:block;background:#2563eb;color:white;text-align:center;padding:15px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:24px;letter-spacing:-0.01em">
        가입 완료하기 →
      </a>

      <div style="background:#f1f5f9;border-radius:10px;padding:14px 16px;margin-bottom:20px">
        <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7">
          버튼이 작동하지 않으면 아래 URL을 복사하여 브라우저에 붙여넣으세요.<br>
          <span style="color:#2563eb;word-break:break-all;font-size:11px">${inviteUrl}</span>
        </p>
      </div>

      <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.7">
        이 링크는 <strong>${expiresInHours}시간</strong> 동안 유효합니다.<br>
        본인이 요청하지 않은 경우 이 이메일을 무시하세요.<br>
        링크를 타인에게 공유하지 마세요.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">
        © itda 급여관리 · 본 메일은 발신 전용입니다.
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
