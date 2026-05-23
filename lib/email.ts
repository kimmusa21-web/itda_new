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
  attachments?: { filename: string; content: Buffer }[]
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
    const from = process.env.EMAIL_FROM ?? 'ModuHR <swkim@fithr.co.kr>'
    const { error } = await resend.emails.send({
      from,
      to:          payload.to,
      subject:     payload.subject,
      html:        payload.html,
      text:        payload.text,
      attachments: payload.attachments,
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
    subject: '[ModuHR] 가입 인증번호 안내',
    text: `안녕하세요, ${name}님.\n\n인증번호: ${code}\n\n인증번호는 ${expiresInMinutes}분간 유효합니다.\n가입 페이지: ${appUrl}/auth/verify`,
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#2563eb;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
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
    subject: `[ModuHR] ${companyName} ${monthLabel} 급여명세서 안내`,
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
      `본 메일은 ModuHR에서 자동 발송되었습니다.`,
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">

    <!-- 헤더 -->
    <div style="background:#2563eb;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
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
        본 이메일은 ModuHR에서 자동 발송되었습니다.
      </p>
    </div>

    <!-- 푸터 -->
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">
        © ModuHR · 본 메일은 발신 전용입니다.
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
    subject: '[ModuHR] 급여관리 서비스 초대 안내',
    text: [
      `안녕하세요, ${name}님.`,
      ``,
      `ModuHR에 초대되었습니다.`,
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
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">급여관리 서비스</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:16px;margin:0 0 6px">안녕하세요, <strong>${name}</strong>님.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 28px;line-height:1.6">
        ModuHR에 초대되었습니다.<br>
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
        © ModuHR · 본 메일은 발신 전용입니다.
      </p>
    </div>
  </div>
</body>
</html>`.trim(),
  })
}

/* ── 재직/경력증명서 PDF 생성 ────────────────────────────────── */
async function generateCertPdf(params: Parameters<typeof import('./pdf/employment-certificate').EmploymentCertificateDoc>[0]): Promise<Buffer | null> {
  try {
    const [{ renderToBuffer }, { EmploymentCertificateDoc }, React] = await Promise.all([
      import('@react-pdf/renderer'),
      import('./pdf/employment-certificate'),
      import('react'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await renderToBuffer(React.default.createElement(EmploymentCertificateDoc, params) as any)
  } catch (e) {
    console.error('[PDF] 생성 실패:', e)
    return null
  }
}

/* ── 재직증명서 이메일 ───────────────────────────────────────── */
export async function sendEmploymentCertificateEmail(
  to: string,
  params: {
    docNumber:      string   // "제 26-0001 호"
    docType:        '재직증명서' | '경력증명서'
    employeeName:   string
    regNumber:      string | null   // 주민등록번호 (마스킹 처리)
    address:        string | null
    startDate:      string          // YYYY-MM-DD
    endDate:        string | null   // null → 현재
    purpose:        string | null
    department:     string | null
    position:       string | null
    companyName:    string
    representative: string | null
    companyAddress: string | null
    issuedDate:     string          // YYYY-MM-DD
    sealImageUrl?:  string | null
  },
): Promise<{ success: boolean; error?: string }> {
  const {
    docNumber, docType, employeeName, regNumber, address,
    startDate, endDate, purpose, department, position,
    companyName, representative, companyAddress, issuedDate,
    sealImageUrl,
  } = params

  const maskReg = (r: string | null) => {
    if (!r) return '—'
    const clean = r.replace(/-/g, '')
    if (clean.length >= 7) return `${clean.slice(0, 6)}-${clean[6]}******`
    return r
  }

  const fmtDate = (d: string | null) => {
    if (!d) return '현재'
    const [y, m, dd] = d.split('-')
    return `${y}년 ${parseInt(m)}월 ${parseInt(dd)}일`
  }

  const periodStr = `${fmtDate(startDate)} ~ ${fmtDate(endDate)}`
  const posStr    = [department, position].filter(Boolean).join(' / ') || '—'
  const isSuffix  = (posStr.endsWith('로') || posStr.endsWith('으로')) ? '' : (posStr.match(/[로으]$/) ? '' : ' (으)로')
  const [iy, im, id_] = issuedDate.split('-')
  const issuedStr = `${iy}년 ${parseInt(im)}월 ${parseInt(id_)}일`

  // PDF 생성 (실패해도 이메일은 발송)
  const pdfBuffer = await generateCertPdf({
    docNumber, docType, employeeName, regNumber, address,
    startDate, endDate, purpose, department, position,
    companyName, representative, companyAddress, issuedDate,
    sealImageUrl: sealImageUrl ?? null,
  })

  return sendRawEmail({
    to,
    subject: `[ModuHR] ${docType} 발급 안내 — ${companyName}`,
    attachments: pdfBuffer
      ? [{ filename: `${docType}_${employeeName}.pdf`, content: pdfBuffer }]
      : undefined,
    text: [
      docNumber,
      '',
      `【 ${docType} 】`,
      '',
      `성    명 : ${employeeName}`,
      `주민번호 : ${maskReg(regNumber)}`,
      `주    소 : ${address ?? '—'}`,
      `재직기간 : ${periodStr}`,
      `제출용도 : ${purpose ?? '—'}`,
      '',
      `상기인은 ${companyName}의 ${posStr}${isSuffix} 재직함을 증명합니다.`,
      '',
      issuedStr,
      '',
      `${companyName} 대표이사 ${representative ?? ''}`,
      companyAddress ?? '',
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap');
  body{font-family:'Noto Serif KR',Georgia,serif;background:#f0ede6;margin:0;padding:40px 16px}
  .cert{max-width:600px;margin:0 auto;background:white;border:2px solid #1a1a2e;padding:60px 64px}
  .doc-no{font-size:13px;color:#444;margin-bottom:40px}
  .title-wrap{text-align:center;border-bottom:3px double #1a1a2e;padding-bottom:20px;margin-bottom:40px}
  .title-ko{font-size:32px;font-weight:700;letter-spacing:6px;color:#1a1a2e;margin:0}
  .title-en{font-size:12px;letter-spacing:3px;color:#666;margin:6px 0 0}
  .field-table{width:100%;border-collapse:collapse;margin-bottom:36px}
  .field-table td{padding:10px 4px;vertical-align:top;font-size:14px;border-bottom:1px dotted #ddd}
  .field-table td:first-child{width:90px;color:#444;white-space:nowrap}
  .field-table td:last-child{color:#1a1a2e;font-weight:600}
  .stmt{text-align:center;font-size:15px;color:#1a1a2e;line-height:1.8;margin:36px 0}
  .issued-date{text-align:center;font-size:14px;color:#444;margin-bottom:32px}
  .sig-wrap{display:flex;align-items:flex-end;justify-content:flex-end;gap:12px;border-top:1px solid #ccc;padding-top:24px;margin-top:16px}
  .sig-text{text-align:right}
  .sig-name{font-size:18px;font-weight:700;color:#1a1a2e}
  .sig-title{font-size:12px;color:#666;margin-top:4px}
  .sig-addr{font-size:11px;color:#999;margin-top:6px}
  .sig-seal{display:inline-block;border:2px solid #C00000;padding:3px;color:#C00000;vertical-align:bottom;flex-shrink:0}
  .sig-seal-inner{border:1px solid #C00000;text-align:center;min-width:58px}
  .sig-seal-name{font-size:11px;font-weight:bold;padding:6px 4px 3px;line-height:1.3;white-space:pre-line}
  .sig-seal-label{font-size:9px;border-top:1px solid #C00000;padding:2px 4px}
  .footer{text-align:center;margin-top:32px;font-size:10px;color:#aaa;font-family:sans-serif}
</style>
</head>
<body>
<div class="cert">
  <p class="doc-no">${docNumber}</p>

  <div class="title-wrap">
    <h1 class="title-ko">${docType}</h1>
    <p class="title-en">CERTIFICATE OF ${docType === '재직증명서' ? 'EMPLOYMENT' : 'CAREER'}</p>
  </div>

  <table class="field-table">
    <tr><td>성&nbsp;&nbsp;&nbsp;&nbsp;명</td><td>${employeeName}</td></tr>
    <tr><td>주민번호</td><td>${maskReg(regNumber)}</td></tr>
    <tr><td>주&nbsp;&nbsp;&nbsp;&nbsp;소</td><td>${address ?? '—'}</td></tr>
    <tr><td>재직기간</td><td>${periodStr}</td></tr>
    <tr><td>제출용도</td><td>${purpose ?? '—'}</td></tr>
  </table>

  <p class="stmt">
    상기인은 <strong>${companyName}</strong>의<br>
    <strong>${posStr}</strong>${isSuffix} 재직함을 증명합니다.
  </p>

  <p class="issued-date">${issuedStr}</p>

  <div class="sig-wrap">
    <div class="sig-text">
      <p class="sig-name">${companyName}</p>
      <p class="sig-title">대표이사&nbsp;&nbsp;${representative ?? ''}</p>
      ${companyAddress ? `<p class="sig-addr">${companyAddress}</p>` : ''}
    </div>
    ${sealImageUrl
      ? `<img src="${sealImageUrl}" alt="직인" style="width:68px;height:68px;object-fit:contain;vertical-align:bottom;flex-shrink:0" />`
      : `<div class="sig-seal"><div class="sig-seal-inner"><div class="sig-seal-name">${companyName.replace(/(.{4})/g, '$1\n').trimEnd()}</div><div class="sig-seal-label">직인</div></div></div>`
    }
  </div>
</div>
<p class="footer">본 문서는 ModuHR를 통해 발급되었습니다.</p>
</body>
</html>`.trim(),
  })
}

