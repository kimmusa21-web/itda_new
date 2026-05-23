ALTER TABLE company_admin_requests
  ADD COLUMN IF NOT EXISTS requested_features JSONB;
