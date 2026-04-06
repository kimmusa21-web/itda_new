import { Bell, Building2, Users, Upload, Home, BarChart3, MoreHorizontal, Wallet, User, FileText, type LucideIcon } from 'lucide-react'
import type { Role } from '@/types'

export type { Role }

export type NavItem = { label: string; href: string; icon: LucideIcon }
export type RoleNavMap = Record<Role, NavItem[]>

export const roleNavMap: RoleNavMap = {
  admin: [
    { label: '대시보드',  href: '/admin',                    icon: Home       },
    { label: '기업신청',  href: '/admin/requests',           icon: Bell       },
    { label: '기업관리',  href: '/admin/companies',          icon: Building2  },
    { label: '직원관리',  href: '/admin/employees',          icon: Users      },
    { label: '급여업로드',href: '/admin/payroll/upload',     icon: Upload     },
    { label: '가입신청',  href: '/admin/employee-requests',  icon: FileText   },
  ],
  manager: [
    { label: '홈',      href: '/manager',           icon: Home           },
    { label: '직원',    href: '/manager/employees', icon: Users          },
    { label: '급여조회', href: '/manager/payroll',   icon: BarChart3      },
    { label: '더보기',  href: '/manager/more',      icon: MoreHorizontal },
  ],
  employee: [
    { label: '홈',      href: '/employee',                icon: Home   },
    { label: '급여',    href: '/employee/payslips',       icon: Wallet },
    { label: '내 정보', href: '/employee/profile',        icon: User   },
  ],
}

export const roleLabels: Record<Role, string> = {
  admin: '시스템 관리자', manager: '기업담당자', employee: '직원',
}

export function getRoleFromPath(pathname: string): Role {
  if (pathname.startsWith('/admin'))   return 'admin'
  if (pathname.startsWith('/manager')) return 'manager'
  return 'employee'
}

export function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/admin': '대시보드', '/admin/requests': '기업신청', '/admin/companies': '기업관리',
    '/admin/employees': '직원관리', '/admin/payroll/upload': '급여 CSV 업로드',
    '/admin/employee-requests': '직원 가입신청',
    '/admin/companies/new': '회사 등록',
    '/auth/verify': '가입 인증',
    '/manager': '홈', '/manager/employees': '직원관리', '/manager/payroll': '급여조회',
    '/manager/employees/create': '직원 등록',
    '/employee': '내 급여', '/employee/payslips': '급여목록',
    '/employee/profile': '내 정보',
  }
  return map[pathname] ?? 'itda'
}