/* ── 세무사 서류발급 요청 이메일 ─────────────────────────────── */
export async function sendTaxDocumentRequestEmail(
  to: string,
  params: {
    taxAccountantName:    string
    taxAccountantCompany: string | null
    employeeName:         string
    employeeEmail:        string
    employeeDepartment:   string | null
    employeePosition:     string | null
    companyName:          string
    documentType:         string
    purpose:              string | null
    note:                 string | null
    requestedAt:          string
  },
): Promise<{ success: boolean; error?: string }> {
  const {
    taxAccountantName, taxAccountantCompany,
    employeeName, employeeEmail, employeeDepartment, employeePosition,
    companyName, documentType, purpose, note, requestedAt,
  } = params

  const reqDate   = new Date(requestedAt).toLocaleDateString('ko-KR')
  const posStr    = [employeeDepartment, employeePosition].filter(Boolean).join(' / ') || null
  const greetOrg  = taxAccountantCompany ? `${taxAccountantCompany} ` : ''

  // note에서 "신청연도: YYYY, YYYY, ..." 추출
  const yearMatch = note?.match(/신청연도:\s*([\d,\s]+)/)
  const reqYear   = yearMatch?.[1]?.trim().replace(/\s*,\s*/g, ', ') ?? null
  const extraNote = note?.replace(/신청연도:\s*[\d,\s]+\n?/, '').trim() || null

  return sendRawEmail({
    to,
    subject: `[${companyName}] ${employeeName}님이 "${documentType}${reqYear ? ` — ${reqYear}년` : ''}"을 신청하였습니다.`,
    text: [
      `${greetOrg}${taxAccountantName} 담당자님,`,
      '',
      `${companyName} 소속 직원의 ${documentType} 발급을 요청드립니다.`,
      '',
      `  소속회사   : ${companyName}`,
      posStr ? `  부서/직급  : ${posStr}` : '',
      `  직원명     : ${employeeName}`,
      `  신청서류   : ${documentType}${reqYear ? ` (${reqYear}년)` : ''}`,
      `  제출용도   : ${purpose ?? '—'}`,
      `  신청일     : ${reqDate}`,
      extraNote ? `  메모       : ${extraNote}` : '',
      '',
      `아래의 이메일로 발급 부탁드립니다.`,
      `  회신 이메일: ${employeeEmail}`,
      '',
      '본 메일은 ModuHR에서 자동 발송되었습니다.',
    ].filter(Boolean).join('\n'),
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0f172a;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">서류발급 요청</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 6px">
        안녕하세요, ${greetOrg ? `<strong>${greetOrg}</strong>` : ''}<strong>${taxAccountantName}</strong> 담당자님.
      </p>
      <p style="color:#475569;font-size:14px;margin:0 0 28px;line-height:1.6">
        <strong>${companyName}</strong> 소속 직원의 서류 발급을 요청드립니다.
      </p>

      <!-- 신청 정보 -->
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;margin-bottom:20px">
        <p style="color:#0f172a;font-size:12px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:.05em">신청 정보</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;font-size:13px;padding:5px 0;width:90px">소속회사</td>
              <td style="color:#0f172a;font-size:13px;font-weight:600;padding:5px 0">${companyName}</td></tr>
          ${posStr ? `<tr><td style="color:#64748b;font-size:13px;padding:5px 0">부서/직급</td>
              <td style="color:#0f172a;font-size:13px;padding:5px 0">${posStr}</td></tr>` : ''}
          <tr><td style="color:#64748b;font-size:13px;padding:5px 0">직원명</td>
              <td style="color:#0f172a;font-size:13px;font-weight:600;padding:5px 0">${employeeName}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:5px 0">신청서류</td>
              <td style="color:#0f172a;font-size:13px;font-weight:700;padding:5px 0">${documentType}${reqYear ? `<span style="color:#64748b;font-weight:400"> (${reqYear}년)</span>` : ''}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:5px 0">제출용도</td>
              <td style="color:#0f172a;font-size:13px;padding:5px 0">${purpose ?? '—'}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:5px 0">신청일</td>
              <td style="color:#0f172a;font-size:13px;padding:5px 0">${reqDate}</td></tr>
          ${extraNote ? `<tr><td style="color:#64748b;font-size:13px;padding:5px 0">메모</td>
              <td style="color:#0f172a;font-size:13px;padding:5px 0">${extraNote}</td></tr>` : ''}
        </table>
      </div>

      <!-- 회신 이메일 강조 -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px 20px;margin-bottom:24px">
        <p style="color:#1e40af;font-size:12px;font-weight:700;margin:0 0 6px">아래의 이메일로 발급 부탁드립니다</p>
        <a href="mailto:${employeeEmail}"
           style="color:#2563eb;font-size:15px;font-weight:700;text-decoration:none">${employeeEmail}</a>
      </div>

      <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.7">
        본 이메일은 ModuHR에서 자동 발송되었습니다.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">© ModuHR · 본 메일은 발신 전용입니다.</p>
    </div>
  </div>
</body>
</html>`.trim(),
  })
}

/* ── 비밀번호 재설정 이메일 ──────────────────────────────────── */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string,
): Promise<{ success: boolean; error?: string }> {
  return sendRawEmail({
    to,
    subject: '[ModuHR] 비밀번호 재설정 안내',
    text: [
      `안녕하세요, ${name}님.`,
      ``,
      `아래 링크를 클릭하여 비밀번호를 재설정해주세요.`,
      ``,
      resetLink,
      ``,
      `링크는 1시간 동안 유효합니다.`,
      `본인이 요청하지 않은 경우 이 이메일을 무시하세요.`,
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#2563eb;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">비밀번호 재설정</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 6px">안녕하세요, <strong>${name}</strong>님.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 28px;line-height:1.6">
        비밀번호 재설정 요청이 접수되었습니다.<br>
        아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
      </p>
      <a href="${resetLink}"
         style="display:block;background:#2563eb;color:white;text-align:center;padding:15px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:24px">
        비밀번호 재설정하기 →
      </a>
      <div style="background:#f1f5f9;border-radius:10px;padding:14px 16px;margin-bottom:20px">
        <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7">
          버튼이 작동하지 않으면 아래 URL을 복사하여 브라우저에 붙여넣으세요.<br>
          <span style="color:#2563eb;word-break:break-all;font-size:11px">${resetLink}</span>
        </p>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.7">
        이 링크는 <strong>1시간</strong> 동안 유효합니다.<br>
        본인이 요청하지 않은 경우 이 이메일을 무시하세요.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">© ModuHR · 본 메일은 발신 전용입니다.</p>
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
    subject: '[ModuHR] 가입이 완료되었습니다',
    text: `환영합니다, ${name}님! ModuHR에 가입되었습니다.`,
    html: `<p>환영합니다, <strong>${name}</strong>님! ModuHR에 오신 것을 환영합니다.</p>`,
  })
}

/* ── 연차 신청 알림 (매니저 수신) ───────────────────────────── */
export async function sendLeaveRequestNotification(
  to: string,
  params: {
    managerName:  string
    employeeName: string
    leaveType:    string
    startDate:    string
    endDate:      string
    hours:        number
    reason:       string | null
  },
): Promise<{ success: boolean; error?: string }> {
  const { managerName, employeeName, leaveType, startDate, endDate, hours, reason } = params
  const typeLabel: Record<string, string> = {
    full_day: '연차(1일)', half_day_am: '오전 반차', half_day_pm: '오후 반차', hourly: '시간 연차',
  }
  const label    = typeLabel[leaveType] ?? leaveType
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const fmtDate  = (d: string) => new Date(d).toLocaleDateString('ko-KR')

  return sendRawEmail({
    to,
    subject: `[ModuHR] ${employeeName} 님의 연차 신청`,
    text: [
      `${managerName} 담당자님,`,
      ``,
      `${employeeName} 직원이 연차를 신청했습니다.`,
      ``,
      `  유형   : ${label}`,
      `  기간   : ${fmtDate(startDate)} ~ ${fmtDate(endDate)}`,
      `  시간   : ${hours}시간`,
      reason ? `  사유   : ${reason}` : '',
      ``,
      `아래 링크에서 승인 또는 반려해주세요:`,
      `${appUrl}/manager/leave`,
    ].filter(Boolean).join('\n'),
    html: `
<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#059669;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
      <p style="color:#a7f3d0;margin:4px 0 0;font-size:13px">연차 신청 알림</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 6px">안녕하세요, <strong>${managerName}</strong> 담당자님.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px"><strong>${employeeName}</strong> 직원이 연차를 신청했습니다.</p>
      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #bbf7d0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:60px">유형</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${label}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">기간</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${fmtDate(startDate)} ~ ${fmtDate(endDate)}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">시간</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${hours}시간</td></tr>
          ${reason ? `<tr><td style="color:#64748b;font-size:13px;padding:4px 0">사유</td><td style="color:#0f172a;font-size:13px;padding:4px 0">${reason}</td></tr>` : ''}
        </table>
      </div>
      <a href="${appUrl}/manager/leave" style="display:block;background:#059669;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:16px">
        승인 / 반려하기 →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:0">본 메일은 ModuHR에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body></html>`.trim(),
  })
}

