import { cn } from '@/lib/utils'
import { roleLabels, roleColors, type Role } from '@/lib/navigation'

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
