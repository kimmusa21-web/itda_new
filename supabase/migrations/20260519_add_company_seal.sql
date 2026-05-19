-- 회사 직인 이미지 URL 컬럼 추가
-- NULL = 회사명 기반 자동 생성 직인 사용
-- URL = 커스텀 업로드 이미지 사용
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS seal_image_url TEXT;

COMMENT ON COLUMN companies.seal_image_url IS '회사 직인 이미지 URL. NULL이면 회사명으로 자동 생성된 직인을 사용.';
