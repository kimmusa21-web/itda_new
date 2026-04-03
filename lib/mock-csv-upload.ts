/**
 * 실제 CSV 파일처럼 동작하는 mock 데이터
 * 정상 행 + 오류 행(미등록 이메일, 이메일 누락, 날짜 오류) 포함
 */
export const mockCsvText = `email,accrual_month,payment_date,Start_date,End_date,working_days,Overtime,base_salary,overtime_pay_fixed,overtime_pay,meal_allowance,Other_allowances,Holiday_bonus,Total_payment,national_pension,health_insurance,longterm_care,employment_insurance,income_tax,resident_tax,Total_deductible,net_pay
neocha78@naver.com,2026-03,2026-04-15,2026-03-01,2026-03-31,22,4,5227761,500000,0,200000,3426659,0,9354420,139500,115020,14870,27000,376480,37640,710510,8643910
olive8212@naver.com,2026-03,2026-04-15,2026-03-01,2026-03-31,22,0,2824574,500000,0,200000,5375426,0,8900000,139500,115020,14870,27000,376480,37640,710510,8189490
rlagd613@naver.com,2026-03,2026-04-15,2026-03-01,2026-03-31,22,0,1703320,300000,0,200000,345000,0,2548320,76050,62700,8110,14715,45360,4530,211465,2336855
sh_0124@nate.com,2026-03,2026-04-15,2026-03-01,2026-03-31,22,2,3200000,400000,0,200000,0,0,3800000,108000,88920,11510,20700,105890,10580,345600,3454400
unknown@notexist.com,2026-03,2026-04-15,2026-03-01,2026-03-31,20,0,3000000,0,0,200000,0,0,3200000,90000,74100,9590,17280,62180,6210,259360,2940640
,2026-03,2026-04-15,2026-03-01,2026-03-31,22,0,2500000,0,0,200000,0,0,2700000,75000,61750,7990,14580,39240,3920,202480,2497520
neocha78@naver.com,2026-03,invalid-date,2026-03-01,2026-03-31,22,0,5227761,500000,0,200000,0,0,5927761,139500,115020,14870,27000,376480,37640,710510,5217251`

/** mock CSV를 파싱한 행 배열 반환 */
export function parseMockCsv(): Record<string, string>[] {
  const lines = mockCsvText.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const values = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? '').trim() })
    return row
  })
}
