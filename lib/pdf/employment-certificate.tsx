import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import path from 'path'

Font.register({
  family: 'NanumGothic',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'NanumGothic-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public', 'fonts', 'NanumGothic-Bold.ttf'),    fontWeight: 700 },
  ],
})

const NAVY = '#1a1a2e'

const S = StyleSheet.create({
  page: {
    fontFamily:       'NanumGothic',
    paddingTop:       64,
    paddingBottom:    64,
    paddingHorizontal: 72,
    fontSize:         10.5,
    color:            NAVY,
  },
  docNo: { fontSize: 9, color: '#555', marginBottom: 36 },
  titleWrap: {
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    borderBottomStyle: 'solid',
    paddingBottom:     16,
    marginBottom:      36,
    alignItems:        'center',
  },
  titleKo: { fontSize: 28, fontWeight: 700, letterSpacing: 6 },
  titleEn: { fontSize: 9, letterSpacing: 3, color: '#666', marginTop: 6 },
  row: {
    flexDirection:     'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'dashed',
    paddingVertical:   9,
  },
  label: { width: 72, color: '#555', fontSize: 10 },
  value: { flex: 1, fontSize: 10 },
  stmt: {
    textAlign:     'center',
    lineHeight:    2,
    marginVertical: 36,
    fontSize:      11,
  },
  issuedDate: { textAlign: 'center', color: '#444', marginBottom: 36 },
  sigWrap: {
    alignItems:     'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    borderTopStyle: 'solid',
    paddingTop:     20,
    marginTop:      12,
  },
  sigName:  { fontSize: 14, fontWeight: 700 },
  sigTitle: { fontSize: 9, color: '#666', marginTop: 4 },
  sigAddr:  { fontSize: 8, color: '#999', marginTop: 5 },
  footer: {
    position: 'absolute',
    bottom:   28,
    left:     72,
    right:    72,
    textAlign: 'center',
    fontSize:  8,
    color:     '#aaa',
  },
})

export interface CertParams {
  docNumber:      string
  docType:        '재직증명서' | '경력증명서'
  employeeName:   string
  regNumber:      string | null
  address:        string | null
  startDate:      string
  endDate:        string | null
  purpose:        string | null
  department:     string | null
  position:       string | null
  companyName:    string
  representative: string | null
  companyAddress: string | null
  issuedDate:     string
}

function maskReg(r: string | null): string {
  if (!r) return '—'
  const c = r.replace(/-/g, '')
  return c.length >= 7 ? `${c.slice(0, 6)}-${c[6]}******` : r
}

function fmtDate(d: string | null): string {
  if (!d) return '현재'
  const [y, m, dd] = d.split('-')
  return `${y}년 ${parseInt(m)}월 ${parseInt(dd)}일`
}

export function EmploymentCertificateDoc(p: CertParams) {
  const posStr    = [p.department, p.position].filter(Boolean).join(' / ') || '—'
  const periodStr = `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}`
  const [iy, im, idd] = p.issuedDate.split('-')
  const issuedStr = `${iy}년 ${parseInt(im)}월 ${parseInt(idd)}일`

  const fields: [string, string][] = [
    ['성    명', p.employeeName],
    ['주민번호', maskReg(p.regNumber)],
    ['주    소', p.address ?? '—'],
    ['재직기간', periodStr],
    ['제출용도', p.purpose ?? '—'],
  ]

  const stmtVerb = p.docType === '재직증명서'
    ? `${p.companyName}의\n${posStr}로 재직함을 증명합니다.`
    : `${p.companyName}에 근무하였음을 증명합니다.`

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.docNo}>{p.docNumber}</Text>

        <View style={S.titleWrap}>
          <Text style={S.titleKo}>{p.docType}</Text>
          <Text style={S.titleEn}>
            CERTIFICATE OF {p.docType === '재직증명서' ? 'EMPLOYMENT' : 'CAREER'}
          </Text>
        </View>

        <View>
          {fields.map(([label, val]) => (
            <View key={label} style={S.row}>
              <Text style={S.label}>{label}</Text>
              <Text style={S.value}>{val}</Text>
            </View>
          ))}
        </View>

        <Text style={S.stmt}>{'상기인은 '}{stmtVerb}</Text>

        <Text style={S.issuedDate}>{issuedStr}</Text>

        <View style={S.sigWrap}>
          <Text style={S.sigName}>{p.companyName}</Text>
          <Text style={S.sigTitle}>대표이사  {p.representative ?? ''}</Text>
          {p.companyAddress ? <Text style={S.sigAddr}>{p.companyAddress}</Text> : null}
        </View>

        <Text style={S.footer}>
          본 문서는 itda 급여관리 서비스를 통해 발급되었습니다.
        </Text>
      </Page>
    </Document>
  )
}
