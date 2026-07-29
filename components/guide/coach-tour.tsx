'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { TOUR_STEPS, tourStorageKey, type TourStep } from '@/lib/guide/tour'

const PAD       = 6    // 강조 영역 여백
const CARD_W    = 320
const CARD_H    = 210  // 카드 배치 계산용 예상 높이

/** data-tour 로 요소 찾기 — 화면에 보이는 첫 번째 것 */
function findEl(targets?: string[]): HTMLElement | null {
  if (!targets?.length) return null
  for (const t of targets) {
    const el = document.querySelector<HTMLElement>(`[data-tour="${t}"]`)
    if (!el || el.getClientRects().length === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

interface Props {
  role:   'manager' | 'employee'
  userId: string
}

/**
 * 첫 로그인 코치마크 투어
 * - 최초 1회만 자동 실행 (localStorage 기록)
 * - `?tour=1` 쿼리로 언제든 다시 실행
 * - 마지막 단계에서 사용 설명서로 안내
 */
export function CoachTour({ role, userId }: Props) {
  const router = useRouter()
  const [steps, setSteps] = useState<TourStep[] | null>(null)
  const [idx,   setIdx]   = useState(0)
  const [rect,  setRect]  = useState<DOMRect | null>(null)

  /* ── 시작 여부 판단 ── */
  useEffect(() => {
    let forced = false
    try {
      const params = new URLSearchParams(window.location.search)
      forced = params.get('tour') === '1'
      if (forced) {
        params.delete('tour')
        const qs = params.toString()
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
      }
      if (!forced && window.localStorage.getItem(tourStorageKey(role, userId))) return
    } catch {
      // localStorage 차단 환경 — 투어는 그대로 진행
    }

    // 화면 렌더가 끝난 뒤 대상 요소를 찾는다
    const timer = setTimeout(() => {
      const usable = TOUR_STEPS[role].filter(s => !s.targets?.length || findEl(s.targets))
      if (usable.length > 0) {
        setSteps(usable)
        setIdx(0)
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [role, userId])

  const current = steps?.[idx] ?? null

  /* ── 대상 위치 측정 ── */
  useEffect(() => {
    if (!current) return
    const el = findEl(current.targets)
    if (!el) { setRect(null); return }

    el.scrollIntoView({ block: 'center', behavior: 'smooth' })

    const measure = () => {
      const found = findEl(current.targets)
      setRect(found ? found.getBoundingClientRect() : null)
    }
    measure()
    const t1 = setTimeout(measure, 200)
    const t2 = setTimeout(measure, 500)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t1); clearTimeout(t2)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [current])

  /* ── 종료 ── */
  const finish = useCallback((openGuide = false) => {
    try { window.localStorage.setItem(tourStorageKey(role, userId), '1') } catch { /* noop */ }
    setSteps(null)
    if (openGuide) router.push('/guide')
  }, [role, userId, router])

  /* ── ESC 로 닫기 ── */
  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, finish])

  if (!steps || !current) return null

  const total = steps.length
  const box = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(CARD_W, vw - 24)

  let cardStyle: CSSProperties
  if (box) {
    const below      = box.top + box.height + 12
    const placeBelow = below + CARD_H < vh
    cardStyle = {
      top:   placeBelow ? below : Math.max(12, box.top - CARD_H - 12),
      left:  Math.min(Math.max(12, box.left), Math.max(12, vw - cardW - 12)),
      width: cardW,
    }
  } else {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: cardW }
  }

  return (
    <div className="fixed inset-0 z-[70] print:hidden">
      {/* 클릭 차단 레이어 */}
      <div className="absolute inset-0" />

      {/* 스포트라이트 (대상이 없으면 전체 딤) */}
      {box ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-blue-400 transition-all duration-200"
          style={{ ...box, boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/60" />
      )}

      {/* 안내 카드 */}
      <div className="absolute rounded-2xl bg-white p-4 shadow-2xl" style={cardStyle}>
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            <Sparkles size={10} />
            {idx + 1} / {total}
          </span>
          <button
            onClick={() => finish()}
            aria-label="투어 닫기"
            className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
          >
            <X size={14} />
          </button>
        </div>

        <h3 className="text-sm font-semibold text-slate-900">{current.title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{current.body}</p>

        <div className="mt-3.5 flex items-center justify-between gap-2">
          {!current.final ? (
            <button onClick={() => finish()} className="text-[11px] text-slate-400 hover:text-slate-600">
              건너뛰기
            </button>
          ) : <span />}

          <div className="flex items-center gap-1.5">
            {idx > 0 && (
              <button
                onClick={() => setIdx(i => Math.max(0, i - 1))}
                className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft size={12} />
                이전
              </button>
            )}
            {current.final ? (
              <button
                onClick={() => finish(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#003366] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#002244]"
              >
                <BookOpen size={12} />
                사용 설명서 열기
              </button>
            ) : (
              <button
                onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
                className="inline-flex items-center gap-0.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700"
              >
                다음
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
