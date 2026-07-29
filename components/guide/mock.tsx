import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ================================================================
   사용설명서 화면 목업 프리미티브
   실제 화면을 축소 재현한 그림 + 빨간 번호 마커로 구성
================================================================ */

/** 브라우저 창 프레임 */
export function Shot({ url, children, className }: { url?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white overflow-hidden', className)}>
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border-b border-slate-200">
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        <span className="ml-1.5 flex-1 truncate rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[9px] text-slate-400">
          {url ?? 'moduhr.app'}
        </span>
      </div>
      <div className="p-3 bg-slate-50">{children}</div>
    </div>
  )
}

/** 빨간 강조 박스 + 번호 마커 */
export function Mark({ n, children, className, inline }: { n: number; children: ReactNode; className?: string; inline?: boolean }) {
  return (
    <div className={cn('relative rounded-lg border-2 border-red-500 p-1.5', inline && 'inline-block align-top', className)}>
      <span className="absolute -top-2.5 -left-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
        {n}
      </span>
      {children}
    </div>
  )
}

/** 좌측 사이드바가 있는 화면 레이아웃 */
export function WithNav({ nav, active, children }: { nav: string[]; active?: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <SideNav items={nav} active={active} />
      <div className="flex-1 min-w-0 space-y-2">{children}</div>
    </div>
  )
}

export function SideNav({ items, active, className }: { items: string[]; active?: string; className?: string }) {
  return (
    <div className={cn('hidden sm:flex w-[86px] flex-shrink-0 flex-col gap-0.5 rounded-lg bg-[#0f172a] p-1.5', className)}>
      <p className="px-1 pb-1.5 text-[9px] font-bold text-white">ModuHR</p>
      {items.map(i => (
        <span
          key={i}
          className={cn(
            'rounded px-1.5 py-[3px] text-[8.5px] truncate',
            i === active ? 'bg-[#1e293b] text-white font-medium' : 'text-slate-400',
          )}
        >
          {i}
        </span>
      ))}
    </div>
  )
}

/** 화면 제목 영역 */
export function MHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        {sub && <p className="text-[8.5px] text-slate-400 truncate">{sub}</p>}
        <p className="text-[11px] font-semibold text-slate-900 truncate">{title}</p>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}

/** 카드 */
export function MCard({ title, right, children, className }: { title?: string; right?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white overflow-hidden', className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-slate-100">
          <span className="text-[9px] font-semibold text-slate-700 truncate">{title}</span>
          {right && <span className="text-[8px] text-slate-400 flex-shrink-0">{right}</span>}
        </div>
      )}
      {children && <div className="p-2 space-y-1.5">{children}</div>}
    </div>
  )
}

/** 버튼 */
export function MBtn({
  children,
  tone = 'primary',
  full,
  className,
}: {
  children: ReactNode
  tone?: 'primary' | 'navy' | 'secondary' | 'danger' | 'ghost'
  full?: boolean
  className?: string
}) {
  const tones = {
    primary:   'bg-blue-600 text-white',
    navy:      'bg-[#003366] text-white',
    secondary: 'bg-white text-slate-600 border border-slate-200',
    danger:    'bg-red-500 text-white',
    ghost:     'bg-slate-100 text-slate-500',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md px-2 py-1 text-[9px] font-medium',
        tones[tone],
        full && 'w-full',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** 입력 필드 */
export function MField({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[8px] text-slate-500">{label}</p>
      <div className="rounded-md border border-slate-200 bg-white px-2 py-1">
        <span className={cn('text-[9px]', value ? 'text-slate-700' : 'text-slate-300')}>
          {value ?? placeholder ?? ''}
        </span>
      </div>
    </div>
  )
}

/** 목록 행 */
export function MRow({ name, sub, right, tone = 'slate' }: { name: string; sub?: string; right?: ReactNode; tone?: 'slate' | 'blue' | 'emerald' | 'amber' }) {
  const avatar = {
    slate:   'bg-slate-200 text-slate-600',
    blue:    'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber:   'bg-amber-100 text-amber-700',
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-semibold', avatar[tone])}>
        {name.slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[9px] font-medium text-slate-800">{name}</span>
        {sub && <span className="block truncate text-[8px] text-slate-400">{sub}</span>}
      </span>
      {right && <span className="flex-shrink-0">{right}</span>}
    </div>
  )
}

/** 통계 카드 */
export function MStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-2 py-1.5">
      <p className="text-[8px] text-slate-500">{label}</p>
      <p className="text-[12px] font-semibold text-slate-900 leading-tight">
        {value}
        {unit && <span className="ml-0.5 text-[8px] font-normal text-slate-400">{unit}</span>}
      </p>
    </div>
  )
}

/** 탭 */
export function MTabs({ items, active }: { items: string[]; active: string }) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
      {items.map(i => (
        <span
          key={i}
          className={cn(
            'flex-1 rounded-md px-1.5 py-1 text-center text-[9px] font-medium',
            i === active ? 'bg-[#003366] text-white' : 'text-slate-500',
          )}
        >
          {i}
        </span>
      ))}
    </div>
  )
}

/** 배지 */
export function MBadge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'blue' | 'amber' | 'red' | 'indigo' }) {
  const tones = {
    gray:   'bg-slate-100 text-slate-500',
    green:  'bg-emerald-50 text-emerald-600',
    blue:   'bg-blue-50 text-blue-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-500',
    indigo: 'bg-indigo-50 text-indigo-600',
  }
  return <span className={cn('inline-flex rounded-full px-1.5 py-[1px] text-[8px] font-medium', tones[tone])}>{children}</span>
}

/** 표 */
export function MTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex bg-slate-50 border-b border-slate-200">
        {cols.map(c => (
          <span key={c} className="flex-1 truncate px-1.5 py-1 text-[8px] font-semibold text-slate-500">{c}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} className={cn('flex', i > 0 && 'border-t border-slate-100')}>
          {r.map((c, j) => (
            <span key={j} className="flex-1 truncate px-1.5 py-1 text-[8.5px] text-slate-700">{c}</span>
          ))}
        </div>
      ))}
    </div>
  )
}

/** 모바일 화면 프레임 (직원 가이드용) */
export function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[240px] rounded-[20px] border-[6px] border-slate-800 bg-slate-50 overflow-hidden', className)}>
      <div className="flex items-center justify-between bg-slate-800 px-3 py-1">
        <span className="text-[7px] text-slate-300">9:41</span>
        <span className="text-[7px] text-slate-300">ModuHR</span>
      </div>
      <div className="p-2.5 space-y-2">{children}</div>
    </div>
  )
}

/** 모바일 하단 탭바 */
export function PhoneTabs({ items, active }: { items: string[]; active: string }) {
  return (
    <div className="flex items-stretch rounded-lg border border-slate-200 bg-white">
      {items.map(i => (
        <span
          key={i}
          className={cn(
            'flex-1 py-1 text-center text-[7.5px] font-medium',
            i === active ? 'text-blue-600' : 'text-slate-400',
          )}
        >
          {i}
        </span>
      ))}
    </div>
  )
}
