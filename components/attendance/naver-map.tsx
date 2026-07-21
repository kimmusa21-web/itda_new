'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface NaverMapProps {
  userLat:     number
  userLng:     number
  companyLat?: number | null
  companyLng?: number | null
  radiusM?:    number | null
  className?:  string
}

declare global {
  interface Window {
    naver: any
  }
}

/** 라벨 마커 HTML (카카오 CustomOverlay 대체) */
function labelIcon(text: string, bg: string) {
  return {
    content: `<div style="margin-top:6px;padding:3px 10px;background:${bg};color:#fff;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;transform:translateX(-50%);">${text}</div>`,
    anchor:  { x: 0, y: 0 },
  }
}

export function NaverMap({ userLat, userLng, companyLat, companyLng, radiusM, className }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading]   = useState(true)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    const KEY = process.env.NEXT_PUBLIC_NCP_MAP_CLIENT_ID
    if (!KEY) { setMapError(true); setLoading(false); return }

    const initMap = () => {
      const naver = window.naver
      if (!naver?.maps) { setMapError(true); setLoading(false); return }

      const container = containerRef.current
      if (!container) return
      setLoading(false)

      const userPos = new naver.maps.LatLng(userLat, userLng)
      // 카카오 level:4 ≈ 네이버 zoom:16 (카카오는 작을수록, 네이버는 클수록 확대)
      const map = new naver.maps.Map(container, { center: userPos, zoom: 16 })

      /* 사용자 위치 — 기본 마커 + 파란 라벨 */
      new naver.maps.Marker({ map, position: userPos })
      new naver.maps.Marker({ map, position: userPos, icon: labelIcon('현재 위치', '#3b82f6') })

      if (companyLat && companyLng) {
        const companyPos = new naver.maps.LatLng(companyLat, companyLng)

        /* 회사 위치 — 기본 마커 + 빨간 라벨 */
        new naver.maps.Marker({ map, position: companyPos })
        new naver.maps.Marker({ map, position: companyPos, icon: labelIcon('회사', '#ef4444') })

        /* 허용 반경 원 */
        if (radiusM) {
          new naver.maps.Circle({
            map,
            center:       companyPos,
            radius:       radiusM,
            strokeWeight: 2,
            strokeColor:  '#ef4444',
            strokeOpacity: 0.8,
            fillColor:    '#fca5a5',
            fillOpacity:  0.2,
          })
        }

        /* 두 위치 + 허용 반경 원이 모두 보이도록 범위 조정.
           마커 2개만으로 맞추면 두 점이 가까울 때 과도하게 확대돼
           정작 반경 원이 화면 밖으로 잘린다. */
        const bounds = new naver.maps.LatLngBounds(userPos, userPos)
        bounds.extend(companyPos)

        if (radiusM) {
          const dLat = radiusM / 111_320
          const dLng = radiusM / (111_320 * Math.cos((companyLat * Math.PI) / 180))
          bounds.extend(new naver.maps.LatLng(companyLat - dLat, companyLng - dLng))
          bounds.extend(new naver.maps.LatLng(companyLat + dLat, companyLng + dLng))
        }

        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
      }
    }

    const SCRIPT_ID = 'naver-map-sdk'

    if (window.naver?.maps) {
      initMap()
    } else if (document.getElementById(SCRIPT_ID)) {
      document.getElementById(SCRIPT_ID)!.addEventListener('load', initMap)
    } else {
      const script   = document.createElement('script')
      script.id      = SCRIPT_ID
      // NCP 신규 콘솔 기준 파라미터명은 ncpKeyId (구 콘솔은 ncpClientId)
      script.src     = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${KEY}`
      script.onerror = () => { setMapError(true); setLoading(false) }
      script.onload  = initMap
      document.head.appendChild(script)
    }
  }, [userLat, userLng, companyLat, companyLng, radiusM])

  if (mapError) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 rounded-xl text-xs text-slate-400 ${className ?? 'w-full h-44'}`}>
        지도를 불러올 수 없습니다.
      </div>
    )
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className ?? 'w-full h-44'}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
