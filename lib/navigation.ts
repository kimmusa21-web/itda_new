import { Bell, Building2, Users, Upload, Home, BarChart3, Wallet, User, UserPlus, ClipboardList, Eye, BadgeDollarSign, Settings, FileText, FolderOpen, CalendarDays, Clock, BookOpen, type LucideIcon } from 'lucide-react'
import type { Role } from '@/types'
import type { FeatureKey } from '@/lib/features'

export type { Role }

export type NavItem = { label: string; href: string; icon: LucideIcon; featureKeys?: FeatureKey[] }
export type RoleNavMap = Record<Role, NavItem[]>

/** 데스크톱 사이드바 전체 메뉴 */
export const roleNavMap: RoleNavMap = {
  admin: [
    { label: '대시보드/알림', href: '/admin',                 icon: Home            },
    { label: '기업관리',      href: '/admin/companies',       icon: Building2       },
    { label: '직원관리',      href: '/admin/employees',        icon: Users           },
    { label: '급여조회',      href: '/admin/payroll',          icon: BarChart3       },
    { label: '근태관리',      href: '/admin/attendance',       icon: Clock           },
    { label: '퇴직금 산정',   href: '/admin/severance',       icon: BadgeDollarSign },
    { label: '이직확인서',    href: '/admin/separation',      icon: FileText        },
    { label: '점검 모드',     href: '/admin/impersonation',   icon: Eye             },
    { label: '내 정보',       href: '/admin/profile',          icon: Settings        },
    { label: '사용 설명서',   href: '/guide',                  icon: BookOpen        },
  ],
  manager: [
    { label: '홈',         href: '/manager',              icon: Home           },
    { label: '기업관리',   href: '/manager/company',      icon: Building2      },
    { label: '직원관리',   href: '/manager/employees',    icon: Users          },
    { label: '급여조회',   href: '/manager/payroll',      icon: BarChart3,     featureKeys: ['payroll']    },
    { label: '서류관리',   href: '/manager/documents',    icon: FolderOpen,    featureKeys: ['documents']  },
    { label: '연차관리',   href: '/manager/leave',        icon: CalendarDays,  featureKeys: ['leave']      },
    { label: '근태관리',   href: '/manager/attendance',   icon: Clock,         featureKeys: ['attendance'] },
    { label: '내 정보',    href: '/manager/profile',      icon: Settings       },
    { label: '사용 설명서', href: '/guide',               icon: BookOpen       },
  ],
  employee: [
    { label: '홈',         href: '/employee',            icon: Home                                            },
    { label: '급여',       href: '/employee/payslips',   icon: Wallet,       featureKeys: ['payroll']          },
    { label: '서류신청',   href: '/employee/documents',  icon: FolderOpen,   featureKeys: ['documents']        },
    { label: '연차',       href: '/employee/leave',      icon: CalendarDays, featureKeys: ['leave']            },
    { label: '출퇴근',     href: '/employee/attendance', icon: Clock,        featureKeys: ['attendance']       },
    { label: '내 정보',    href: '/employee/profile',    icon: User                                            },
    { label: '사용 설명서', href: '/guide',              icon: BookOpen                                        },
  ],
}

/** 모바일 하단 탭바 전용 — 핵심 항목만 (최대 5개) */
export const mobileNavMap: RoleNavMap = {
  admin: [
    { label: '대시보드', href: '/admin',                icon: Home      },
    { label: '직원관리', href: '/admin/employees',      icon: Users     },
    { label: '급여조회', href: '/admin/payroll',        icon: BarChart3 },
    { label: '근태관리', href: '/admin/attendance',     icon: Clock     },
    { label: '기업',     href: '/admin/companies',      icon: Building2 },
  ],
  manager: [
    { label: '홈',       href: '/manager',              icon: Home                                                   },
    { label: '직원관리', href: '/manager/employees',    icon: Users                                                  },
    { label: '급여조회', href: '/manager/payroll',      icon: BarChart3,    featureKeys: ['payroll']                 },
    { label: '근태현황', href: '/manager/attendance',   icon: Clock,        featureKeys: ['attendance']              },
    { label: '연차/서류', href: '/manager/leave',       icon: CalendarDays, featureKeys: ['leave', 'documents']      },
  ],
  employee: [
    { label: '홈',       href: '/employee',            icon: Home                                                    },
    { label: '급여',     href: '/employee/payslips',   icon: Wallet,       featureKeys: ['payroll']                  },
    { label: '출퇴근',   href: '/employee/attendance', icon: Clock,        featureKeys: ['attendance']               },
    { label: '연차/서류', href: '/employee/leave',     icon: CalendarDays, featureKeys: ['leave', 'documents']       },
    { label: '내 정보',  href: '/employee/profile',    icon: User                                                    },
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
    '/admin':                        '대시보드/알림',
    '/admin/companies':              '기업관리',
    '/admin/employees':              '직원관리',
    '/admin/employees/resigned':     '퇴사자 관리',
    '/admin/employees/upload':       '직원 CSV 대량 등록',
    '/admin/payroll':                '급여 조회',
    '/admin/payroll/upload':         '급여업로드',
    '/admin/impersonation':          '점검 모드',
    '/admin/severance':              '퇴직금 산정',
    '/admin/separation':             '이직확인서',
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
    '/employee/documents':           '서류신청',
    '/manager/documents':            '서류관리',
    '/manager/leave':                '연차/서류',
    '/manager/leave/settings':       '연차 정책 설정',
    '/employee/leave':               '연차/서류',
    '/employee/attendance':          '출퇴근',
    '/manager/attendance':           '근태관리',
    '/manager/attendance/settings':  '출퇴근 설정',
    '/admin/attendance':             '근태관리',
    '/guide':                        '사용 설명서',
  }
  return map[pathname] ?? 'ModuHR'
}
