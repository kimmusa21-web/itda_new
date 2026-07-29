import webpush from 'web-push'

export interface PushPayload {
  title: string
  body:  string
  url?:  string
}

/** setVapidDetails 결과 캐시 (null = 아직 시도 안 함) */
let vapidReady: boolean | null = null

/**
 * VAPID 설정을 첫 발송 시점에 지연 초기화한다.
 * 모듈 로드 시점에 호출하면 키가 없는 환경(Preview 빌드 등)에서
 * next build의 page data 수집 단계가 통째로 실패한다.
 */
function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady

  const subject    = process.env.VAPID_SUBJECT
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) {
    console.error('[push] VAPID 환경변수가 없어 푸시 발송을 건너뜁니다')
    vapidReady = false
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidReady = true
  return true
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<boolean> {
  if (!ensureVapid()) return false

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    )
    return true
  } catch (err: any) {
    // 410 Gone = 구독 만료 (브라우저에서 삭제됨)
    if (err.statusCode === 410) return false
    console.error('[push] 발송 실패:', err.message)
    return false
  }
}
