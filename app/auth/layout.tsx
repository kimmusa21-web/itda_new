/* ================================================================
   /auth/* 레이아웃
   로그인 없이 접근 가능한 공개 페이지 (인증번호 입력 등)
   사이드바/헤더 없이 단순 풀스크린 레이아웃
================================================================ */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      {children}
    </div>
  )
}
