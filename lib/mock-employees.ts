/** 실제 Supabase employees 테이블 데이터를 반영한 mock */
export interface MockEmployee {
  id: number
  name: string
  email: string
  companyId: number
  companyName: string
}

export const mockEmployees: MockEmployee[] = [
  { id: 7,  name: '김세현', email: 'sh_0124@nate.com',       companyId: 1, companyName: '브이에이성형외과' },
  { id: 6,  name: '김혜영', email: 'rlagd613@naver.com',     companyId: 1, companyName: '브이에이성형외과' },
  { id: 5,  name: '이정민', email: 'olive8212@naver.com',    companyId: 1, companyName: '브이에이성형외과' },
  { id: 1,  name: '차혜진', email: 'neocha78@naver.com',     companyId: 1, companyName: '브이에이성형외과' },
  { id: 12, name: '강가혜', email: 'gahye63@naver.com',      companyId: 2, companyName: '브이에이뷰티랩'   },
  { id: 11, name: '박희진', email: 'gmlwls2779@naver.com',   companyId: 2, companyName: '브이에이뷰티랩'   },
  { id: 10, name: '정정은', email: 'wjddms9241@naver.com',   companyId: 2, companyName: '브이에이뷰티랩'   },
  { id: 9,  name: '최은심', email: 'ces841028@naver.com',    companyId: 2, companyName: '브이에이뷰티랩'   },
  { id: 2,  name: '김상완', email: 'kimmusa@gmail.com',      companyId: 3, companyName: '핏에이치알'       },
]

export const mockCompanies = [
  { id: 1, name: '브이에이성형외과' },
  { id: 2, name: '브이에이뷰티랩'   },
  { id: 3, name: '핏에이치알'       },
]

export function getEmployeesByCompany(companyId: number): MockEmployee[] {
  return mockEmployees.filter(e => e.companyId === companyId)
}

export function findEmployeeByEmail(email: string, companyId: number): MockEmployee | undefined {
  return mockEmployees.find(
    e => e.email.toLowerCase() === email.toLowerCase() && e.companyId === companyId
  )
}
