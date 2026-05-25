import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import path from 'path'

Font.register({
  family: 'NanumGothic',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'NanumGothic-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public', 'fonts', 'NanumGothic-Bold.ttf'),    fontWeight: 700 },
  ],
})

const BLUE   = '#2563eb'
const DARK   = '#0f172a'
const GREEN  = '#059669'
const WHITE  = '#ffffff'
const SLATE  = '#334155'
const MUTED  = '#94a3b8'
const BORDER = '#e2e8f0'

const S = StyleSheet.create({
  /* ── Page ── */
  page: {
    fontFamily:      'NanumGothic',
    backgroundColor: WHITE,
    flexDirection:   'column',
  },
  /* ── Top bar ── */
  topBar: {
    backgroundColor:   DARK,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 28,
    paddingVertical:   8,
  },
  topLogo:    { color: WHITE, fontSize: 12, fontWeight: 700 },
  topSection: { color: MUTED, fontSize: 8 },
  /* ── Body ── */
  body: {
    flex:              1,
    flexDirection:     'row',
    paddingHorizontal: 28,
    paddingTop:        16,
    paddingBottom:     8,
  },
  col:      { flex: 1 },
  colLeft:  { flex: 1, paddingRight: 10 },
  colRight: { flex: 1, paddingLeft:  10 },
  colDivider: {
    width:           0.5,
    backgroundColor: BORDER,
    marginHorizontal: 0,
  },
  /* ── Section heading ── */
  sectionHead: {
    fontSize:           10,
    fontWeight:         700,
    color:              DARK,
    marginBottom:       8,
    paddingBottom:      4,
    borderBottomWidth:  1.5,
    borderBottomColor:  BLUE,
    borderBottomStyle:  'solid',
  },
  /* ── Sub section ── */
  sub: { marginBottom: 10 },
  subHead: {
    fontSize:          8.5,
    fontWeight:        700,
    color:             BLUE,
    backgroundColor:   '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical:   3,
    borderRadius:      3,
    marginBottom:      5,
  },
  subHeadGreen: {
    fontSize:          8.5,
    fontWeight:        700,
    color:             GREEN,
    backgroundColor:   '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical:   3,
    borderRadius:      3,
    marginBottom:      5,
  },
  /* ── Step ── */
  stepRow: {
    flexDirection: 'row',
    marginBottom:  3,
    alignItems:    'flex-start',
  },
  badge: {
    width:           14,
    height:          14,
    borderRadius:    7,
    backgroundColor: BLUE,
    color:           WHITE,
    fontSize:        7,
    fontWeight:      700,
    textAlign:       'center',
    paddingTop:      2.5,
    marginRight:     5,
    flexShrink:      0,
  },
  badgeGreen: {
    width:           14,
    height:          14,
    borderRadius:    7,
    backgroundColor: GREEN,
    color:           WHITE,
    fontSize:        7,
    fontWeight:      700,
    textAlign:       'center',
    paddingTop:      2.5,
    marginRight:     5,
    flexShrink:      0,
  },
  stepText: {
    fontSize:   8,
    color:      SLATE,
    flex:       1,
    lineHeight: 1.6,
  },
  /* ── Callout boxes ── */
  boxYellow: {
    backgroundColor:   '#fffbeb',
    borderLeftWidth:   2.5,
    borderLeftColor:   '#f59e0b',
    borderLeftStyle:   'solid',
    paddingHorizontal: 7,
    paddingVertical:   5,
    marginTop:         6,
    borderRadius:      2,
  },
  boxBlue: {
    backgroundColor:   '#eff6ff',
    borderLeftWidth:   2.5,
    borderLeftColor:   BLUE,
    borderLeftStyle:   'solid',
    paddingHorizontal: 7,
    paddingVertical:   5,
    marginTop:         6,
    borderRadius:      2,
  },
  boxGreen: {
    backgroundColor:   '#f0fdf4',
    borderLeftWidth:   2.5,
    borderLeftColor:   GREEN,
    borderLeftStyle:   'solid',
    paddingHorizontal: 7,
    paddingVertical:   5,
    marginTop:         6,
    borderRadius:      2,
  },
  boxText: { fontSize: 7.5, lineHeight: 1.5 },
  boxYellowText: { color: '#92400e' },
  boxBlueText:   { color: '#1e40af' },
  boxGreenText:  { color: '#166534' },
  /* ── Footer ── */
  footer: {
    borderTopWidth:    0.5,
    borderTopColor:    BORDER,
    borderTopStyle:    'solid',
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 28,
    paddingVertical:   5,
  },
  footerText: { fontSize: 7, color: MUTED },
  /* ── Cover ── */
  coverPage: {
    backgroundColor: DARK,
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
  },
  coverLogoBox: {
    backgroundColor:   BLUE,
    borderRadius:      14,
    paddingHorizontal: 22,
    paddingVertical:   10,
    marginBottom:      18,
  },
  coverLogoText: { color: WHITE, fontSize: 30, fontWeight: 700 },
  coverTitle:    { color: WHITE, fontSize: 20, fontWeight: 700, marginBottom: 6 },
  coverSub:      { color: MUTED, fontSize: 11, marginBottom: 28 },
  coverLine:     { width: 48, height: 2, backgroundColor: BLUE, marginBottom: 14 },
  coverVersion:  { color: '#475569', fontSize: 8.5 },
  /* ── Part divider ── */
  partPage: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
  },
  partBg: {
    position:        'absolute',
    top:             0, left: 0, right: 0, bottom: 0,
    backgroundColor: BLUE,
  },
  partNum:   { color: 'rgba(255,255,255,0.15)', fontSize: 90, fontWeight: 700 },
  partTitle: { color: WHITE, fontSize: 26, fontWeight: 700, marginBottom: 8 },
  partSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  partIcon: {
    backgroundColor:   'rgba(255,255,255,0.15)',
    borderRadius:      50,
    paddingHorizontal: 18,
    paddingVertical:   8,
    marginBottom:      16,
  },
  partIconText: { color: WHITE, fontSize: 10, fontWeight: 700 },
})

