import { useEffect, useRef, useState } from 'react'
import { Alert, Space, Tag, Typography } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'
import { tr } from '@/i18n'

/**
 * Google Maps API Key
 * 在 sky-web/.env.development 里配置：VITE_GOOGLE_MAPS_API_KEY=你的key
 * 需要在 Google Cloud 开启：Maps JavaScript API、Places API (New)
 */
const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''

export interface PlaceSelection {
  /** Google Place ID（保存地址时必须） */
  placeId: string | null
  /** 地点显示文本 */
  text: string | null
  /** 经纬度 */
  location: { lat: number; lng: number } | null
}

/** 全局只加载一次 Google Maps JS API */
function loadGoogleMaps(apiKey: string): Promise<any> {
  const w = window as any
  if (w.__skyMapsLoading) return w.__skyMapsLoading

  w.__skyMapsLoading = new Promise((resolve, reject) => {
    if (w.google?.maps?.importLibrary) {
      resolve(w.google)
      return
    }
    if (!apiKey) {
      reject(new Error(tr('未配置 Google Maps API Key（VITE_GOOGLE_MAPS_API_KEY）')))
      return
    }
    w.google = w.google || {}
    w.google.maps = w.google.maps || {}
    // 与官方 bootstrap 一致：通过 callback=google.maps.__ib__ 通知加载完成
    w.google.maps.__ib__ = () => resolve(w.google)

    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      libraries: 'maps,marker,places',
      callback: 'google.maps.__ib__',
    })
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.async = true
    script.onerror = () =>
      reject(new Error(tr('Google Maps JS API 加载失败（检查网络 / API Key 限制）')))
    document.head.appendChild(script)
  })
  return w.__skyMapsLoading
}

interface Props {
  /** 选中地点后回调（含 placeId，拿到后才允许保存地址） */
  onPlaceChange?: (selection: PlaceSelection) => void
}

/**
 * 地点选择器
 * 输入地点（起点）→ 从 Place 预测结果中取得 Place ID → 地图上标记该位置。
 * 拿到 placeId 后由调用方决定是否允许保存。
 */
export default function PlacePicker({ onPlaceChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<any>(null)

  const [error, setError] = useState<string | null>(null)
  const [place, setPlace] = useState<PlaceSelection>({ placeId: null, text: null, location: null })

  useEffect(() => {
    let disposed = false

    async function setup() {
      try {
        const google = await loadGoogleMaps(MAPS_API_KEY)
        if (disposed) return

        const [{ Map }, { AdvancedMarkerElement }, { PlaceAutocompleteElement }] = await Promise.all([
          google.maps.importLibrary('maps'),
          google.maps.importLibrary('marker'),
          google.maps.importLibrary('places'),
        ])
        if (disposed) return

        const map = new Map(mapRef.current, {
          center: { lat: 39.9042, lng: 116.4074 },
          zoom: 11,
          mapId: 'DEMO_MAP_ID', // AdvancedMarkerElement 需要 mapId
        })

        // 地点输入框（Places Autocomplete 是 Web Component，挂在 div 容器里）
        const autocomplete = new PlaceAutocompleteElement({ name: 'place_location' })
        inputRef.current?.appendChild(autocomplete)

        autocomplete.addEventListener('gmp-select', async (event: any) => {
          const prediction = event.placePrediction
          const placeId: string | null = prediction.placeId ?? null
          const text: string | null = prediction.text?.text ?? null

          const p = prediction.toPlace()
          await p.fetchFields({ fields: ['location'] })
          const location = p.location
            ? { lat: p.location.lat(), lng: p.location.lng() }
            : null

          const selection: PlaceSelection = { placeId, text, location }
          setPlace(selection)
          onPlaceChange?.(selection)

          // 地图上标记并聚焦到该位置
          if (location) {
            if (markerRef.current) {
              markerRef.current.position = location
            } else {
              markerRef.current = new AdvancedMarkerElement({ map, position: location })
            }
            map.setCenter(location)
            map.setZoom(16)
          }
        })
      } catch (e: any) {
        if (!disposed) setError(e?.message ?? String(e))
      }
    }

    void setup()
    return () => {
      disposed = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={tr('地图组件未能加载')}
          description={
            <span>
              {error}
              <br />
              {tr('请在')} <code>sky-web/.env.development</code> {tr('配置')}{' '}
              <code>VITE_GOOGLE_MAPS_API_KEY</code>
              {tr('（需开启 Maps JavaScript API、Places API (New)），并重启')}{' '}
              <code>npm run dev</code>。
            </span>
          }
        />
      )}

      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div>
          <Typography.Text strong>
            <EnvironmentOutlined /> {tr('起点')}
          </Typography.Text>
          <div ref={inputRef} style={{ marginTop: 4 }} />
        </div>

        {place.placeId && (
          <Tag color="green">
            {tr('已获取 Place ID：')}
            {place.placeId}
          </Tag>
        )}

        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: 320,
            borderRadius: 8,
            border: '1px solid #eee',
            background: '#fafafa',
          }}
        />
      </Space>
    </div>
  )
}
