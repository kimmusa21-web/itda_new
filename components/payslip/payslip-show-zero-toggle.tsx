'use client'

import { Eye, EyeOff } from 'lucide-react'

interface ShowZeroToggleProps {
  showZero: boolean
  onChange: (v: boolean) => void
}

export function ShowZeroToggle({ showZero, onChange }: ShowZeroToggleProps) {
  return (
    <button
      onClick={() => onChange(!showZero)}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1 print:hidden"
    >
      {showZero ? <Eye size={13} /> : <EyeOff size={13} />}
      {showZero ? '0원 항목 숨기기' : '0원 항목 보기'}
    </button>
  )
}