/* ───────────── helpers ───────────── */

function TopBar({ section, role }: { section: string; role: '매니저' | '직원' }) {
  return (
    <View style={S.topBar}>
      <Text style={S.topLogo}>ModuHR</Text>
      <Text style={S.topSection}>{role} 가이드  ›  {section}</Text>
    </View>
  )
}

function Footer({ page, total }: { page: number; total: number }) {
  return (
    <View style={S.footer}>
      <Text style={S.footerText}>ModuHR 사용 매뉴얼  |  무단 배포 금지</Text>
      <Text style={S.footerText}>{page} / {total}</Text>
    </View>
  )
}

function SectionHead({ children, style }: { children: string; style?: Record<string, unknown> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Text style={style ? [S.sectionHead, style as any] : S.sectionHead}>{children}</Text>
}

function SubHead({ children, green }: { children: string; green?: boolean }) {
  return <Text style={green ? S.subHeadGreen : S.subHead}>{children}</Text>
}

function Step({ n, children, green }: { n: number; children: string; green?: boolean }) {
  return (
    <View style={S.stepRow}>
      <Text style={green ? S.badgeGreen : S.badge}>{n}</Text>
      <Text style={S.stepText}>{children}</Text>
    </View>
  )
}

function NoteBox({ children }: { children: string }) {
  return (
    <View style={S.boxYellow}>
      <Text style={[S.boxText, S.boxYellowText]}>⚠ {children}</Text>
    </View>
  )
}

function InfoBox({ children }: { children: string }) {
  return (
    <View style={S.boxBlue}>
      <Text style={[S.boxText, S.boxBlueText]}>ℹ {children}</Text>
    </View>
  )
}

function TipBox({ children }: { children: string }) {
  return (
    <View style={S.boxGreen}>
      <Text style={[S.boxText, S.boxGreenText]}>✓ {children}</Text>
    </View>
  )
}

/* ───────────── pages ───────────── */

const TOTAL = 11

function CoverPage() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <View style={S.coverPage}>
        <View style={S.coverLogoBox}>
          <Text style={S.coverLogoText}>ModuHR</Text>
        </View>
        <Text style={S.coverTitle}>사용 매뉴얼</Text>
        <Text style={S.coverSub}>매니저 &amp; 직원 가이드</Text>
        <View style={S.coverLine} />
        <Text style={S.coverVersion}>딱 필요한 HR 모듈만.</Text>
      </View>
    </Page>
  )
}

