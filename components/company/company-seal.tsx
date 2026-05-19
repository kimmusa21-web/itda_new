'use client'

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

interface Props {
  companyName: string
  size?: number
}

/** 브라우저용 회사 직인 SVG 컴포넌트 */
export function CompanySeal({ companyName, size = 96 }: Props) {
  const lines   = splitName(companyName)
  const RED     = '#C00000'
  const VB      = 72
  const outerP  = 1.5
  const innerP  = 5.5
  const divY    = VB * 0.735
  const jikY    = VB * 0.895

  const nameAreaTop    = innerP + 2
  const nameAreaHeight = divY - nameAreaTop - 2
  const nameFontSize   = lines.length === 1
    ? VB * 0.155
    : lines.length === 2
      ? VB * 0.128
      : VB * 0.10
  const lineH          = nameFontSize * 1.35
  const totalH         = (lines.length - 1) * lineH + nameFontSize
  const firstY         = nameAreaTop + (nameAreaHeight - totalH) / 2 + nameFontSize * 0.83

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      style={{ userSelect: 'none', display: 'block' }}
    >
      {/* 외부 테두리 */}
      <rect
        x={outerP} y={outerP}
        width={VB - outerP * 2} height={VB - outerP * 2}
        fill="none" stroke={RED} strokeWidth={2.8}
      />
      {/* 내부 테두리 */}
      <rect
        x={innerP} y={innerP}
        width={VB - innerP * 2} height={VB - innerP * 2}
        fill="none" stroke={RED} strokeWidth={1.3}
      />
      {/* 구분선 */}
      <line
        x1={innerP + 1} y1={divY}
        x2={VB - innerP - 1} y2={divY}
        stroke={RED} strokeWidth={1.3}
      />
      {/* 회사명 */}
      {lines.map((line, i) => (
        <text
          key={i}
          x={VB / 2}
          y={firstY + i * lineH}
          textAnchor="middle"
          fill={RED}
          fontSize={nameFontSize}
          fontWeight="bold"
          fontFamily="'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        >
          {line}
        </text>
      ))}
      {/* 직인 */}
      <text
        x={VB / 2}
        y={jikY}
        textAnchor="middle"
        fill={RED}
        fontSize={VB * 0.115}
        fontFamily="'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif"
      >
        직인
      </text>
    </svg>
  )
}
