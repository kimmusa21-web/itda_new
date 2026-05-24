-- 웹 푸시 구독 정보 저장
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           SERIAL PRIMARY KEY,
  employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  endpoint     TEXT    NOT NULL,
  p256dh       TEXT    NOT NULL,
  auth         TEXT    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_employee_id ON push_subscriptions(employee_id);

-- 퇴근 알림 발송 여부 추적 (중복 발송 방지)
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS checkout_reminded_at TIMESTAMPTZ;