function PartDivider({ part, title, sub }: { part: string; title: string; sub: string }) {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <View style={S.partPage}>
        <View style={S.partBg} />
        <Text style={S.partNum}>{part}</Text>
        <View style={S.partIcon}>
          <Text style={S.partIconText}>{title.includes('매니저') ? '매니저 가이드' : '직원 가이드'}</Text>
        </View>
        <Text style={S.partTitle}>{title}</Text>
        <Text style={S.partSub}>{sub}</Text>
      </View>
    </Page>
  )
}

/* ── 매니저 1: 로그인 & 대시보드 ── */
function M_LoginDashboard() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <TopBar section="로그인 &amp; 대시보드" role="매니저" />
      <View style={S.body}>
        {/* LEFT */}
        <View style={S.colLeft}>
          <SectionHead>1. 로그인</SectionHead>
          <View style={S.sub}>
            <SubHead>최초 로그인</SubHead>
            <Step n={1}>어드민으로부터 받은 초대 이메일을 확인합니다.</Step>
            <Step n={2}>이메일 내 [가입 완료하기] 버튼을 클릭합니다.</Step>
            <Step n={3}>비밀번호를 설정합니다 (8자 이상).</Step>
            <Step n={4}>설정 후 자동으로 매니저 홈으로 이동합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>재로그인</SubHead>
            <Step n={1}>브라우저에서 서비스 주소를 입력합니다.</Step>
            <Step n={2}>이메일과 비밀번호를 입력 후 [로그인]을 클릭합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>비밀번호 재설정</SubHead>
            <Step n={1}>로그인 화면 하단 [비밀번호를 잊으셨나요?]를 클릭합니다.</Step>
            <Step n={2}>이메일 주소를 입력하면 재설정 링크가 발송됩니다.</Step>
            <Step n={3}>이메일의 [비밀번호 재설정하기] 버튼을 클릭합니다.</Step>
            <Step n={4}>새 비밀번호(8자 이상)를 두 번 입력 후 변경합니다.</Step>
            <TipBox>링크는 발송 후 1시간 동안만 유효합니다.</TipBox>
          </View>
        </View>

        <View style={S.colDivider} />

        {/* RIGHT */}
        <View style={S.colRight}>
          <SectionHead>2. 대시보드 홈</SectionHead>
          <View style={S.sub}>
            <SubHead>홈 화면 구성</SubHead>
            <Step n={1}>로그인 후 매니저 홈이 표시됩니다.</Step>
            <Step n={2}>재직 직원 수, 이번 달 급여 현황을 한눈에 확인합니다.</Step>
            <Step n={3}>처리 대기 중인 연차 신청이 있으면 홈에서 빠르게 확인됩니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>화면 구성 안내</SubHead>
            <Step n={1}>왼쪽 사이드바: 주요 메뉴 (직원 관리, 급여, 연차 등)</Step>
            <Step n={2}>상단 우측: 내 프로필 및 로그아웃</Step>
            <Step n={3}>중앙 영역: 선택한 메뉴의 콘텐츠</Step>
          </View>
          <InfoBox>화면이 잘 보이지 않을 경우 브라우저 확대/축소(Ctrl+/-) 또는 새로고침(F5)을 시도해 보세요.</InfoBox>
        </View>
      </View>
      <Footer page={3} total={TOTAL} />
    </Page>
  )
}

