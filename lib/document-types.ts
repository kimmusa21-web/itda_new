export type DocumentType =
  | 'employment_certificate'
  | 'career_certificate'
  | 'withholding_tax'
  | 'earned_income_withholding_ledger'
  | 'withholding_tax_confirmation'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  employment_certificate:           '재직증명서',
  career_certificate:               '경력증명서',
  withholding_tax:                  '원천징수영수증(연도별)',
  earned_income_withholding_ledger: '근로소득원천징수부',
  withholding_tax_confirmation:     '갑종근로소득에대한원천징수확인서',
}
