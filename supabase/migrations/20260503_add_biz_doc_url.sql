-- 사업자등록증 파일 URL 컬럼 추가
ALTER TABLE company_admin_requests
  ADD COLUMN IF NOT EXISTS biz_doc_url TEXT;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS biz_doc_url TEXT;

-- Storage 버킷: biz-docs (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'biz-docs',
  'biz-docs',
  true,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service_role can upload biz docs" ON storage.objects;
CREATE POLICY "service_role can upload biz docs"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'biz-docs');

DROP POLICY IF EXISTS "public can read biz docs" ON storage.objects;
CREATE POLICY "public can read biz docs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'biz-docs');
