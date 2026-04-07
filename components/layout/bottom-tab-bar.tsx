'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { roleNavMap, type Role } from '@/lib/navigation'
import { cn } from '@/lib/utils'

export default function BottomTabBar({ role }: { role: Role }) {
  const pathname = usePathname()
  const navItems = roleNavMap[role].slice(0, 5)
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
      <div className="flex items-stretch h-[60px]">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-h-[44px]',
                active ? 'text-blue-600' : 'text-slate-400')}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