/* ── 매니저 2: 직원 관리 ── */
function M_Employees() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <TopBar section="직원 관리" role="매니저" />
      <View style={S.body}>
        {/* LEFT */}
        <View style={S.colLeft}>
          <SectionHead>3. 직원 등록 &amp; 조회</SectionHead>
          <View style={S.sub}>
            <SubHead>직원 목록 조회</SubHead>
            <Step n={1}>사이드바 메뉴에서 [직원 관리]를 클릭합니다.</Step>
            <Step n={2}>재직 중인 직원 목록, 소속 부서, 입사일 등을 확인합니다.</Step>
            <Step n={3}>직원 이름을 클릭하면 상세 정보를 볼 수 있습니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>신규 직원 등록</SubHead>
            <Step n={1}>[직원 추가] 버튼을 클릭합니다.</Step>
            <Step n={2}>성명, 이메일, 입사일, 부서, 직책을 입력합니다.</Step>
            <Step n={3}>급여 형태(월급/시급/일급)와 금액을 입력합니다.</Step>
            <Step n={4}>비과세 항목이 있으면 해당 항목을 추가합니다.</Step>
            <Step n={5}>[저장] 버튼을 클릭하면 직원이 등록됩니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>CSV 일괄 업로드</SubHead>
            <Step n={1}>[직원 관리] → [업로드]를 클릭합니다.</Step>
            <Step n={2}>지정 형식의 CSV 파일을 선택합니다.</Step>
            <Step n={3}>컬럼 매핑을 확인한 후 [업로드 확정]합니다.</Step>
          </View>
        </View>

        <View style={S.colDivider} />

        {/* RIGHT */}
        <View style={S.colRight}>
          <SectionHead>4. 직원 초대 &amp; 퇴사 처리</SectionHead>
          <View style={S.sub}>
            <SubHead>앱 사용 초대 (이메일 발송)</SubHead>
            <Step n={1}>직원 상세 화면에서 [이메일 초대] 버튼을 클릭합니다.</Step>
            <Step n={2}>직원에게 초대 이메일이 자동 발송됩니다.</Step>
            <Step n={3}>직원이 링크를 클릭해 비밀번호를 설정하면 가입이 완료됩니다.</Step>
            <TipBox>초대 링크는 24시간 동안 유효합니다. 만료 시 재발송해 주세요.</TipBox>
          </View>
          <View style={S.sub}>
            <SubHead>퇴사 처리</SubHead>
            <Step n={1}>직원 상세 화면 하단의 [퇴사 처리] 버튼을 클릭합니다.</Step>
            <Step n={2}>퇴사일과 퇴사 사유를 입력합니다.</Step>
            <Step n={3}>확인 후 저장하면 해당 직원은 퇴사자 목록으로 이동됩니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>퇴사자 목록 조회</SubHead>
            <Step n={1}>[직원 관리] → [퇴사자 관리] 탭을 클릭합니다.</Step>
            <Step n={2}>퇴사한 직원의 이력 및 정보를 조회합니다.</Step>
          </View>
          <NoteBox>퇴사 처리 후에는 해당 직원이 앱에 로그인할 수 없습니다.</NoteBox>
        </View>
      </View>
      <Footer page={4} total={TOTAL} />
    </Page>
  )
}

/* ── 매니저 3: 급여 관리 ── */
function M_Payroll() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <TopBar section="급여 관리" role="매니저" />
      <View style={S.body}>
        {/* LEFT */}
        <View style={S.colLeft}>
          <SectionHead>5. 급여명세서 조회 &amp; 업로드</SectionHead>
          <View style={S.sub}>
            <SubHead>급여명세서 조회</SubHead>
            <Step n={1}>사이드바에서 [급여 관리]를 클릭합니다.</Step>
            <Step n={2}>귀속 월을 선택합니다 (예: 2025년 05월).</Step>
            <Step n={3}>직원 목록과 지급 금액, 공제 내역을 확인합니다.</Step>
            <Step n={4}>개별 직원 이름을 클릭하면 상세 명세서가 표시됩니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>급여 데이터 업로드 (CSV)</SubHead>
            <Step n={1}>[급여 관리] → [급여 업로드]를 클릭합니다.</Step>
            <Step n={2}>귀속 월을 선택한 후 CSV 파일을 업로드합니다.</Step>
            <Step n={3}>자동으로 컬럼을 매핑하며, 수동 수정도 가능합니다.</Step>
            <Step n={4}>미리보기에서 내용을 확인 후 [저장]합니다.</Step>
            <TipBox>첫 업로드 시 컬럼 매핑을 저장하면 이후 자동으로 적용됩니다.</TipBox>
          </View>
        </View>

        <View style={S.colDivider} />

        {/* RIGHT */}
        <View style={S.colRight}>
          <SectionHead>6. 급여명세서 직원 발송</SectionHead>
          <View style={S.sub}>
            <SubHead>이메일 일괄 발송</SubHead>
            <Step n={1}>해당 귀속 월 급여 화면에서 [명세서 발송] 버튼을 클릭합니다.</Step>
            <Step n={2}>발송할 직원을 선택하거나 전체 선택합니다.</Step>
            <Step n={3}>[이메일 발송]을 클릭하면 직원 각자에게 자동 발송됩니다.</Step>
            <Step n={4}>직원은 이메일로 급여명세서를 확인하거나 앱에서 직접 조회합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>지급 내역 수정</SubHead>
            <Step n={1}>직원별 명세서 상세 화면에서 항목을 직접 수정합니다.</Step>
            <Step n={2}>수정 후 [저장]하면 즉시 반영됩니다.</Step>
            <Step n={3}>수정 후 재발송이 필요하면 다시 이메일 발송을 진행합니다.</Step>
          </View>
          <InfoBox>급여 데이터는 귀속 월 기준으로 관리됩니다. 월이 다른 데이터는 해당 월을 선택해 조회하세요.</InfoBox>
          <NoteBox>발송된 이메일은 취소되지 않습니다. 발송 전 금액을 꼼꼼히 확인하세요.</NoteBox>
        </View>
      </View>
      <Footer page={5} total={TOTAL} />
    </Page>
  )
}

