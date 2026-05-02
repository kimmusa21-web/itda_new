import { Bell, Building2, Users, Upload, Home, BarChart3, Wallet, User, UserPlus, ClipboardList, Eye, BadgeDollarSign, Settings, UserMinus, type LucideIcon } from 'lucide-react'
import type { Role } from '@/types'

export type { Role }

export type NavItem = { label: string; href: string; icon: LucideIcon }
export type RoleNavMap = Record<Role, NavItem[]>

/** 데스크톱 사이드바 전체 메뉴 */
export const roleNavMap: RoleNavMap = {
  admin: [
    { label: '대시보드',   href: '/admin',                   icon: Home            },
    { label: '기업신청',   href: '/admin/requests',          icon: Bell            },
    { label: '기업관리',   href: '/admin/companies',         icon: Building2       },
    { label: '직원관리',   href: '/admin/employees',          icon: Users           },
    { label: '퇴사자관리', href: '/admin/employees/resigned', icon: UserMinus       },
    { label: '급여조회',   href: '/admin/payroll',            icon: BarChart3       },
    { label: '급여업로드', href: '/admin/payroll/upload',    icon: Upload          },
    { label: '퇴직금 산정', href: '/admin/severance',        icon: BadgeDollarSign },
    { label: '점검 모드',  href: '/admin/impersonation',     icon: Eye             },
    { label: '내 정보',    href: '/admin/profile',           icon: Settings        },
  ],
  manager: [
    { label: '홈',         href: '/manager',                  icon: Home           },
    { label: '직원관리',   href: '/manager/employees',          icon: Users          },
    { label: '퇴사자',     href: '/manager/employees/resigned', icon: UserMinus     },
    { label: '급여업로드', href: '/manager/payroll/upload',   icon: Upload         },
    { label: '급여조회',   href: '/manager/payroll',          icon: BarChart3      },
    { label: '기업관리',   href: '/manager/company',          icon: Building2      },
    { label: '내 정보',    href: '/manager/profile',          icon: Settings       },
  ],
  employee: [
    { label: '홈',      href: '/employee',          icon: Home   },
    { label: '급여',    href: '/employee/payslips', icon: Wallet },
    { label: '내 정보', href: '/employee/profile',  icon: User   },
  ],
}

/** 모바일 하단 탭바 전용 — 핵심 항목만 (최대 5개) */
export const mobileNavMap: RoleNavMap = {
  admin: [
    { label: '대시보드', href: '/admin',                icon: Home      },
    { label: '직원',     href: '/admin/employees',      icon: Users     },
    { label: '급여조회', href: '/admin/payroll',        icon: BarChart3 },
    { label: '업로드',   href: '/admin/payroll/upload', icon: Upload    },
    { label: '기업',     href: '/admin/companies',      icon: Building2 },
  ],
  manager: [
    { label: '홈',       href: '/manager',               icon: Home      },
    { label: '직원관리', href: '/manager/employees',     icon: Users     },
    { label: '급여조회', href: '/manager/payroll',       icon: BarChart3 },
    { label: '업로드',   href: '/manager/payroll/upload',icon: Upload    },
    { label: '기업관리', href: '/manager/company',       icon: Building2 },
  ],
  employee: [
    { label: '홈',      href: '/employee',          icon: Home   },
    { label: '급여',    href: '/employee/payslips', icon: Wallet },
    { label: '내 정보', href: '/employee/profile',  icon: User   },
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
    '/admin':                        '대시보드',
    '/admin/requests':               '기업신청',
    '/admin/companies':              '기업관리',
    '/admin/employees':              '직원관리',
    '/admin/employees/resigned':     '퇴사자 관리',
    '/admin/employees/upload':       '직원 CSV 대량 등록',
    '/admin/payroll':                '급여 조회',
    '/admin/payroll/upload':         '급여업로드',
    '/admin/impersonation':          '점검 모드',
    '/admin/severance':              '퇴직금 산정',
    '/admin/profile':                '내 정보',
    '/manager/profile':              '내 정보',
    '/admin/companies/new':          '회사 등록',
    '/auth/verify':                  '가입 인증',
    '/manager':                      '홈',
    '/manager/employees':            '직원관리',
    '/manager/employees/resigned':   '퇴사자 관리',
    '/manager/payroll':              '급여조회',
    '/manager/payroll/upload':       '급여업로드',
    '/manager/employees/create':     '직원 등록',
    '/manager/employees/upload':     '직원 CSV 대량 등록',
    '/manager/requests':             '초대 내역',
    '/manager/company':              '기업관리',
    '/employee':                     '내 급여',
    '/employee/payslips':            '급여목록',
    '/employee/profile':             '내 정보',
  }
  return map[pathname] ?? 'itda'
}
