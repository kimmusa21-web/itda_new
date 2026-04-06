# itda — 급여관리 SaaS

직원의 급여명세서를 디지털로 관리하는 B2B SaaS입니다.

## 서비스 구조

```
어드민      → 직원 가입신청 승인/거절 + 급여 CSV 업로드
기업담당자  → 직원 가입신청 등록
직원        → 본인 급여명세서 조회
```

## 기술 스택

| 구분 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 백엔드/DB | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel |

---

## 로컬 개발 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/kimmusa21-web/itda3rd.git
cd itda3rd
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 Supabase 값을 입력하세요:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Supabase 키 확인: [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 선택 → Settings → API

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 주요 화면

| 경로 | 역할 | 접근 권한 |
|---|---|---|
| `/login` | 로그인 | 전체 |
| `/admin/employee-requests` | 직원 가입신청 승인/거절 | admin |
| `/admin/payroll/upload` | 급여 CSV 업로드 | admin |
| `/employee/payslips` | 내 급여명세서 목록 | employee |
| `/employee/payslips/[id]` | 급여명세서 상세 | employee |

---

## 배포 (Vercel)

이 프로젝트는 GitHub 연동으로 **자동 배포**됩니다.

```
main 브랜치 push → 프로덕션 자동 배포
다른 브랜치 push → Preview URL 자동 생성
```

### Vercel 환경변수 설정

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에 아래 4개 추가:

| 변수명 | 예시 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

---

## 수정 후 배포하는 방법

```bash
# 코드 수정 후
git add .
git commit -m "변경 내용 설명"
git push origin main
# → Vercel이 자동으로 빌드 및 배포
```

---

## 명령어 정리

```bash
npm run dev        # 로컬 개발 서버 (http://localhost:3000)
npm run build      # 빌드 테스트 (배포 전 확인용)
npm run lint       # 코드 린트 검사
npm run type-check # TypeScript 타입 오류 확인
npm run check      # 타입 체크 + 린트 한 번에
```

---

## DB 구조 (Supabase)

| 테이블 | 역할 |
|---|---|
| `companies` | 고객 기업 정보 |
| `profiles` | 로그인 계정 (역할·소속) |
| `employees` | 직원 인사 정보 |
| `employee_requests` | 직원 가입신청 워크플로우 |
| `pay_info_v2` | 월별 급여명세서 (JSONB) |
| `upload_logs` | CSV 업로드 이력 |
| `column_mappings` | 회사별 CSV↔DB 컬럼 매핑 |

---

## 역할별 초기 로그인 테스트

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| admin | kimmusa21@gmail.com | Supabase에서 설정 |
| employee | (직원 이메일) | (초대 이메일로 설정) |

> 직원은 어드민이 가입신청 승인 후 초대 이메일로 비밀번호를 설정합니다.
