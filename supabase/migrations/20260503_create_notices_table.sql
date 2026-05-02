CREATE TABLE IF NOT EXISTS notices (
  id         BIGSERIAL    PRIMARY KEY,
  title      TEXT         NOT NULL,
  content    TEXT         NOT NULL,
  created_by UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can manage notices" ON notices;
CREATE POLICY "admin can manage notices"
  ON notices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "authenticated can read notices" ON notices;
CREATE POLICY "authenticated can read notices"
  ON notices FOR SELECT
  TO authenticated
  USING (true);