/* ── 매니저 4: 연차·휴가 ── */
function M_Leave() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <TopBar section="연차·휴가 관리" role="매니저" />
      <View style={S.body}>
        {/* LEFT */}
        <View style={S.colLeft}>
          <SectionHead>7. 연차 승인·반려</SectionHead>
          <View style={S.sub}>
            <SubHead>신청 목록 확인</SubHead>
            <Step n={1}>사이드바에서 [연차/휴가]를 클릭합니다.</Step>
            <Step n={2}>대기 중인 신청 건이 상단에 표시됩니다.</Step>
            <Step n={3}>직원명, 유형(연차/반차/시간연차), 기간을 확인합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>승인</SubHead>
            <Step n={1}>신청 항목에서 [승인] 버튼을 클릭합니다.</Step>
            <Step n={2}>승인 즉시 직원에게 이메일로 통보됩니다.</Step>
            <Step n={3}>직원의 잔여 연차에서 자동으로 차감됩니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>반려</SubHead>
            <Step n={1}>신청 항목에서 [반려] 버튼을 클릭합니다.</Step>
            <Step n={2}>반려 사유를 입력합니다.</Step>
            <Step n={3}>직원에게 반려 사유가 포함된 이메일이 발송됩니다.</Step>
          </View>
        </View>

        <View style={S.colDivider} />

        {/* RIGHT */}
        <View style={S.colRight}>
          <SectionHead>8. 연차 정책 설정</SectionHead>
          <View style={S.sub}>
            <SubHead>연차 정책 구성</SubHead>
            <Step n={1}>[연차/휴가] → [연차 설정] 탭을 클릭합니다.</Step>
            <Step n={2}>연간 기본 연차 일수를 설정합니다.</Step>
            <Step n={3}>반차·시간연차 허용 여부를 선택합니다.</Step>
            <Step n={4}>[저장]하면 전체 직원에게 적용됩니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>연차 잔액 확인</SubHead>
            <Step n={1}>직원 목록에서 개별 직원의 잔여 연차를 확인합니다.</Step>
            <Step n={2}>필요 시 수동으로 잔액을 조정할 수 있습니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>연차 신청 취소</SubHead>
            <Step n={1}>직원이 승인된 연차를 취소하면 매니저에게 알림이 발송됩니다.</Step>
            <Step n={2}>취소 처리 시 잔여 연차가 자동 복원됩니다.</Step>
          </View>
          <TipBox>매월 1일 자정에 연차가 자동 부여됩니다 (근속 기간에 따라 산정).</TipBox>
        </View>
      </View>
      <Footer page={6} total={TOTAL} />
    </Page>
  )
}

