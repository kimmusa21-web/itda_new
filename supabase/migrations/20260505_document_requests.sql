-- ================================================================
-- 서류신청 기능
-- 1. companies에 세무사/회계사 정보 컬럼 추가
-- 2. document_requests 테이블 생성 + RLS
-- ================================================================

-- ── 1. 세무사 정보 ────────────────────────────────────────────
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tax_accountant_company text,
  ADD COLUMN IF NOT EXISTS tax_accountant_name    text,
  ADD COLUMN IF NOT EXISTS tax_accountant_email   text;

-- ── 2. 서류신청 테이블 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_requests (
  id               bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  company_id       int    NOT NULL REFERENCES public.companies(id)  ON DELETE CASCADE,
  employee_id      bigint NOT NULL REFERENCES public.employees(id)  ON DELETE CASCADE,
  document_type    text   NOT NULL CHECK (document_type IN (
                     'employment_certificate',
                     'career_certificate',
                     'withholding_tax',
                     'income_certificate',
                     'health_insurance_certificate',
                     'other'
                   )),
  purpose          text,          -- 제출용도
  address          text,          -- 주소 (증명서 기재용)
  note             text,          -- 직원 메모
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  approved_at      timestamptz,
  rejected_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- 직원: 자신의 신청 조회/생성
CREATE POLICY "doc_req_employee_select" ON public.document_requests
  FOR SELECT USING (employee_id = public.get_my_employee_id());

CREATE POLICY "doc_req_employee_insert" ON public.document_requests
  FOR INSERT WITH CHECK (employee_id = public.get_my_employee_id());

-- 매니저: 자기 회사 신청 조회/수정
CREATE POLICY "doc_req_manager_select" ON public.document_requests
  FOR SELECT USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() = 'manager'
  );

CREATE POLICY "doc_req_manager_update" ON public.document_requests
  FOR UPDATE USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() = 'manager'
  );

-- 어드민: 전체 접근
CREATE POLICY "doc_req_admin_all" ON public.document_requests
  FOR ALL USING (public.is_admin());
