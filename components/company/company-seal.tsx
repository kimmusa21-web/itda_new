'use client'

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

interface Props {
  companyName: string
  size?: number
}

/** 브라우저용 회사 직인 SVG — 전통 격자형 */
export function CompanySeal({ companyName, size = 96 }: Props) {
  const RED      = '#C00000'
  const VB       = 80
  const outerBW  = 2.8
  const gap      = 3.0
  const innerBW  = 1.4
  const inset    = outerBW + gap + innerBW
  const inner    = VB - inset * 2

  const rows    = getRows(companyName)
  const maxCols = Math.max(...rows.map(r => r.length))
  const cellW   = inner / maxCols
  const cellH   = inner / rows.length
  const fs      = Math.min(cellW, cellH) * 0.90

  const o  = outerBW / 2
  const ow = VB - outerBW
  const ii = outerBW + gap + innerBW / 2
  const iw = VB - (outerBW + gap) * 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      style={{ userSelect: 'none', display: 'block' }}
    >
      <rect x={o}  y={o}  width={ow} height={ow} fill="none" stroke={RED} strokeWidth={outerBW} />
      <rect x={ii} y={ii} width={iw} height={iw} fill="none" stroke={RED} strokeWidth={innerBW} />
      {rows.flatMap((row, ri) => {
        const chars   = [...row]
        const padLeft = (maxCols - chars.length) / 2
        return chars.map((ch, ci) => {
          const cx = inset + (ci + padLeft + 0.5) * cellW
          const cy = inset + (ri + 0.5) * cellH
          return (
            <text
              key={`${ri}-${ci}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill={RED}
              fontSize={fs}
              fontWeight="bold"
              fontFamily="'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif"
            >
              {ch}
            </text>
          )
        })
      })}
    </svg>
  )
}
