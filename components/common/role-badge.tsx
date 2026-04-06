import { cn } from '@/lib/utils'
import { roleLabels, type Role } from '@/lib/navigation'

const roleColors: Record<Role, string> = {
  admin:    'bg-indigo-100 text-indigo-700',
  manager:  'bg-cyan-100 text-cyan-700',
  employee: 'bg-blue-100 text-blue-700',
}

interface RoleBadgeProps {
  role: Role
  className?: string
}

export default function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
        roleColors[role],
        className,
      )}
    >
      {roleLabels[role]}
    </span>
  )
}
