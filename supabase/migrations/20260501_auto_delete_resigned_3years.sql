-- ================================================================
-- itda: 퇴사자 데이터 3년 보존 정책 — pg_cron 자동 삭제
-- 매일 새벽 3시, quit_date 기준 3년 경과 퇴사자 레코드 삭제
-- 전제: Supabase Dashboard > Database > Extensions > pg_cron 활성화 필요
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'auto-delete-resigned-3years',
  '0 3 * * *',
  $$
    DELETE FROM public.employees
    WHERE is_active = false
      AND quit_date IS NOT NULL
      AND quit_date <= (CURRENT_DATE - INTERVAL '3 years');
  $$
);