/* ── 연차 승인 알림 (직원 수신) ─────────────────────────────── */
export async function sendLeaveApprovalEmail(
  to: string,
  params: {
    employeeName: string
    leaveType:    string
    startDate:    string
    endDate:      string
    hours:        number
  },
): Promise<{ success: boolean; error?: string }> {
  const { employeeName, leaveType, startDate, endDate, hours } = params
  const typeLabel: Record<string, string> = {
    full_day: '연차(1일)', half_day_am: '오전 반차', half_day_pm: '오후 반차', hourly: '시간 연차',
  }
  const label   = typeLabel[leaveType] ?? leaveType
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ko-KR')

  return sendRawEmail({
    to,
    subject: '[ModuHR] 연차 신청이 승인되었습니다',
    text: [
      `${employeeName} 님,`,
      ``,
      `연차 신청이 승인되었습니다.`,
      `  유형: ${label}`,
      `  기간: ${fmtDate(startDate)} ~ ${fmtDate(endDate)}`,
      `  시간: ${hours}시간`,
    ].join('\n'),
    html: `
<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#2563eb;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">연차 승인 완료</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 6px">안녕하세요, <strong>${employeeName}</strong> 님.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">연차 신청이 <strong style="color:#059669">승인</strong>되었습니다.</p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:60px">유형</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${label}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">기간</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${fmtDate(startDate)} ~ ${fmtDate(endDate)}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">차감</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${hours}시간</td></tr>
        </table>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0">본 메일은 ModuHR에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body></html>`.trim(),
  })
}

