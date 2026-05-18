import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  dark?: boolean
}

export default function Logo({ className, dark = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="4" width="14" height="2" rx="1" fill="white"/>
          <rect x="2" y="8" width="10" height="2" rx="1" fill="white" opacity="0.7"/>
          <rect x="2" y="12" width="12" height="2" rx="1" fill="white" opacity="0.5"/>
        </svg>
      </div>
      <span className={cn('text-lg font-semibold tracking-tight', dark ? 'text-slate-100' : 'text-slate-900')}>
        ModuHR
      </span>
    </div>
  )
}
