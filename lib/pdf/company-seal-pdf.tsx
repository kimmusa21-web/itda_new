import React from 'react'
import { Text, View } from '@react-pdf/renderer'

// ≤2자: 각 글자 1행, ≤6자: 2행, ≤9자: 3행, 10+: 4행
function getRows(name: string): string[] {
  const n = name.replace(/\s+/g, '')
  if (n.length <= 2) return n.split('')
  if (n.length <= 6) {
    const h = Math.ceil(n.length / 2)
    return [n.slice(0, h), n.slice(h)]
  }
  if (n.length <= 9) {
    const t = Math.ceil(n.length / 3)
    return [n.slice(0, t), n.slice(t, t * 2), n.slice(t * 2)]
  }
  const q = Math.ceil(n.length / 4)
  return [n.slice(0, q), n.slice(q, q * 2), n.slice(q * 2, q * 3), n.slice(q * 3)]
}

/**
 * react-pdf용 회사 직인 — 전통 격자형, View/Text 기반
 * Font.register('NanumGothic') 이 먼저 호출된 환경에서 사용.
 */
export function CompanySealPdf({
  companyName,
  size = 60,
}: {
  companyName: string
  size?: number
}) {
  const RED     = '#C00000'
  const outerBW = Math.max(1.5, size * 0.035)
  const gapW    = Math.max(1.5, size * 0.037)
  const innerBW = Math.max(0.8, size * 0.018)

  const rows    = getRows(companyName)
  const maxCols = Math.max(...rows.map(r => r.length))

  // 실제 글자 영역 크기 (테두리 두께 제외)
  const innerSize = size - (outerBW + gapW + innerBW) * 2
  const cellW     = innerSize / maxCols
  const cellH     = innerSize / rows.length
  const fs        = Math.min(cellW, cellH) * 0.82  // react-pdf는 약간 더 작게

  return (
    <View
      style={{
        width:       size,
        height:      size,
        borderWidth: outerBW,
        borderColor: RED,
        borderStyle: 'solid',
        padding:     gapW,
      }}
    >
      <View
        style={{
          flex:        1,
          borderWidth: innerBW,
          borderColor: RED,
          borderStyle: 'solid',
          flexDirection: 'column',
        }}
      >
        {rows.map((row, ri) => {
          const chars   = [...row]
          const padLeft = (maxCols - chars.length) / 2
          // 빈 셀 + 글자 셀 + 빈 셀로 행 구성
          const cells: React.ReactNode[] = []
          for (let ci = 0; ci < maxCols; ci++) {
            const charIdx = ci - padLeft
            const ch = Number.isInteger(charIdx) && charIdx >= 0 && charIdx < chars.length
              ? chars[charIdx]
              : ''
            cells.push(
              <View
                key={ci}
                style={{
                  flex:           1,
                  justifyContent: 'center',
                  alignItems:     'center',
                }}
              >
                {ch ? (
                  <Text
                    style={{
                      color:      RED,
                      fontSize:   fs,
                      fontFamily: 'NanumGothic',
                      fontWeight: 700,
                    }}
                  >
                    {ch}
                  </Text>
                ) : null}
              </View>
            )
          }
          return (
            <View
              key={ri}
              style={{
                flex:          1,
                flexDirection: 'row',
              }}
            >
              {cells}
            </View>
          )
        })}
      </View>
    </View>
  )
}