/* ── 연차 취소 알림 (매니저 수신, 승인된 연차를 직원이 취소 시) ── */
export async function sendLeaveCancellationNotification(
  to: string,
  params: {
    managerName:  string
    employeeName: string
    leaveType:    string
    startDate:    string
    endDate:      string
    hours:        number
  },
): Promise<{ success: boolean; error?: string }> {
  const { managerName, employeeName, leaveType, startDate, endDate, hours } = params
  const typeLabel: Record<string, string> = {
    full_day: '연차(1일)', half_day_am: '오전 반차', half_day_pm: '오후 반차', hourly: '시간 연차',
  }
  const label    = typeLabel[leaveType] ?? leaveType
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const fmtDate  = (d: string) => new Date(d).toLocaleDateString('ko-KR')

  return sendRawEmail({
    to,
    subject: `[ModuHR] ${employeeName} 님이 승인된 연차를 취소했습니다`,
    text: [
      `${managerName} 담당자님,`,
      ``,
      `${employeeName} 직원이 승인된 연차를 취소했습니다. 잔액이 자동으로 복원되었습니다.`,
      ``,
      `  유형 : ${label}`,
      `  기간 : ${fmtDate(startDate)} ~ ${fmtDate(endDate)}`,
      `  시간 : ${hours}시간`,
      ``,
      `자세한 내용은 아래 링크에서 확인하세요:`,
      `${appUrl}/manager/leave`,
    ].join('\n'),
    html: `
<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#f59e0b;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
      <p style="color:#fef3c7;margin:4px 0 0;font-size:13px">연차 취소 알림</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 6px">안녕하세요, <strong>${managerName}</strong> 담당자님.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        <strong>${employeeName}</strong> 직원이 승인된 연차를 취소했습니다.<br>
        연차 잔액이 자동으로 복원되었습니다.
      </p>
      <div style="background:#fffbeb;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #fde68a">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:60px">유형</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${label}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">기간</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${fmtDate(startDate)} ~ ${fmtDate(endDate)}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">복원</td><td style="color:#059669;font-size:13px;font-weight:600;padding:4px 0">+${hours}시간</td></tr>
        </table>
      </div>
      <a href="${appUrl}/manager/leave" style="display:block;background:#f59e0b;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:16px">
        연차 현황 확인하기 →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:0">본 메일은 ModuHR에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body></html>`.trim(),
  })
}

