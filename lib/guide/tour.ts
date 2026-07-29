/* ================================================================
   첫 로그인 코치마크 투어 정의
   targets — 화면 요소의 data-tour 값. 여러 개면 먼저 발견된(보이는) 것 사용
             (데스크톱 사이드바 / 모바일 하단탭 대응)
   targets 없으면 화면 중앙 안내 카드로 표시
================================================================ */

export const TOUR_VERSION = 'v1'

export interface TourStep {
  targets?: string[]
  title: string
  body: string
  /** 마지막 단계 — 사용 설명서로 이동하는 버튼 표시 */
  final?: boolean
}

export function tourStorageKey(role: 'manager' | 'employee', userId: string) {
  return `moduhr:tour:${TOUR_VERSION}:${role}:${userId}`
}

const MANAGER_TOUR: TourStep[] = [
  {
    title: 'ModuHR에 오신 것을 환영합니다 👋',
    body: '기업담당자 화면의 핵심 기능을 30초만 안내해 드릴게요. 언제든 [건너뛰기]로 닫을 수 있습니다.',
  },
  {
    targets: ['manager-stats'],
    title: '한눈에 보는 요약',
    body: '재직 직원 수와 최근 급여월입니다. 카드를 클릭하면 해당 메뉴로 바로 이동합니다.',
  },
  {
    targets: ['manager-requests'],
    title: '처리할 일은 모두 여기에',
    body: '직원 등록 대기, 연차 신청, 증명서 신청이 모입니다. 빨간 숫자는 처리해야 할 건수이고, [전체 ›]를 누르면 관리 화면으로 이동합니다.',
  },
  {
    targets: ['manager-create-employee'],
    title: '직원 등록하기',
    body: '신규 직원은 여기서 등록합니다. 등록 후 직원 상세에서 [초대 메일 발송]을 하면 직원이 직접 가입합니다.',
  },
  {
    targets: ['manager-view-toggle'],
    title: '관리자 / 직원 화면 전환',
    body: '[직원 화면]을 누르면 담당자 본인의 급여·연차·출퇴근을 직원 입장에서 사용할 수 있습니다.',
  },
  {
    targets: ['nav:/manager/employees'],
    title: '직원관리',
    body: '직원 정보 수정, 계정 초대, 퇴사 처리, 퇴사자 조회를 이 메뉴에서 합니다.',
  },
  {
    targets: ['nav:/manager/payroll'],
    title: '급여조회',
    body: '월별 급여대장과 직원별 급여명세서를 확인합니다. 급여는 지급월이 아닌 “귀속월” 기준으로 조회합니다.',
  },
  {
    targets: ['nav:/manager/leave'],
    title: '연차관리',
    body: '연차 신청 승인·반려, 직원별 잔여 연차 확인, 연차 정책 설정을 할 수 있습니다.',
  },
  {
    targets: ['nav:/manager/attendance'],
    title: '근태관리',
    body: '직원 출퇴근 기록과 월별 집계를 확인하고, 출근 시각·위치·알림을 설정합니다.',
  },
  {
    targets: ['nav:/manager/documents'],
    title: '서류관리',
    body: '직원이 신청한 재직증명서·원천징수영수증 등을 승인하면 자동으로 발급 메일이 발송됩니다.',
  },
  {
    targets: ['guide-entry', 'nav:/guide'],
    title: '자세한 사용법은 사용 설명서에서',
    body: '모든 화면의 사용법이 화면 그림과 번호 설명으로 정리되어 있습니다. 지금 [사용 설명서]를 클릭해 확인해 보세요.',
    final: true,
  },
]

const EMPLOYEE_TOUR: TourStep[] = [
  {
    title: 'ModuHR에 오신 것을 환영합니다 👋',
    body: '내 급여·연차·출퇴근을 직접 확인하는 서비스입니다. 주요 기능을 30초만 안내해 드릴게요.',
  },
  {
    targets: ['employee-attendance'],
    title: '출퇴근은 버튼 한 번',
    body: '오늘 상태가 표시되고, [출근하기] / [퇴근하기] 버튼으로 바로 기록됩니다.',
  },
  {
    targets: ['employee-notices'],
    title: '내 알림 확인',
    body: '급여명세서 발급, 연차 승인, 서류 처리 결과가 여기에 표시됩니다. 빨간 알림은 근태 미입력이니 꼭 입력해 주세요.',
  },
  {
    targets: ['nav:/employee/payslips'],
    title: '급여',
    body: '월별 급여명세서에서 지급·공제 상세와 실수령액을 확인하고 PDF로 저장할 수 있습니다.',
  },
  {
    targets: ['nav:/employee/leave'],
    title: '연차',
    body: '잔여 연차를 확인하고 연차·반차를 신청합니다. 신청 결과와 반려 사유도 여기서 확인합니다.',
  },
  {
    targets: ['nav:/employee/documents'],
    title: '서류신청',
    body: '재직증명서·경력증명서·원천징수영수증 등을 신청하면 담당자 승인 후 이메일로 발송됩니다.',
  },
  {
    targets: ['nav:/employee/attendance'],
    title: '출퇴근',
    body: '주간·월간 근무시간 집계를 보고, 빠뜨린 날은 소급 입력할 수 있습니다. 알림도 여기서 신청합니다.',
  },
  {
    targets: ['nav:/employee/profile'],
    title: '내 정보',
    body: '전화번호 수정, 이메일 변경, 비밀번호 변경을 할 수 있습니다.',
  },
  {
    targets: ['guide-entry', 'nav:/guide'],
    title: '자세한 사용법은 사용 설명서에서',
    body: '모든 화면의 사용법이 화면 그림과 번호 설명으로 정리되어 있습니다. 지금 [사용 설명서]를 클릭해 확인해 보세요.',
    final: true,
  },
]

export const TOUR_STEPS: Record<'manager' | 'employee', TourStep[]> = {
  manager:  MANAGER_TOUR,
  employee: EMPLOYEE_TOUR,
}
