import { BookOpen, Search, Upload, MapPin } from 'lucide-react'
import {
  Shot, Mark, WithNav, MHead, MCard, MBtn, MField, MRow, MStat, MTabs, MBadge, MTable,
} from './mock'
import type { GuideStep } from './types'

const NAV = ['홈', '기업관리', '직원관리', '급여조회', '서류관리', '연차관리', '근태관리', '내 정보', '사용 설명서']

/* ================================================================
   매니저(기업담당자) 사용설명서
================================================================ */
export const MANAGER_STEPS: GuideStep[] = [
  /* ── 1. 로그인 ── */
  {
    id: 'login',
    title: '로그인 · 비밀번호 재설정',
    path: 'moduhr.app/login',
    screen: (
      <Shot url="moduhr.app/login">
        <div className="mx-auto max-w-[230px] space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-center text-[11px] font-bold text-slate-900">ModuHR</p>
          <p className="pb-1 text-center text-[8px] text-slate-400">기업담당자 로그인</p>
          <Mark n={1}><MField label="이메일" value="manager@company.co.kr" /></Mark>
          <Mark n={2}><MField label="비밀번호" value="••••••••" /></Mark>
          <Mark n={3}><MBtn tone="navy" full>로그인</MBtn></Mark>
          <Mark n={4}>
            <p className="text-center text-[8.5px] text-slate-400">비밀번호를 잊으셨나요?</p>
          </Mark>
        </div>
      </Shot>
    ),
    notes: [
      { text: '초대 메일을 받은 회사 이메일 주소를 입력합니다.' },
      {
        text: '비밀번호를 입력합니다 (8자 이상).',
        strong: true,
        sub: ['※ 최초 1회는 반드시 초대 메일의 [가입 완료하기] 링크에서 비밀번호를 먼저 설정해야 로그인이 됩니다.'],
      },
      { text: '[로그인] 클릭 → 기업담당자 대시보드로 이동합니다.' },
      {
        text: '비밀번호를 잊었을 때 클릭 → 입력한 이메일로 재설정 링크가 발송됩니다.',
        sub: ['재설정 링크는 발송 후 1시간 동안만 유효합니다.'],
      },
    ],
    tip: '초대 메일이 보이지 않으면 스팸함을 확인하고, 그래도 없으면 시스템 관리자에게 재발송을 요청하세요.',
  },

  /* ── 2. 대시보드 ── */
  {
    id: 'dashboard',
    title: '대시보드(홈) 한눈에 보기',
    path: '홈',
    screen: (
      <Shot url="moduhr.app/manager">
        <WithNav nav={NAV} active="홈">
          <Mark n={1}><MTabs items={['관리자 화면', '직원 화면']} active="관리자 화면" /></Mark>
          <MHead
            sub="브이에이성형외과"
            title="대시보드"
            right={<Mark n={2}><MBtn>+ 직원 등록</MBtn></Mark>}
          />
          <Mark n={3}>
            <div className="grid grid-cols-2 gap-1.5">
              <MStat label="재직 직원" value="24" unit="명" />
              <MStat label="최근 급여월" value="2026년 6월" />
            </div>
          </Mark>
          <Mark n={4}>
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold text-slate-700">
                신청 현황
                <MBadge tone="red">3건 대기</MBadge>
              </p>
              <MCard title="직원 등록 대기" right="전체 ›">
                <MRow name="김서연" sub="seoyeon@company.co.kr" right={<MBadge tone="indigo">가입 대기</MBadge>} />
              </MCard>
              <MCard title="연차 신청" right="전체 ›">
                <MRow name="박민수" sub="2026-08-03 ~ 08-04 (16h)" tone="emerald" right={<MBadge tone="green">승인 대기</MBadge>} />
              </MCard>
              <MCard title="증명서 신청" right="전체 ›">
                <MRow name="이지훈" sub="재직증명서" tone="amber" right={<MBadge tone="amber">처리 대기</MBadge>} />
              </MCard>
            </div>
          </Mark>
          <Mark n={5}>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
              <BookOpen size={12} className="text-blue-600" />
              <span className="text-[9px] font-medium text-slate-800">서비스 사용 설명서</span>
              <span className="ml-auto text-[9px] text-slate-300">›</span>
            </div>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      {
        text: '관리자 화면 / 직원 화면 전환 탭입니다.',
        sub: ['[직원 화면]을 누르면 담당자 본인의 급여·연차·출퇴근을 직원 입장에서 사용할 수 있습니다.'],
      },
      { text: '[+ 직원 등록] — 신규 직원을 바로 등록합니다.' },
      {
        text: '재직 직원 수와 최근 급여월 요약입니다. 카드를 클릭하면 해당 메뉴로 이동합니다.',
      },
      {
        text: '신청 현황 — 처리해야 할 일이 모두 모여 있는 영역입니다.',
        strong: true,
        sub: [
          '직원 등록 대기 : 초대는 보냈지만 아직 가입하지 않은 직원',
          '연차 신청 / 연차 취소 알림 : 승인·확인이 필요한 연차',
          '증명서 신청 : 발급 처리가 필요한 서류',
          '각 카드의 [전체 ›]를 누르면 해당 관리 화면으로 이동합니다.',
        ],
      },
      { text: '서비스 사용 설명서 — 지금 보고 있는 이 문서로 이동합니다.' },
    ],
    tip: '왼쪽 사이드바가 전체 메뉴입니다. 회사에서 사용하지 않는 기능(급여·연차·근태·서류)은 메뉴에 표시되지 않습니다.',
  },

  /* ── 3. 직원 등록 ── */
  {
    id: 'employee-create',
    title: '직원 등록하기',
    path: '홈 › 직원관리 › 직원 등록',
    screen: (
      <Shot url="moduhr.app/manager/employees/create">
        <WithNav nav={NAV} active="직원관리">
          <MHead title="직원 등록" sub="홈 › 직원관리" />
          <Mark n={1}>
            <MCard title="기본 정보">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="이름 *" value="김서연" />
                <MField label="이메일 *" value="seoyeon@company.co.kr" />
                <MField label="주민등록번호" value="900101-1******" />
                <MField label="휴대전화" value="010-1234-5678" />
              </div>
            </MCard>
          </Mark>
          <Mark n={2}>
            <MCard title="소속 · 근무 정보">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="입사일 *" value="2026-08-01" />
                <MField label="고용 형태" value="정규직" />
                <MField label="부서" value="진료팀" />
                <MField label="직책" value="간호사" />
              </div>
            </MCard>
          </Mark>
          <Mark n={3}>
            <MCard title="급여 정보">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="급여 형태" value="월급" />
                <MField label="기본급" value="3,000,000" />
              </div>
            </MCard>
          </Mark>
          <div className="flex gap-1.5">
            <Mark n={4} className="flex-1"><MBtn full>저장</MBtn></Mark>
            <Mark n={5} className="flex-1">
              <MBtn tone="secondary" full><Upload size={9} className="mr-1" />CSV 대량 등록</MBtn>
            </Mark>
          </div>
        </WithNav>
      </Shot>
    ),
    notes: [
      {
        text: '기본 정보 — 이름과 이메일은 필수입니다.',
        strong: true,
        sub: ['이메일은 직원 계정 아이디가 되므로 본인이 실제로 사용하는 주소를 입력하세요.'],
      },
      { text: '소속 · 근무 정보 — 입사일, 고용 형태, 부서, 직책을 입력합니다. 입사일은 연차 발생 기준이 됩니다.' },
      { text: '급여 정보 — 급여 형태(월급/시급/일급)와 금액을 입력합니다.' },
      { text: '[저장] 클릭 → 직원 목록에 등록됩니다. (이 시점에는 아직 계정 초대가 발송되지 않습니다.)' },
      { text: '직원이 많을 때는 [CSV 대량 등록]으로 한 번에 등록할 수 있습니다. 화면의 표준 양식을 내려받아 사용하세요.' },
    ],
    warn: '주민등록번호는 급여·4대보험 처리에만 사용되며 화면에서는 뒤 6자리가 마스킹되어 표시됩니다.',
  },

  /* ── 4. 직원 목록 · 초대 · 퇴사 ── */
  {
    id: 'employees',
    title: '직원 목록 · 계정 초대 · 퇴사 처리',
    path: '홈 › 직원관리',
    screen: (
      <Shot url="moduhr.app/manager/employees">
        <WithNav nav={NAV} active="직원관리">
          <MHead title="직원관리" sub="재직 24명" right={<MBtn>+ 직원 등록</MBtn>} />
          <Mark n={1}>
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
              <Search size={9} className="text-slate-400" />
              <span className="text-[8.5px] text-slate-300">이름 · 부서 검색</span>
            </div>
          </Mark>
          <Mark n={2}><MTabs items={['재직자', '퇴사자']} active="재직자" /></Mark>
          <div className="space-y-1.5">
            <Mark n={3}>
              <MCard>
                <MRow name="김서연" sub="진료팀 · 간호사" tone="blue" right={<MBadge tone="indigo">초대 대기</MBadge>} />
              </MCard>
            </Mark>
            <MCard>
              <MRow name="박민수" sub="원무팀 · 팀장" tone="blue" right={<MBadge tone="green">가입완료</MBadge>} />
            </MCard>
          </div>
          <Mark n={4}>
            <MCard title="김서연 상세">
              <div className="flex flex-wrap gap-1">
                <MBtn tone="secondary">정보 수정</MBtn>
                <MBtn>초대 메일 발송</MBtn>
                <MBtn tone="danger">퇴사 처리</MBtn>
              </div>
            </MCard>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '이름 · 부서로 직원을 검색합니다.' },
      { text: '재직자 / 퇴사자 탭으로 목록을 구분해 조회합니다.' },
      {
        text: '계정 상태 배지로 가입 여부를 확인합니다.',
        sub: ['초대 대기 : 아직 초대 메일을 받지 않았거나 가입 전', '가입완료 : 직원이 직접 로그인해 사용 중'],
      },
      {
        text: '직원 행을 클릭하면 상세가 열리고, 여기서 3가지 작업을 합니다.',
        strong: true,
        sub: [
          '정보 수정 : 부서·직책·급여 정보 변경',
          '초대 메일 발송 : 직원에게 가입 링크 발송 (링크 24시간 유효)',
          '퇴사 처리 : 퇴사일·퇴사 사유 입력 후 저장',
        ],
      },
    ],
    warn: '퇴사 처리된 직원은 즉시 로그인할 수 없게 되며 퇴사자 탭으로 이동합니다. 퇴사일을 잘못 입력하면 연차·급여 정산에 영향을 주므로 확인 후 저장하세요.',
  },

  /* ── 5. 급여 조회 ── */
  {
    id: 'payroll',
    title: '급여 조회 (월별 급여대장)',
    path: '홈 › 급여조회',
    featureKeys: ['payroll'],
    screen: (
      <Shot url="moduhr.app/manager/payroll">
        <WithNav nav={NAV} active="급여조회">
          <MHead title="급여 조회" sub="브이에이성형외과" />
          <div className="flex gap-1.5">
            <Mark n={1} className="flex-1">
              <MField label="귀속월 선택" value="2026년 06월" />
            </Mark>
            <Mark n={2} className="flex-1">
              <MField label="직원 검색" placeholder="직원명 · 이메일" />
            </Mark>
          </div>
          <Mark n={3}>
            <div className="grid grid-cols-3 gap-1.5">
              <MStat label="총 지급합계" value="72,450,000" />
              <MStat label="총 공제합계" value="8,120,300" />
              <MStat label="총 실수령액" value="64,329,700" />
            </div>
          </Mark>
          <Mark n={4}>
            <MTable
              cols={['직원', '지급합계', '공제합계', '실수령액']}
              rows={[
                ['김서연', '3,000,000', '286,400', '2,713,600'],
                ['박민수', '4,200,000', '451,900', '3,748,100'],
                ['이지훈', '2,800,000', '243,100', '2,556,900'],
              ]}
            />
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      {
        text: '귀속월을 선택합니다.',
        strong: true,
        sub: ['급여는 “지급월”이 아니라 “귀속월” 기준으로 관리됩니다. 예: 6월 귀속 급여 → 7월 15일 지급'],
      },
      { text: '직원명 · 이메일로 특정 직원의 급여만 걸러 볼 수 있습니다.' },
      { text: '선택한 월의 총 지급합계 · 총 공제합계 · 총 실수령액 요약입니다.' },
      { text: '직원별 급여 목록입니다. 행을 클릭하면 해당 직원의 급여명세서 상세로 이동합니다.' },
    ],
    tip: '급여 데이터 등록(업로드)은 세무 담당 관리자가 진행합니다. 금액이 보이지 않거나 수정이 필요하면 담당자에게 요청해 주세요.',
  },

  /* ── 6. 급여명세서 상세 ── */
  {
    id: 'payslip-detail',
    title: '직원 급여명세서 상세 확인',
    path: '홈 › 급여조회 › 월 선택 › 직원 선택',
    featureKeys: ['payroll'],
    screen: (
      <Shot url="moduhr.app/manager/payroll/2026-06/employees/12">
        <WithNav nav={NAV} active="급여조회">
          <Mark n={1}>
            <MHead title="급여명세서" sub="‹ 2026년 06월 급여대장 · 김서연" />
          </Mark>
          <Mark n={2}>
            <MCard title="지급 항목">
              <MTable
                cols={['항목', '금액']}
                rows={[['기본급', '2,700,000'], ['식대(비과세)', '200,000'], ['연장근로수당', '100,000']]}
              />
            </MCard>
          </Mark>
          <Mark n={3}>
            <MCard title="공제 항목">
              <MTable
                cols={['항목', '금액']}
                rows={[['국민연금', '121,500'], ['건강보험', '95,800'], ['소득세', '54,300']]}
              />
            </MCard>
          </Mark>
          <Mark n={4}>
            <div className="flex items-center justify-between rounded-lg bg-[#003366] px-2 py-1.5">
              <span className="text-[9px] text-white/70">실수령액</span>
              <span className="text-[11px] font-bold text-white">2,713,600원</span>
            </div>
          </Mark>
          <Mark n={5} inline>
            <MBtn tone="secondary">인쇄 / PDF 저장</MBtn>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '상단 경로를 클릭하면 해당 월 급여대장으로 돌아갑니다.' },
      { text: '지급 항목 — 기본급, 각종 수당, 비과세 항목이 표시됩니다.' },
      { text: '공제 항목 — 4대 보험, 소득세·지방소득세 등이 표시됩니다.' },
      { text: '실수령액 = 지급합계 − 공제합계 입니다.' },
      { text: '[인쇄 / PDF 저장]으로 명세서를 파일로 보관할 수 있습니다.' },
    ],
    tip: '직원은 같은 명세서를 [급여] 메뉴에서 직접 조회합니다. 별도 발송 없이도 등록되면 바로 확인 가능합니다.',
  },

  /* ── 7. 연차 승인 ── */
  {
    id: 'leave',
    title: '연차 승인 · 반려',
    path: '홈 › 연차관리',
    featureKeys: ['leave'],
    screen: (
      <Shot url="moduhr.app/manager/leave">
        <WithNav nav={NAV} active="연차관리">
          <MHead title="연차 / 서류" sub="브이에이성형외과" />
          <Mark n={1}>
            <MTabs items={['승인 대기', '직원별 현황', '수동 조정', '특별휴가']} active="승인 대기" />
          </Mark>
          <Mark n={2}>
            <MCard>
              <MRow
                name="박민수"
                sub="연차 · 2026-08-03 ~ 08-04 (16h) · 사유: 가족 여행"
                tone="emerald"
                right={<MBadge tone="green">승인 대기</MBadge>}
              />
              <div className="flex gap-1 pt-1">
                <Mark n={3} className="flex-1"><MBtn full>승인</MBtn></Mark>
                <Mark n={4} className="flex-1"><MBtn tone="danger" full>반려</MBtn></Mark>
              </div>
            </MCard>
          </Mark>
          <Mark n={5}>
            <MCard title="직원별 잔여 연차">
              <MTable
                cols={['직원', '부여', '사용', '잔여']}
                rows={[['김서연', '15일', '4일', '11일'], ['박민수', '15일', '8일', '7일']]}
              />
            </MCard>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      {
        text: '탭으로 업무를 구분합니다.',
        sub: [
          '승인 대기 : 처리해야 할 신청',
          '직원별 현황 : 부여·사용·잔여 연차',
          '수동 조정 : 결근 차감, 이월 등 직접 조정',
          '특별휴가 : 경조·생일휴가 등 별도 부여',
        ],
      },
      { text: '신청 내용(직원 · 유형 · 기간 · 시간 · 사유)을 확인합니다.' },
      {
        text: '[승인] 클릭 → 즉시 확정되고 직원의 잔여 연차에서 자동 차감됩니다.',
        strong: true,
      },
      { text: '[반려] 클릭 → 반려 사유를 입력합니다. 입력한 사유는 직원 화면에 그대로 표시됩니다.' },
      { text: '직원별 현황 탭에서 부여·사용·잔여 연차를 언제든 확인할 수 있습니다.' },
    ],
    tip: '직원이 승인된 연차를 취소하면 대시보드 [연차 취소 알림]에 표시되고 잔여 연차는 자동 복원됩니다.',
  },

  /* ── 8. 연차 정책 설정 ── */
  {
    id: 'leave-settings',
    title: '연차 정책 설정',
    path: '홈 › 연차관리 › 연차 정책 설정',
    featureKeys: ['leave'],
    screen: (
      <Shot url="moduhr.app/manager/leave/settings">
        <WithNav nav={NAV} active="연차관리">
          <MHead title="연차 정책 설정" sub="홈 › 연차관리" />
          <Mark n={1}>
            <MCard title="기본 정책">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="1일 소정근로시간" value="8시간" />
                <MField label="연간 기본 연차" value="15일" />
              </div>
            </MCard>
          </Mark>
          <Mark n={2}>
            <MCard title="사용 허용 유형">
              <div className="flex flex-wrap gap-1">
                <MBadge tone="green">연차(1일)</MBadge>
                <MBadge tone="green">오전 반차</MBadge>
                <MBadge tone="green">오후 반차</MBadge>
                <MBadge tone="gray">시간 연차</MBadge>
              </div>
            </MCard>
          </Mark>
          <Mark n={3}>
            <MCard title="자동 승인">
              <MRow name="자동" sub="잔여 연차가 충분하면 신청 즉시 승인" right={<MBadge tone="gray">OFF</MBadge>} />
            </MCard>
          </Mark>
          <Mark n={4}><MBtn full>저장</MBtn></Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '1일 소정근로시간과 연간 기본 연차 일수를 설정합니다. 시간 단위 계산의 기준이 됩니다.' },
      { text: '직원이 신청할 수 있는 유형(연차 · 반차 · 시간연차)을 켜고 끕니다.' },
      { text: '자동 승인을 켜면 잔여 연차가 충분한 신청은 매니저 승인 없이 즉시 확정됩니다.' },
      { text: '[저장]하면 전체 직원에게 즉시 적용됩니다.' },
    ],
    tip: '연차는 입사일·근속 기간에 따라 자동으로 부여됩니다. 특정 직원만 조정해야 하면 [수동 조정] 탭을 사용하세요.',
  },

  /* ── 9. 서류 관리 ── */
  {
    id: 'documents',
    title: '증명서 발급 요청 처리',
    path: '홈 › 서류관리',
    featureKeys: ['documents'],
    screen: (
      <Shot url="moduhr.app/manager/documents">
        <WithNav nav={NAV} active="서류관리">
          <MHead title="서류관리" sub="검토 대기 2건" />
          <Mark n={1}><MTabs items={['검토 대기', '처리 완료']} active="검토 대기" /></Mark>
          <Mark n={2}>
            <MCard>
              <MRow
                name="이지훈"
                sub="재직증명서 · 제출용도: 금융기관 제출용"
                tone="amber"
                right={<MBadge tone="amber">검토중</MBadge>}
              />
              <p className="pt-1 text-[8px] text-slate-400">주소: 서울시 강남구 …  ·  신청일 2026-07-28</p>
            </MCard>
          </Mark>
          <div className="flex gap-1.5">
            <Mark n={3} className="flex-1"><MBtn full>승인 (발급)</MBtn></Mark>
            <Mark n={4} className="flex-1"><MBtn tone="danger" full>반려</MBtn></Mark>
          </div>
          <Mark n={5}>
            <MCard title="회사 직인">
              <MRow name="직인" sub="기업관리에서 등록 · 증명서에 자동 삽입" right={<MBadge tone="green">등록됨</MBadge>} />
            </MCard>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '검토 대기 / 처리 완료 탭으로 신청 건을 구분해 확인합니다.' },
      {
        text: '신청 내용을 확인합니다.',
        sub: [
          '재직증명서 · 경력증명서 : 제출용도, 기재 주소',
          '원천징수영수증 등 : 신청 연도(복수 선택 가능)',
        ],
      },
      {
        text: '[승인 (발급)] 클릭 → 직원에게 자동 처리됩니다.',
        strong: true,
        sub: [
          '재직 · 경력증명서 : 직원 본인 이메일로 발급 문서 발송',
          '원천징수 관련 서류 : 전담 세무사에게 발급 요청 메일 발송',
        ],
      },
      { text: '[반려] 클릭 → 반려 사유를 입력하면 직원에게 그대로 안내됩니다.' },
      { text: '증명서에 들어가는 회사 직인은 [기업관리]에서 미리 등록해 두세요.' },
    ],
    warn: '발송된 메일은 회수할 수 없습니다. 승인 전에 제출용도와 기재 내용을 반드시 확인하세요.',
  },

  /* ── 10. 근태 현황 ── */
  {
    id: 'attendance',
    title: '근태 현황 조회',
    path: '홈 › 근태관리',
    featureKeys: ['attendance'],
    screen: (
      <Shot url="moduhr.app/manager/attendance">
        <WithNav nav={NAV} active="근태관리">
          <MHead title="근태관리" sub="2026-07-29 (수)" right={<MBtn tone="secondary">출퇴근 설정</MBtn>} />
          <Mark n={1}>
            <div className="grid grid-cols-3 gap-1.5">
              <MStat label="출근완료" value="21" unit="명" />
              <MStat label="퇴근완료" value="18" unit="명" />
              <MStat label="미출근" value="3" unit="명" />
            </div>
          </Mark>
          <Mark n={2}>
            <div className="flex gap-1.5">
              <MField label="기간" value="2026-07-01 ~ 07-29" />
              <MField label="직원 / 유형" value="전체 직원 · 전체 유형" />
            </div>
          </Mark>
          <Mark n={3}>
            <MTable
              cols={['날짜', '직원', '출근', '퇴근', '상태']}
              rows={[
                ['07-29', '김서연', '08:52', '18:05', '퇴근완료'],
                ['07-29', '박민수', '09:14', '—', '출근완료'],
                ['07-29', '이지훈', '—', '—', '미출근'],
              ]}
            />
          </Mark>
          <Mark n={4}>
            <MCard title="월별 집계 · 요약">
              <MRow name="요약" sub="직원별 · 부서별 근무시간, 지각 · 소급 입력 건수" right={<MBadge tone="blue">요약 보기</MBadge>} />
            </MCard>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '오늘의 출근완료 · 퇴근완료 · 미출근 인원을 한눈에 확인합니다.' },
      { text: '기간, 직원, 근무 유형(정상 · 외근 · 재택 등)으로 기록을 걸러 봅니다.' },
      {
        text: '직원별 출퇴근 기록입니다.',
        sub: [
          '출근 · 퇴근 시각과 상태가 표시됩니다.',
          '외근 · 재택은 기록 당시의 위치 주소가 함께 저장됩니다.',
          '“소급” 표시는 직원이 나중에 입력한 기록입니다.',
        ],
      },
      { text: '[요약] 화면에서 월별 · 부서별 근무시간 집계를 확인할 수 있습니다.' },
    ],
    tip: '미출근이 계속 남아 있는 직원에게는 출퇴근 기록 입력을 안내해 주세요. 직원 화면에도 “근태 미입력” 알림이 표시됩니다.',
  },

  /* ── 11. 출퇴근 설정 ── */
  {
    id: 'attendance-settings',
    title: '출퇴근 설정 (시간 · 위치 · 알림)',
    path: '홈 › 근태관리 › 출퇴근 설정',
    featureKeys: ['attendance'],
    screen: (
      <Shot url="moduhr.app/manager/attendance/settings">
        <WithNav nav={NAV} active="근태관리">
          <MHead title="출퇴근 설정" sub="홈 › 근태관리" />
          <Mark n={1}>
            <MCard title="출근 시간">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="회사 출근 시각" value="09:00" />
                <MField label="1일 소정근로" value="8시간" />
              </div>
            </MCard>
          </Mark>
          <Mark n={2}>
            <MCard title="회사 위치">
              <MRow name="위치" sub="서울시 강남구 …" right={<MBadge tone="blue"><MapPin size={7} className="mr-0.5 inline" />100m</MBadge>} />
            </MCard>
          </Mark>
          <Mark n={3}>
            <MCard title="알림">
              <MRow name="출근" sub="출근 시각 5분 전 알림" right={<MBadge tone="green">ON</MBadge>} />
              <MRow name="퇴근" sub="출근 후 9시간 경과 시 알림" right={<MBadge tone="green">ON</MBadge>} />
              <MRow name="소급" sub="직원 소급 입력 시 매니저 알림" right={<MBadge tone="gray">OFF</MBadge>} />
            </MCard>
          </Mark>
          <Mark n={4}><MBtn full>저장</MBtn></Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '회사 출근 시각을 입력합니다 (기본 09:00). 지각 판단과 알림 기준이 됩니다.' },
      { text: 'GPS 출근 허용 반경을 설정합니다 (기본 100m). 반경을 벗어나면 출근 기록 시 위치가 함께 표시됩니다.' },
      {
        text: '알림 항목을 켜고 끕니다.',
        sub: [
          '출근 알림 : 설정 시각 5분 전 (평일 · 공휴일 제외)',
          '퇴근 알림 : 출근 후 9시간 경과 시',
          '소급 입력 알림 : 직원이 지난 날짜를 입력했을 때 매니저에게 통지',
        ],
      },
      { text: '[저장] 클릭 → 즉시 전체 직원에게 적용됩니다.' },
    ],
  },

  /* ── 12. 기업관리 ── */
  {
    id: 'company',
    title: '기업 정보 · 직인 · 세무사 정보',
    path: '홈 › 기업관리',
    screen: (
      <Shot url="moduhr.app/manager/company">
        <WithNav nav={NAV} active="기업관리">
          <MHead title="기업관리" sub="브이에이성형외과" />
          <Mark n={1}>
            <MCard title="회사 기본 정보">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="회사명" value="브이에이성형외과" />
                <MField label="사업자번호" value="123-45-67890" />
                <MField label="대표자" value="홍길동" />
                <MField label="주소" value="서울시 강남구 …" />
              </div>
            </MCard>
          </Mark>
          <Mark n={2}>
            <MCard title="회사 직인">
              <MRow name="직인" sub="증명서 발급 시 자동 삽입" right={<MBtn tone="secondary">이미지 등록</MBtn>} />
            </MCard>
          </Mark>
          <Mark n={3}>
            <MCard title="세무사 정보">
              <MRow name="세무" sub="원천징수 서류 요청 메일 수신 주소" right={<MBadge tone="blue">등록됨</MBadge>} />
            </MCard>
          </Mark>
          <Mark n={4}>
            <MCard title="담당자">
              <MRow name="담당자(나)" sub="manager@company.co.kr" right={<MBadge tone="green">기업담당자</MBadge>} />
            </MCard>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '회사명 · 사업자번호 · 대표자 · 주소를 최신 상태로 유지합니다. 증명서와 급여명세서에 그대로 사용됩니다.' },
      {
        text: '회사 직인 이미지를 등록합니다.',
        strong: true,
        sub: ['직인이 없으면 재직 · 경력증명서 발급 시 직인 없이 출력됩니다.'],
      },
      { text: '세무사 정보 — 원천징수 관련 서류 요청 메일이 이 주소로 발송됩니다.' },
      { text: '담당자 정보를 확인합니다. 담당자 변경이 필요하면 시스템 관리자에게 요청하세요.' },
    ],
    tip: '사용 중인 기능(급여 · 연차 · 근태 · 서류) 구성 변경은 시스템 관리자가 처리합니다.',
  },

  /* ── 13. 내 정보 ── */
  {
    id: 'profile',
    title: '내 정보 · 비밀번호 변경 · 로그아웃',
    path: '홈 › 내 정보',
    screen: (
      <Shot url="moduhr.app/manager/profile">
        <WithNav nav={NAV} active="내 정보">
          <MHead title="내 정보" sub="계정 및 개인 정보" />
          <Mark n={1}>
            <MCard title="기본 정보">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="이름" value="홍길동" />
                <MField label="전화번호" value="010-1234-5678" />
              </div>
            </MCard>
          </Mark>
          <Mark n={2}>
            <MCard title="이메일 변경">
              <MField label="새 이메일 주소" placeholder="new@company.co.kr" />
              <MBtn tone="secondary">확인 링크 발송</MBtn>
            </MCard>
          </Mark>
          <Mark n={3}>
            <MCard title="비밀번호 변경">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="새 비밀번호" value="••••••••" />
                <MField label="새 비밀번호 확인" value="••••••••" />
              </div>
              <MBtn>비밀번호 변경</MBtn>
            </MCard>
          </Mark>
          <Mark n={4}>
            <div className="rounded-lg bg-[#0f172a] px-2 py-1.5">
              <span className="text-[9px] text-slate-400">로그아웃 (사이드바 맨 아래)</span>
            </div>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '이름 · 전화번호 등 기본 정보를 확인하고 수정합니다.' },
      { text: '이메일을 바꾸려면 새 주소를 입력하고 [확인 링크 발송] → 새 메일함에서 링크를 클릭해야 변경이 완료됩니다.' },
      { text: '비밀번호는 8자 이상으로 두 번 입력해 변경합니다.' },
      { text: '사용을 마치면 사이드바 맨 아래 [로그아웃]을 클릭하세요. 공용 PC에서는 반드시 로그아웃해 주세요.' },
    ],
  },
]