/* ── 연차 반려 알림 (직원 수신) ─────────────────────────────── */
export async function sendLeaveRejectionEmail(
  to: string,
  params: {
    employeeName: string
    leaveType:    string
    startDate:    string
    endDate:      string
    hours:        number
    reason:       string
  },
): Promise<{ success: boolean; error?: string }> {
  const { employeeName, leaveType, startDate, endDate, hours, reason } = params
  const typeLabel: Record<string, string> = {
    full_day: '연차(1일)', half_day_am: '오전 반차', half_day_pm: '오후 반차', hourly: '시간 연차',
  }
  const label   = typeLabel[leaveType] ?? leaveType
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ko-KR')

  return sendRawEmail({
    to,
    subject: '[ModuHR] 연차 신청이 반려되었습니다',
    text: [
      `${employeeName} 님,`,
      ``,
      `연차 신청이 반려되었습니다.`,
      `  유형  : ${label}`,
      `  기간  : ${fmtDate(startDate)} ~ ${fmtDate(endDate)}`,
      `  시간  : ${hours}시간`,
      `  사유  : ${reason}`,
    ].join('\n'),
    html: `
<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#dc2626;padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700">ModuHR</h1>
      <p style="color:#fecaca;margin:4px 0 0;font-size:13px">연차 반려 안내</p>
    </div>
    <div style="padding:32px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 6px">안녕하세요, <strong>${employeeName}</strong> 님.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">연차 신청이 <strong style="color:#dc2626">반려</strong>되었습니다.</p>
      <div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #fecaca">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:60px">유형</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${label}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">기간</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${fmtDate(startDate)} ~ ${fmtDate(endDate)}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">시간</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${hours}시간</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">반려사유</td><td style="color:#dc2626;font-size:13px;font-weight:600;padding:4px 0">${reason}</td></tr>
        </table>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0">문의사항은 담당 매니저에게 연락해주세요.</p>
    </div>
  </div>
</body></html>`.trim(),
  })
}
