import { BookOpen, Mail, LogIn, Bell, TriangleAlert } from 'lucide-react'
import {
  Shot, Mark, WithNav, MHead, MCard, MBtn, MField, MRow, MStat, MTabs, MBadge, MTable, Phone, PhoneTabs,
} from './mock'
import type { GuideStep } from './types'

const NAV = ['홈', '급여', '서류신청', '연차', '출퇴근', '내 정보', '사용 설명서']

/* ================================================================
   직원 사용설명서
================================================================ */
export const EMPLOYEE_STEPS: GuideStep[] = [
  /* ── 1. 초대 메일 가입 ── */
  {
    id: 'invite',
    title: '초대 메일로 가입하기 (최초 1회)',
    path: '이메일 › 가입 완료하기',
    screen: (
      <Shot url="mail.google.com">
        <div className="space-y-2">
          <Mark n={1}>
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="flex items-center gap-1.5 pb-1.5">
                <Mail size={11} className="text-blue-600" />
                <span className="text-[9px] font-semibold text-slate-800">[ModuHR] 계정 가입 안내</span>
              </div>
              <p className="text-[8.5px] leading-relaxed text-slate-500">
                안녕하세요, 김서연님.<br />
                브이에이성형외과의 ModuHR 계정이 생성되었습니다.<br />
                아래 버튼을 눌러 비밀번호를 설정해 주세요.
              </p>
              <div className="pt-1.5">
                <Mark n={2} inline><MBtn>가입 완료하기</MBtn></Mark>
              </div>
            </div>
          </Mark>
          <div className="mx-auto max-w-[210px] space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-center text-[10px] font-bold text-slate-900">비밀번호 설정</p>
            <Mark n={3}>
              <div className="space-y-1.5">
                <MField label="비밀번호 (8자 이상)" value="••••••••" />
                <MField label="비밀번호 확인" value="••••••••" />
              </div>
            </Mark>
            <Mark n={4}><MBtn tone="navy" full>설정 완료</MBtn></Mark>
          </div>
        </div>
      </Shot>
    ),
    notes: [
      { text: '회사 담당자가 등록한 이메일로 가입 안내 메일이 도착합니다.' },
      {
        text: '[가입 완료하기] 버튼을 클릭합니다.',
        strong: true,
        sub: ['※ 초대 링크는 24시간 동안만 유효합니다. 만료되었으면 회사 담당자에게 재발송을 요청하세요.'],
      },
      { text: '사용할 비밀번호를 8자 이상으로 두 번 입력합니다.' },
      { text: '[설정 완료]를 누르면 자동으로 로그인되어 홈 화면으로 이동합니다.' },
    ],
    tip: '메일이 보이지 않으면 스팸함을 먼저 확인해 주세요.',
  },

  /* ── 2. 로그인 ── */
  {
    id: 'login',
    title: '로그인 · 비밀번호 재설정',
    path: 'moduhr.app/login',
    screen: (
      <Shot url="moduhr.app/login">
        <div className="mx-auto max-w-[230px] space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-center text-[11px] font-bold text-slate-900">ModuHR</p>
          <p className="pb-1 text-center text-[8px] text-slate-400">직원 로그인</p>
          <Mark n={1}><MField label="이메일" value="seoyeon@company.co.kr" /></Mark>
          <Mark n={2}><MField label="비밀번호" value="••••••••" /></Mark>
          <Mark n={3}><MBtn tone="navy" full><LogIn size={9} className="mr-1" />로그인</MBtn></Mark>
          <Mark n={4}>
            <p className="text-center text-[8.5px] text-slate-400">비밀번호를 잊으셨나요?</p>
          </Mark>
        </div>
      </Shot>
    ),
    notes: [
      { text: '초대 메일을 받은 이메일 주소를 입력합니다.' },
      { text: '가입할 때 직접 설정한 비밀번호를 입력합니다.' },
      { text: '[로그인] 클릭 → 내 홈 화면으로 이동합니다.' },
      {
        text: '비밀번호를 잊었으면 클릭 → 이메일로 재설정 링크가 발송됩니다.',
        sub: ['링크는 1시간 동안만 유효합니다.'],
      },
    ],
    tip: '휴대폰 브라우저에서 같은 주소로 접속하면 모바일 화면으로 사용할 수 있습니다. 홈 화면에 추가해 두면 앱처럼 쓸 수 있습니다.',
  },

  /* ── 3. 홈 화면 ── */
  {
    id: 'home',
    title: '홈 화면 한눈에 보기',
    path: '홈',
    screen: (
      <Shot url="moduhr.app/employee">
        <WithNav nav={NAV} active="홈">
          <MHead sub="브이에이성형외과" title="안녕하세요, 김서연님" />
          <Mark n={1}>
            <MCard title="출퇴근" right="상세보기 →">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] text-slate-500">7월 29일 (수)</span>
                <MBadge tone="gray">미출근</MBadge>
              </div>
              <MBtn tone="navy" full>출근하기</MBtn>
            </MCard>
          </Mark>
          <Mark n={2}>
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold text-slate-700">알림</p>
              <div className="flex items-center gap-1.5 rounded-lg border-2 border-red-200 bg-red-50 px-2 py-1.5">
                <TriangleAlert size={11} className="text-red-500" />
                <span className="text-[8.5px] font-semibold text-red-600">근태 미입력 2일</span>
              </div>
              <MCard><MRow name="급여" sub="2026년 6월 명세서가 발급되었습니다" tone="blue" /></MCard>
              <MCard><MRow name="연차" sub="08-03 ~ 08-04 연차가 승인되었습니다" tone="emerald" /></MCard>
            </div>
          </Mark>
          <Mark n={3}>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
              <BookOpen size={12} className="text-blue-600" />
              <span className="text-[9px] font-medium text-slate-800">서비스 사용 설명서</span>
              <span className="ml-auto text-[9px] text-slate-300">›</span>
            </div>
          </Mark>
          <Mark n={4}>
            <MCard title="공지사항"><MRow name="공지" sub="8월 급여 지급일 안내" /></MCard>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      {
        text: '출퇴근 위젯 — 오늘 상태가 표시되고, 버튼 한 번으로 출근 / 퇴근을 기록합니다.',
        strong: true,
      },
      {
        text: '알림 — 나에게 생긴 변화가 모두 여기에 모입니다.',
        sub: [
          '근태 미입력 : 빠진 출퇴근 기록 (빨간 알림)',
          '급여명세서 발급 · 연차 승인 · 서류 처리 완료',
          '알림을 클릭하면 해당 화면으로 바로 이동합니다.',
        ],
      },
      { text: '서비스 사용 설명서 — 지금 보고 있는 이 문서로 이동합니다.' },
      { text: '공지사항 — 회사에서 올린 안내를 확인합니다.' },
    ],
    tip: '왼쪽 사이드바(휴대폰은 화면 아래 탭)가 전체 메뉴입니다. 회사에서 사용하지 않는 기능은 메뉴에 표시되지 않습니다.',
  },

  /* ── 4. 출퇴근 ── */
  {
    id: 'attendance',
    title: '출퇴근 기록하기',
    path: '홈 › 출퇴근',
    featureKeys: ['attendance'],
    screen: (
      <Phone>
        <Mark n={1}>
          <MCard title="주간 근무 현황">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-3/4 rounded-full bg-[#003366]" />
            </div>
            <p className="text-[8px] text-slate-400">30h / 목표 40h · 한도 52h</p>
          </MCard>
        </Mark>
        <Mark n={2}>
          <MCard title="오늘">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] text-slate-500">7월 29일 (수)</span>
              <MBadge tone="blue">출근완료</MBadge>
            </div>
            <MTable cols={['출근', '퇴근', '유형']} rows={[['08:52', '—', '정상']]} />
          </MCard>
        </Mark>
        <Mark n={3}>
          <div className="space-y-1">
            <MField label="출근 유형" value="정상 / 외근 / 재택" />
            <MBtn tone="primary" full>퇴근하기</MBtn>
          </div>
        </Mark>
        <Mark n={4}>
          <MCard title="미입력 2일">
            <MRow name="소급" sub="07-24, 07-25 기록 입력하기" right={<MBadge tone="red">입력 필요</MBadge>} />
          </MCard>
        </Mark>
        <Mark n={5}>
          <MBtn tone="secondary" full><Bell size={9} className="mr-1" />출퇴근 알림 받기</MBtn>
        </Mark>
        <PhoneTabs items={['홈', '급여', '출퇴근', '연차/서류', '내 정보']} active="출퇴근" />
      </Phone>
    ),
    notes: [
      { text: '이번 주 · 이번 달 근무시간이 자동 집계됩니다. (휴게시간 제외, 퇴근 완료된 날만 집계)' },
      { text: '오늘의 출근 · 퇴근 시각과 근무 유형이 표시됩니다.' },
      {
        text: '출근 유형을 선택하고 [출근하기] / [퇴근하기]를 누릅니다.',
        strong: true,
        sub: [
          '정상 : 사업장 근무',
          '외근 · 재택 : 현재 위치 주소가 함께 기록됩니다 (위치 권한 허용 필요)',
        ],
      },
      {
        text: '기록을 빠뜨린 날은 “미입력”으로 표시됩니다. 날짜를 눌러 시각을 직접 입력(소급 입력)하세요.',
      },
      { text: '[출퇴근 알림 받기] → 브라우저 알림을 [허용]하면 출근 5분 전 · 퇴근 시간에 알림이 옵니다.' },
    ],
    warn: '출퇴근 기록은 급여·근태 산정의 기준이 됩니다. 미입력일이 남지 않도록 그날 바로 기록해 주세요.',
  },

  /* ── 5. 급여명세서 ── */
  {
    id: 'payslips',
    title: '급여명세서 확인',
    path: '홈 › 급여',
    featureKeys: ['payroll'],
    screen: (
      <Shot url="moduhr.app/employee/payslips">
        <WithNav nav={NAV} active="급여">
          <MHead title="내 급여" sub="명세서를 클릭하면 지급·공제 상세를 확인할 수 있습니다" />
          <Mark n={1}>
            <MCard title="최근 급여">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-medium text-slate-700">2026년 6월</span>
                <span className="text-[11px] font-bold text-[#003366]">2,713,600원</span>
              </div>
            </MCard>
          </Mark>
          <Mark n={2}>
            <MCard title="급여 이력">
              <MRow name="5월" sub="2026년 5월 · 실수령 2,698,400원" tone="blue" />
              <MRow name="4월" sub="2026년 4월 · 실수령 2,701,200원" tone="blue" />
            </MCard>
          </Mark>
          <Mark n={3}>
            <div className="grid grid-cols-3 gap-1.5">
              <MStat label="지급합계" value="3,000,000" />
              <MStat label="공제합계" value="286,400" />
              <MStat label="실수령액" value="2,713,600" />
            </div>
          </Mark>
          <Mark n={4} inline>
            <MBtn tone="secondary">인쇄 / PDF 저장</MBtn>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '최근 급여 카드에서 가장 최신 명세서를 바로 확인합니다.' },
      { text: '급여 이력에서 과거 월을 클릭하면 그 달의 명세서가 열립니다.' },
      {
        text: '상세 화면에서 지급 항목(기본급 · 수당 · 비과세)과 공제 항목(4대 보험 · 소득세)을 확인합니다.',
        strong: true,
        sub: ['급여는 “귀속월” 기준으로 표시됩니다. 예: 6월 귀속 급여 → 7월 15일 지급'],
      },
      { text: '[인쇄 / PDF 저장]으로 명세서를 파일로 보관할 수 있습니다.' },
    ],
    tip: '명세서가 보이지 않으면 아직 회사에서 등록하지 않은 상태입니다. 금액이 다르면 회사 담당자에게 문의해 주세요.',
  },

  /* ── 6. 연차 ── */
  {
    id: 'leave',
    title: '연차 신청 · 취소',
    path: '홈 › 연차',
    featureKeys: ['leave'],
    screen: (
      <Shot url="moduhr.app/employee/leave">
        <WithNav nav={NAV} active="연차">
          <MHead title="연차 / 서류" sub="브이에이성형외과" />
          <Mark n={1}><MTabs items={['연차관리', '서류신청']} active="연차관리" /></Mark>
          <Mark n={2}>
            <div className="grid grid-cols-3 gap-1.5">
              <MStat label="부여" value="15" unit="일" />
              <MStat label="사용" value="4" unit="일" />
              <MStat label="잔여" value="11" unit="일" />
            </div>
          </Mark>
          <Mark n={3}>
            <MCard title="연차 신청하기">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="연차 유형" value="연차 / 오전반차 / 오후반차 / 시간연차" />
                <MField label="기간" value="2026-08-03 ~ 08-04" />
                <MField label="사유 (선택)" value="가족 여행" />
                <MField label="예상 차감" value="16시간 (2일)" />
              </div>
            </MCard>
          </Mark>
          <Mark n={4}><MBtn full>신청하기</MBtn></Mark>
          <Mark n={5}>
            <MCard title="사용 내역">
              <MRow name="8월" sub="08-03 ~ 08-04 · 연차" tone="emerald" right={<MBadge tone="green">승인</MBadge>} />
              <MRow name="7월" sub="07-10 · 오전반차" tone="emerald" right={<MBadge tone="red">반려</MBadge>} />
              <MRow name="7월" sub="07-22 · 연차" tone="emerald" right={<MBadge tone="gray">취소</MBadge>} />
            </MCard>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '상단 탭으로 [연차관리] / [서류신청] 화면을 전환합니다.' },
      { text: '내 연차 현황 — 부여 · 사용 · 잔여 일수를 먼저 확인합니다.' },
      {
        text: '신청 내용을 입력합니다.',
        sub: [
          '유형 : 연차(1일) / 오전반차 / 오후반차 / 시간연차',
          '기간(또는 시간 수)과 사유(선택)를 입력',
          '입력하면 예상 차감 시간이 자동 계산됩니다.',
        ],
      },
      {
        text: '[신청하기] 클릭 → 담당 매니저에게 알림이 전달됩니다.',
        strong: true,
        sub: ['회사 설정에 따라 잔여 연차가 충분하면 즉시 자동 승인될 수도 있습니다.'],
      },
      {
        text: '사용 내역에서 승인 대기 · 승인 · 반려 상태를 확인합니다.',
        sub: [
          '반려된 경우 매니저가 입력한 반려 사유가 함께 표시됩니다.',
          '사용 전이면 [취소]할 수 있고, 취소하면 잔여 연차가 복원됩니다.',
        ],
      },
    ],
    warn: '잔여 연차보다 많이 신청하면 신청이 제한됩니다. 여러 날짜를 한 번에 승인받은 연차는 부분 취소가 안 되며, 전체 취소 후 다시 신청해야 합니다.',
  },

  /* ── 7. 서류 신청 ── */
  {
    id: 'documents',
    title: '증명서 · 서류 신청',
    path: '홈 › 서류신청',
    featureKeys: ['documents'],
    screen: (
      <Shot url="moduhr.app/employee/documents">
        <WithNav nav={NAV} active="서류신청">
          <MHead title="서류신청" sub="재직증명서 · 원천징수영수증 등을 신청합니다" />
          <Mark n={1}>
            <MCard title="서류 종류">
              <div className="flex flex-wrap gap-1">
                <MBadge tone="blue">재직증명서</MBadge>
                <MBadge tone="gray">경력증명서</MBadge>
                <MBadge tone="gray">원천징수영수증(연도별)</MBadge>
                <MBadge tone="gray">근로소득원천징수부</MBadge>
              </div>
            </MCard>
          </Mark>
          <Mark n={2}>
            <MCard title="신청 정보">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="제출용도 *" value="금융기관 제출용" />
                <MField label="기재 주소" value="서울시 강남구 …" />
                <MField label="신청 연도 (복수 선택)" value="2025, 2024" />
                <MField label="추가 전달 사항" placeholder="선택 입력" />
              </div>
            </MCard>
          </Mark>
          <Mark n={3}><MBtn full>신청하기</MBtn></Mark>
          <Mark n={4}>
            <MCard title="신청 내역">
              <MRow name="재직" sub="재직증명서 · 2026-07-28" tone="amber" right={<MBadge tone="amber">처리중</MBadge>} />
              <MRow name="원천" sub="원천징수영수증 2025 · 2026-07-20" tone="amber" right={<MBadge tone="green">승인완료</MBadge>} />
            </MCard>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      {
        text: '필요한 서류 종류를 선택합니다.',
        sub: [
          '재직증명서 · 경력증명서 : 승인 시 본인 이메일로 발급 문서가 발송됩니다.',
          '원천징수 관련 서류 : 승인 시 전담 세무사에게 발급 요청 메일이 발송됩니다.',
        ],
      },
      {
        text: '신청 정보를 입력합니다.',
        strong: true,
        sub: [
          '제출용도는 필수입니다. (예: 금융기관 제출용, 주택청약용)',
          '재직 · 경력증명서는 증명서에 기재할 주소를 입력합니다.',
          '원천징수영수증은 필요한 연도를 여러 개 선택할 수 있습니다.',
        ],
      },
      { text: '[신청하기] 클릭 → 회사 담당자에게 접수됩니다.' },
      {
        text: '신청 내역에서 처리 상태(처리중 · 승인완료 · 반려됨)를 확인합니다.',
        sub: ['반려된 경우 사유가 함께 표시됩니다.'],
      },
    ],
    tip: '서류 발급에는 1~3 영업일이 걸릴 수 있습니다. 급한 경우 담당자에게 별도로 알려 주세요.',
  },

  /* ── 8. 내 정보 ── */
  {
    id: 'profile',
    title: '내 정보 · 비밀번호 변경 · 로그아웃',
    path: '홈 › 내 정보',
    screen: (
      <Shot url="moduhr.app/employee/profile">
        <WithNav nav={NAV} active="내 정보">
          <MHead title="내 정보" sub="소속 및 개인 정보를 확인하세요" />
          <Mark n={1}>
            <MCard title="기본 정보">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="이름" value="김서연" />
                <MField label="전화번호" value="010-1234-5678" />
              </div>
            </MCard>
          </Mark>
          <Mark n={2}>
            <MCard title="직무 정보">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="소속 회사" value="브이에이성형외과" />
                <MField label="부서 · 직책" value="진료팀 · 간호사" />
              </div>
            </MCard>
          </Mark>
          <Mark n={3}>
            <MCard title="이메일 변경">
              <MField label="새 이메일 주소" placeholder="new@company.co.kr" />
              <MBtn tone="secondary">확인 링크 발송</MBtn>
            </MCard>
          </Mark>
          <Mark n={4}>
            <MCard title="비밀번호 변경">
              <div className="grid grid-cols-2 gap-1.5">
                <MField label="새 비밀번호" value="••••••••" />
                <MField label="새 비밀번호 확인" value="••••••••" />
              </div>
              <MBtn>비밀번호 변경</MBtn>
            </MCard>
          </Mark>
          <Mark n={5}>
            <div className="rounded-lg bg-[#0f172a] px-2 py-1.5">
              <span className="text-[9px] text-slate-400">로그아웃 (사이드바 맨 아래)</span>
            </div>
          </Mark>
        </WithNav>
      </Shot>
    ),
    notes: [
      { text: '전화번호 등 내가 바꿀 수 있는 정보를 수정하고 저장합니다.' },
      {
        text: '소속 회사 · 부서 · 직책은 조회만 가능합니다.',
        sub: ['잘못된 내용이 있으면 회사 담당자에게 수정을 요청하세요.'],
      },
      { text: '이메일을 바꾸려면 새 주소 입력 후 [확인 링크 발송] → 새 메일함에서 링크를 클릭해야 변경이 완료됩니다.' },
      { text: '비밀번호는 8자 이상으로 두 번 입력해 변경합니다.' },
      { text: '사용을 마치면 [로그아웃]을 클릭하세요. 공용 PC에서는 반드시 로그아웃해 주세요.' },
    ],
  },
]