/* ── 매니저 5: 근태 & 서류 & 기타 ── */
function M_AttendanceDocs() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <TopBar section="근태 &amp; 서류 &amp; 기타" role="매니저" />
      <View style={S.body}>
        {/* LEFT */}
        <View style={S.colLeft}>
          <SectionHead>9. 근태 관리</SectionHead>
          <View style={S.sub}>
            <SubHead>근태 현황 조회</SubHead>
            <Step n={1}>사이드바에서 [근태관리]를 클릭합니다.</Step>
            <Step n={2}>날짜 범위를 설정하고 직원별 출퇴근 기록을 확인합니다.</Step>
            <Step n={3}>[근태 요약] 탭에서 부서별·기간별 통계를 조회합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>출근 시간 설정</SubHead>
            <Step n={1}>[근태관리] → [설정] 탭을 클릭합니다.</Step>
            <Step n={2}>[출근 시간 설정] 섹션에서 회사 출근 시각을 입력합니다 (기본값 09:00).</Step>
            <Step n={3}>[출근 시간 저장]을 클릭하면 즉시 적용됩니다.</Step>
            <Step n={4}>설정된 출근 시간 5분 전에 직원에게 자동 알림이 발송됩니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>회사 위치 및 알림 설정</SubHead>
            <Step n={1}>GPS 출근 허용 반경을 설정합니다 (기본 100m).</Step>
            <Step n={2}>소급 입력 알림 수신 여부를 토글로 설정합니다.</Step>
          </View>
          <InfoBox>출근 알림은 평일(공휴일 제외)에만 발송됩니다. 출근 후 9시간 경과 시 퇴근 알림도 자동 발송됩니다.</InfoBox>
        </View>

        <View style={S.colDivider} />

        {/* RIGHT */}
        <View style={S.colRight}>
          <SectionHead>10. 서류 발급 &amp; 기타</SectionHead>
          <View style={S.sub}>
            <SubHead>서류 발급 요청 처리</SubHead>
            <Step n={1}>사이드바에서 [서류 발급]을 클릭합니다.</Step>
            <Step n={2}>직원의 재직·경력증명서 발급 요청 목록을 확인합니다.</Step>
            <Step n={3}>요청 내용과 제출 용도를 확인 후 담당 세무사에게 발송합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>회사 정보 관리</SubHead>
            <Step n={1}>[회사 정보] 메뉴에서 회사 기본 정보를 수정합니다.</Step>
            <Step n={2}>대표자명, 주소, 사업자번호 등을 최신 상태로 유지합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>가입 요청 처리</SubHead>
            <Step n={1}>[가입 요청] 메뉴에서 신규 가입 신청을 확인합니다.</Step>
            <Step n={2}>내용 검토 후 승인 또는 반려합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead>내 프로필</SubHead>
            <Step n={1}>사이드바 하단 또는 우측 상단의 프로필 아이콘을 클릭합니다.</Step>
            <Step n={2}>내 정보를 확인하고 필요 시 수정합니다.</Step>
          </View>
        </View>
      </View>
      <Footer page={7} total={TOTAL} />
    </Page>
  )
}

/* ── 직원 1: 로그인 & 홈 ── */
function E_LoginHome() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <TopBar section="로그인 &amp; 홈" role="직원" />
      <View style={S.body}>
        {/* LEFT */}
        <View style={S.colLeft}>
          <SectionHead>1. 로그인</SectionHead>
          <View style={S.sub}>
            <SubHead green>최초 가입 (초대 이메일)</SubHead>
            <Step n={1} green>회사 담당자로부터 초대 이메일을 수신합니다.</Step>
            <Step n={2} green>이메일 내 [가입 완료하기] 버튼을 클릭합니다.</Step>
            <Step n={3} green>사용할 비밀번호를 입력합니다 (8자 이상).</Step>
            <Step n={4} green>설정 완료 후 자동으로 내 홈 화면으로 이동합니다.</Step>
            <TipBox>초대 링크는 24시간 유효합니다. 만료 시 담당 매니저에게 재발송을 요청하세요.</TipBox>
          </View>
          <View style={S.sub}>
            <SubHead green>재로그인</SubHead>
            <Step n={1} green>서비스 주소를 브라우저에 입력합니다.</Step>
            <Step n={2} green>이메일과 비밀번호를 입력 후 [로그인]을 클릭합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>비밀번호 재설정</SubHead>
            <Step n={1} green>로그인 화면 하단 [비밀번호를 잊으셨나요?]를 클릭합니다.</Step>
            <Step n={2} green>가입 시 사용한 이메일 주소를 입력합니다.</Step>
            <Step n={3} green>이메일 수신 후 링크를 클릭해 새 비밀번호를 설정합니다.</Step>
          </View>
        </View>

        <View style={S.colDivider} />

        {/* RIGHT */}
        <View style={S.colRight}>
          <SectionHead>2. 홈 화면</SectionHead>
          <View style={S.sub}>
            <SubHead green>홈 화면에서 확인 가능한 정보</SubHead>
            <Step n={1} green>이번 달 예상 실수령액 요약</Step>
            <Step n={2} green>잔여 연차 일수</Step>
            <Step n={3} green>최근 급여명세서 내역</Step>
            <Step n={4} green>처리 중인 연차 신청 현황</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>화면 구성</SubHead>
            <Step n={1} green>왼쪽 사이드바: 급여명세서, 연차/휴가, 근태, 서류 발급, 내 정보</Step>
            <Step n={2} green>중앙 영역: 선택한 메뉴의 내용</Step>
          </View>
          <InfoBox>모바일 기기에서도 동일한 주소로 접속해 사용할 수 있습니다.</InfoBox>
        </View>
      </View>
      <Footer page={9} total={TOTAL} />
    </Page>
  )
}

