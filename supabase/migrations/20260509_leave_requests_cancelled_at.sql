ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leave_requests_cancelled
  ON leave_requests(company_id, cancelled_at DESC)
  WHERE cancelled_at IS NOT NULL;
