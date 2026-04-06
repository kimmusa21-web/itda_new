'use client'
import { Building2, CalendarDays, Loader2 } from 'lucide-react'

interface Props {
  companies:      { id: number; name: string }[]
  companyId:      number
  setCompanyId:   (id: number) => void
  accrualMonth:   string
  setAccrualMonth:(m: string) => void
  paymentDate:    string
  setPaymentDate: (d: string) => void
  loading?:       boolean
}

export function UploadSettingsCard({
  companies, companyId, setCompanyId,
  accrualMonth, setAccrualMonth,
  paymentDate, setPaymentDate, loading,
}: Props) {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
        <Building2 size={15} className="text-blue-500" />
        업로드 설정
        {loading && <Loader2 size={13} className="animate-spin text-slate-400 ml-1" />}
      </h2>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
          회사 선택 <span className="text-red-400">*</span>
        </label>
        <select
          className="input"
          value={companyId}
          onChange={e => setCompanyId(Number(e.target.value))}
        >
          <option value={0}>회사를 선택하세요</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            <CalendarDays size={11} className="inline mr-1 text-slate-400" />
            귀속월 <span className="text-red-400">*</span>
          </label>
          <input type="month" className="input"
            value={accrualMonth} onChange={e => setAccrualMonth(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">지급일</label>
          <input type="date" className="input"
            value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
        </div>
      </div>

      {companyId > 0 && accrualMonth && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
          같은 귀속월({accrualMonth}) 데이터가 이미 있으면 자동 덮어씁니다 (upsert)
        </div>
      )}
    </div>
  )
}
