'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface KakaoMapProps {
  userLat:     number
  userLng:     number
  companyLat?: number | null
  companyLng?: number | null
  radiusM?:    number | null
  className?:  string
}

declare global {
  interface Window {
    kakao: any
  }
}

export function KakaoMap({ userLat, userLng, companyLat, companyLng, radiusM, className }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading]   = useState(true)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    if (!KEY) { setMapError(true); setLoading(false); return }

    const initMap = () => {
      const kakao = window.kakao
      if (!kakao?.maps) { setMapError(true); setLoading(false); return }

      kakao.maps.load(() => {
        const container = containerRef.current
        if (!container) return
        setLoading(false)

        const userPos = new kakao.maps.LatLng(userLat, userLng)
        const map     = new kakao.maps.Map(container, { center: userPos, level: 4 })

        // 사용자 위치 마커 (파란색 커스텀)
        new kakao.maps.Marker({ map, position: userPos })
        new kakao.maps.CustomOverlay({
          map,
          position: userPos,
          content: '<div style="margin-top:6px;padding:3px 10px;background:#3b82f6;color:#fff;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;">현재 위치</div>',
          xAnchor: 0.5,
          yAnchor: 0,
        })

        if (companyLat && companyLng) {
          const companyPos = new kakao.maps.LatLng(companyLat, companyLng)

          // 회사 마커 (빨간색 커스텀)
          new kakao.maps.Marker({ map, position: companyPos })
          new kakao.maps.CustomOverlay({
            map,
            position: companyPos,
            content: '<div style="margin-top:6px;padding:3px 10px;background:#ef4444;color:#fff;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;">회사</div>',
            xAnchor: 0.5,
            yAnchor: 0,
          })

          // 허용 반경 원
          if (radiusM) {
            new kakao.maps.Circle({
              map,
              center:         companyPos,
              radius:         radiusM,
              strokeWeight:   2,
              strokeColor:    '#ef4444',
              strokeOpacity:  0.8,
              fillColor:      '#fca5a5',
              fillOpacity:    0.2,
            })
          }

          // 두 위치가 모두 보이도록 범위 조정
          const bounds = new kakao.maps.LatLngBounds()
          bounds.extend(userPos)
          bounds.extend(companyPos)
          map.setBounds(bounds)
        }
      })
    }

    if (window.kakao?.maps) {
      initMap()
    } else if (document.getElementById('kakao-map-sdk')) {
      document.getElementById('kakao-map-sdk')!.addEventListener('load', initMap)
    } else {
      const script    = document.createElement('script')
      script.id       = 'kakao-map-sdk'
      script.src      = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`
      script.onerror  = () => { setMapError(true); setLoading(false) }
      script.onload   = initMap
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