/* ── 직원 2: 급여명세서 & 연차 ── */
function E_PayslipLeave() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <TopBar section="급여명세서 &amp; 연차 신청" role="직원" />
      <View style={S.body}>
        {/* LEFT */}
        <View style={S.colLeft}>
          <SectionHead>3. 급여명세서 확인</SectionHead>
          <View style={S.sub}>
            <SubHead green>급여명세서 목록 조회</SubHead>
            <Step n={1} green>사이드바에서 [급여명세서]를 클릭합니다.</Step>
            <Step n={2} green>월별 급여명세서 목록이 표시됩니다.</Step>
            <Step n={3} green>확인할 월을 클릭합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>상세 내역 확인</SubHead>
            <Step n={1} green>기본급, 각종 수당, 공제 항목(4대 보험, 소득세 등)을 확인합니다.</Step>
            <Step n={2} green>하단에서 실수령액을 확인합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>이메일 수신</SubHead>
            <Step n={1} green>매니저가 발송하면 등록된 이메일로 급여명세서가 전송됩니다.</Step>
            <Step n={2} green>이메일에서 직접 확인하거나 앱에서 조회할 수 있습니다.</Step>
          </View>
          <InfoBox>급여명세서가 보이지 않으면 담당 매니저에게 발송 여부를 확인하세요.</InfoBox>
        </View>

        <View style={S.colDivider} />

        {/* RIGHT */}
        <View style={S.colRight}>
          <SectionHead>4. 연차 신청</SectionHead>
          <View style={S.sub}>
            <SubHead green>연차 신청 방법</SubHead>
            <Step n={1} green>사이드바에서 [연차/휴가]를 클릭합니다.</Step>
            <Step n={2} green>[연차 신청] 버튼을 클릭합니다.</Step>
            <Step n={3} green>유형을 선택합니다: 연차(1일) / 오전 반차 / 오후 반차 / 시간연차</Step>
            <Step n={4} green>사용 날짜와 사유를 입력합니다.</Step>
            <Step n={5} green>[신청] 버튼을 클릭하면 담당 매니저에게 알림이 발송됩니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>신청 내역 확인</SubHead>
            <Step n={1} green>신청 목록에서 승인 대기·승인·반려 상태를 확인합니다.</Step>
            <Step n={2} green>승인 또는 반려 시 이메일로 알림을 수신합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>신청 취소</SubHead>
            <Step n={1} green>승인된 연차도 사용 전에는 취소 신청이 가능합니다.</Step>
            <Step n={2} green>취소 처리 후 연차 잔액이 자동 복원됩니다.</Step>
          </View>
          <TipBox>잔여 연차가 부족하면 신청이 제한될 수 있습니다. 홈에서 잔액을 확인하세요.</TipBox>
        </View>
      </View>
      <Footer page={10} total={TOTAL} />
    </Page>
  )
}

