import React from 'react'
import { Text, View } from '@react-pdf/renderer'

function splitName(name: string): string[] {
  const n = name.replace(/\s+/g, '')
  if (n.length <= 5)  return [n]
  if (n.length <= 10) {
    const m = Math.ceil(n.length / 2)
    return [n.slice(0, m), n.slice(m)]
  }
  const t = Math.ceil(n.length / 3)
  return [n.slice(0, t), n.slice(t, t * 2), n.slice(t * 2)]
}

/**
 * react-pdf용 회사 직인 컴포넌트 (View/Text 기반)
 * Font.register('NanumGothic') 이 먼저 호출된 환경에서 사용할 것.
 */
export function CompanySealPdf({
  companyName,
  size = 60,
}: {
  companyName: string
  size?: number
}) {
  const lines          = splitName(companyName)
  const RED            = '#C00000'
  const outerBorder    = Math.max(2,   size * 0.038)
  const innerBorder    = Math.max(1,   size * 0.018)
  const gap            = Math.round(size * 0.055)
  const jikInHeight    = Math.round(size * 0.25)
  const dividerH       = Math.max(1,   innerBorder)
  const nameFontSize   = lines.length === 1
    ? Math.round(size * 0.15)
    : lines.length === 2
      ? Math.round(size * 0.12)
      : Math.round(size * 0.095)
  const jikInFontSize  = Math.round(size * 0.105)

  return (
    <View
      style={{
        width:       size,
        height:      size,
        borderWidth: outerBorder,
        borderColor: RED,
        borderStyle: 'solid',
        padding:     gap,
      }}
    >
      <View
        style={{
          flex:        1,
          borderWidth: innerBorder,
          borderColor: RED,
          borderStyle: 'solid',
        }}
      >
        {/* 회사명 영역 */}
        <View
          style={{
            flex:            1,
            justifyContent: 'center',
            alignItems:     'center',
            paddingHorizontal: 1,
          }}
        >
          {lines.map((line, i) => (
            <Text
              key={i}
              style={{
                color:      RED,
                fontSize:   nameFontSize,
                fontFamily: 'NanumGothic',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {line}
            </Text>
          ))}
        </View>

        {/* 구분선 */}
        <View style={{ height: dividerH, backgroundColor: RED }} />

        {/* 직인 영역 */}
        <View
          style={{
            height:         jikInHeight,
            justifyContent: 'center',
            alignItems:     'center',
          }}
        >
          <Text
            style={{
              color:      RED,
              fontSize:   jikInFontSize,
              fontFamily: 'NanumGothic',
            }}
          >
            직인
          </Text>
        </View>
      </View>
    </View>
  )
}
