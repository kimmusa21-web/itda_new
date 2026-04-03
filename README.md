# itda — 급여관리 SaaS

B2B 급여명세서 관리 서비스입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **상태관리**: React Server Components + Server Actions

## 사용자 역할

| 역할 | 설명 |
|---|---|
| `admin` | 전체 관리, 가입신청 승인/거절, CSV 업로드 |
| `manager` | 소속 회사 직원 관리, 가입신청 등록 |
| `employee` | 본인 급여명세서 조회 |

## 주요 기능

- **어드민**: 직원 가입신청 승인/거절 워크플로우
- **어드민**: 급여 CSV 업로드 (회사별 컬럼 매핑)
- **직원**: 월별 급여명세서 목록 및 상세 조회 (금액 보안 정책 적용)

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일에 Supabase URL과 Key를 입력하세요

# 3. 개발 서버 실행
npm run dev
```

## 환경변수

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # 서버 전용
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 주요 페이지

| 경로 | 설명 |
|---|---|
| `/login` | 로그인 |
| `/admin/employee-requests` | 직원 가입신청 승인/거절 |
| `/admin/payroll/upload` | 급여 CSV 업로드 |
| `/employee/payslips` | 내 급여명세서 목록 |
| `/employee/payslips/[id]` | 급여명세서 상세 |

## DB 구조

Supabase 프로젝트 ID: `ayepxdoshnmxzfdxyztp`

주요 테이블: `companies`, `profiles`, `employees`, `employee_requests`, `pay_info_v2`, `upload_logs`, `column_mappings`