/* ── 직원 3: 근태 & 서류 & 프로필 ── */
function E_AttendanceDocs() {
  return (
    <Page size="A4" orientation="landscape" style={S.page}>
      <TopBar section="근태 &amp; 서류 &amp; 내 정보" role="직원" />
      <View style={S.body}>
        {/* LEFT */}
        <View style={S.colLeft}>
          <SectionHead>5. 근태 기록</SectionHead>
          <View style={S.sub}>
            <SubHead green>출퇴근 알림 구독</SubHead>
            <Step n={1} green>사이드바에서 [근태]를 클릭합니다.</Step>
            <Step n={2} green>상단의 [출퇴근 알림 받기] 버튼을 클릭합니다.</Step>
            <Step n={3} green>브라우저 알림 허용 팝업에서 [허용]을 선택합니다.</Step>
            <Step n={4} green>출근 시간 5분 전과 퇴근 예상 시간에 자동 알림이 옵니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>출퇴근 기록 확인</SubHead>
            <Step n={1} green>본인의 출퇴근 기록을 날짜별로 확인합니다.</Step>
            <Step n={2} green>출근 시각, 퇴근 시각, 근무 시간이 표시됩니다.</Step>
          </View>
          <InfoBox>출퇴근 알림은 평일(공휴일 제외)에만 발송됩니다. 출근 후 9시간 경과 시 퇴근 알림도 자동 발송됩니다.</InfoBox>

          <SectionHead style={{ marginTop: 12 }}>6. 서류 발급 신청</SectionHead>
          <View style={S.sub}>
            <SubHead green>재직·경력증명서 신청</SubHead>
            <Step n={1} green>사이드바에서 [서류 발급]을 클릭합니다.</Step>
            <Step n={2} green>서류 종류를 선택합니다: 재직증명서 / 경력증명서</Step>
            <Step n={3} green>제출 용도와 필요한 기간을 입력합니다.</Step>
            <Step n={4} green>[신청] 버튼을 클릭하면 담당자에게 요청이 전달됩니다.</Step>
            <Step n={5} green>처리 완료 시 등록된 이메일로 서류가 발송됩니다.</Step>
          </View>
          <TipBox>서류 발급에는 1~3 영업일이 소요될 수 있습니다.</TipBox>
        </View>

        <View style={S.colDivider} />

        {/* RIGHT */}
        <View style={S.colRight}>
          <SectionHead>7. 내 정보</SectionHead>
          <View style={S.sub}>
            <SubHead green>프로필 확인</SubHead>
            <Step n={1} green>사이드바 하단의 [내 정보]를 클릭합니다.</Step>
            <Step n={2} green>이름, 소속, 입사일 등 기본 정보를 확인합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>급여 이력 확인</SubHead>
            <Step n={1} green>사이드바에서 [급여 이력]을 클릭합니다.</Step>
            <Step n={2} green>과거 월별 급여 내역을 한 번에 조회합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>비밀번호 변경</SubHead>
            <Step n={1} green>로그아웃 후 로그인 화면에서 [비밀번호를 잊으셨나요?]를 클릭합니다.</Step>
            <Step n={2} green>이메일로 재설정 링크를 받아 변경합니다.</Step>
          </View>
          <View style={S.sub}>
            <SubHead green>로그아웃</SubHead>
            <Step n={1} green>상단 우측 또는 사이드바 하단의 로그아웃 버튼을 클릭합니다.</Step>
          </View>
          <NoteBox>개인정보 수정이 필요하면 담당 매니저에게 요청해 주세요.</NoteBox>
        </View>
      </View>
      <Footer page={11} total={TOTAL} />
    </Page>
  )
}

/* ───────────── Document ───────────── */
export function UserManualPdf() {
  return (
    <Document title="ModuHR 사용 매뉴얼" author="ModuHR" subject="매니저 및 직원 사용 안내">
      <CoverPage />

      {/* PART 1 */}
      <PartDivider
        part="01"
        title="매니저 가이드"
        sub="고객사 담당자를 위한 사용 안내"
      />
      <M_LoginDashboard />
      <M_Employees />
      <M_Payroll />
      <M_Leave />
      <M_AttendanceDocs />

      {/* PART 2 */}
      <PartDivider
        part="02"
        title="직원 가이드"
        sub="서비스를 사용하는 직원을 위한 사용 안내"
      />
      <E_LoginHome />
      <E_PayslipLeave />
      <E_AttendanceDocs />
    </Document>
  )
}
