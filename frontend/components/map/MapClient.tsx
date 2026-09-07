'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { MapPoint, DistrictData, Locale } from '@/lib/types'
import { districtName, toSlug } from '@/lib/districts-en'
import { problemTypeLabel } from '@/lib/labels'

type MapFilter = 'all' | 'stale' | 'low_sat'
type ChoroplethMetric = 'resolution_rate' | 'stale_rate' | 'median_resolution_days'

type Dict = {
  map: {
    title: string
    subtitle: string
    filter_all: string
    filter_stale: string
    filter_low_sat: string
    choropleth_label: string
    metric_resolution: string
    metric_stale: string
    metric_speed: string
    popup_days_open: string
    popup_star: string
    popup_district: string
    popup_type: string
    loading: string
    no_results: string
    snapshot_label: string
    no_api_key: string
    methods_link: string
    sample_title: string
    sample_all: string
    sample_stale: string
    sample_low_sat: string
    map_api_detail: string
    marker_legend: string
    marker_stale: string
    marker_low_sat: string
    popup_resolution_time: string
    popup_status: string
    status_stale: string
    status_low_sat: string
    district_detail: string
    district_resolution: string
    district_stale: string
    district_speed: string
    open_district: string
    close_panel: string
    district_select: string
  }
}

type Props = {
  points: MapPoint[]
  districts: DistrictData[]
  geojson: Record<string, unknown>
  totalStale: number
  dict: Dict
  lang: Locale
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BKK_CENTER: [number, number] = [13.756, 100.502]
const BKK_ZOOM = 11

function choroplethColor(value: number | null, metric: ChoroplethMetric): string {
  if (value === null) return '#1e1e35'
  if (metric === 'resolution_rate') {
    if (value >= 85) return '#0b4f6c'
    if (value >= 75) return '#1d7a8c'
    if (value >= 65) return '#49a2a6'
    if (value >= 55) return '#f0b429'
    return '#d64545'
  }
  if (metric === 'stale_rate') {
    if (value <= 10) return '#0b4f6c'
    if (value <= 20) return '#1d7a8c'
    if (value <= 30) return '#49a2a6'
    if (value <= 40) return '#f0b429'
    return '#d64545'
  }
  // median_resolution_days — lower is better
  if (value <= 3) return '#0b4f6c'
  if (value <= 7) return '#1d7a8c'
  if (value <= 14) return '#49a2a6'
  if (value <= 21) return '#f0b429'
  return '#d64545'
}

function pointColor(flag: string): string {
  return flag === 'stale' ? '#f87171' : '#fbbf24'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapClient({ points, districts, geojson, totalStale, dict, lang }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<import('leaflet').Map | null>(null)
  const clusterRef = useRef<import('leaflet').LayerGroup | null>(null)
  const choroplethRef = useRef<import('leaflet').GeoJSON | null>(null)

  const [filter, setFilter] = useState<MapFilter>('stale')
  const [metric, setMetric] = useState<ChoroplethMetric>('resolution_rate')
  const [showChoropleth, setShowChoropleth] = useState(true)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<MapPoint | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null)
  const visibleCount = filter === 'all' ? points.length : points.filter((point) => point.flag === filter).length
  const staleSampleCount = points.filter((point) => point.flag === 'stale').length
  const lowSatSampleCount = points.filter((point) => point.flag === 'low_sat').length

  // District lookup
  const districtMap = useRef<Map<string, DistrictData>>(
    new Map(districts.map((d) => [d.district, d]))
  )
  const initAbortRef = useRef<AbortController | null>(null)

  function focusDistrict(district: DistrictData) {
    setSelected(null)
    setSelectedDistrict(district)

    choroplethRef.current?.eachLayer((candidate) => {
      const layer = candidate as import('leaflet').Layer & {
        feature?: { properties?: { district?: string } }
        getBounds?: () => import('leaflet').LatLngBounds
      }
      if (layer.feature?.properties?.district === district.district && layer.getBounds) {
        leafletMap.current?.fitBounds(layer.getBounds(), { padding: [32, 32], maxZoom: 13 })
      }
    })
  }

  // ── Init Leaflet ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return

    // Cancel previous initialization if still pending
    if (initAbortRef.current) {
      initAbortRef.current.abort()
    }
    initAbortRef.current = new AbortController()
    const signal = initAbortRef.current.signal

    ;(async () => {
      try {
        // Check if already cancelled
        if (signal.aborted) return

        // If map already exists, don't reinitialize
        if (leafletMap.current) return

        const L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css')

        if (signal.aborted) return

        // Fix default icon paths broken by webpack
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/marker-icon-2x.png',
          iconUrl: '/marker-icon.png',
          shadowUrl: '/marker-shadow.png',
        })

        const map = L.map(mapRef.current!, {
          center: BKK_CENTER,
          zoom: BKK_ZOOM,
          zoomControl: false,
        })

        if (signal.aborted) {
          map.remove()
          return
        }

        // Move zoom to bottom-right so it doesn't clash with our filter controls
        L.control.zoom({ position: 'bottomright' }).addTo(map)

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map)

        leafletMap.current = map
        setReady(true)
      } catch (err) {
        if (!signal.aborted) {
          console.error('Failed to initialize map:', err)
        }
      }
    })()

    return () => {
      initAbortRef.current?.abort()
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [])

  // ── Choropleth layer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !leafletMap.current) return
    let cancelled = false
    const map = leafletMap.current
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || leafletMap.current !== map) return
      choroplethRef.current?.remove()

      if (!showChoropleth) return

      const layer = L.geoJSON(geojson as unknown as GeoJSON.FeatureCollection, {
        style: (feature) => {
          const dName = feature?.properties?.district as string
          const d = districtMap.current.get(dName)
          const value =
            metric === 'stale_rate'
              ? d ? (d.stale_tickets / d.total_tickets) * 100 : null
              : d ? (d[metric] ?? null)
              : null
          return {
            fillColor: choroplethColor(value, metric),
            fillOpacity: 0.45,
            color: '#ffffff',
            weight: 0.8,
            opacity: 0.4,
          }
        },
        onEachFeature: (feature, layer) => {
          const dName = feature.properties?.district as string
          const d = districtMap.current.get(dName)
          if (!d) return
          const staleRate = ((d.stale_tickets / d.total_tickets) * 100).toFixed(1)
          layer.bindTooltip(
            `<strong>${districtName(dName, lang)}</strong><br/>
             ${dict.map.metric_resolution}: ${d.resolution_rate?.toFixed(1) ?? '—'}%<br/>
             ${dict.map.metric_stale}: ${staleRate}%<br/>
             ${dict.map.metric_speed}: ${d.median_resolution_days?.toFixed(1) ?? '—'} d`,
            { sticky: true, className: 'leaflet-tooltip-dark' }
          )
          layer.on('click', () => {
            focusDistrict(d)
          })
        },
      }).addTo(map)

      if (cancelled || leafletMap.current !== map) {
        layer.remove()
        return
      }
      choroplethRef.current = layer as unknown as import('leaflet').GeoJSON
    })()

    return () => {
      cancelled = true
    }
  }, [ready, showChoropleth, metric, geojson, lang, dict])

  // ── Cluster layer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !leafletMap.current) return
    let cancelled = false
    const map = leafletMap.current
    ;(async () => {
      const L = (await import('leaflet')).default
      await Promise.all([
        import('leaflet.markercluster'),
        import('leaflet.markercluster/dist/MarkerCluster.css'),
        import('leaflet.markercluster/dist/MarkerCluster.Default.css'),
      ])
      if (cancelled || leafletMap.current !== map) return
      clusterRef.current?.remove()

      const visible = filter === 'all' ? points : points.filter((p) => p.flag === filter)
      if (visible.length === 0) return

      const group = (L as unknown as { markerClusterGroup: (opts: unknown) => import('leaflet').LayerGroup })
        .markerClusterGroup?.({
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          chunkedLoading: true,
        })

      // Fallback: use plain LayerGroup if MarkerClusterGroup not available
      const layer: import('leaflet').LayerGroup = group ?? L.layerGroup()

      visible.forEach((pt) => {
        const marker = L.circleMarker([pt.lat, pt.lon], {
          radius: 5,
          fillColor: pointColor(pt.flag),
          color: 'transparent',
          fillOpacity: 0.85,
          weight: 0,
        })
        marker.on('click', () => {
          setSelectedDistrict(null)
          setSelected(pt)
        })
        layer.addLayer(marker)
      })

      if (cancelled || leafletMap.current !== map) return
      layer.addTo(map)
      if (cancelled || leafletMap.current !== map) {
        layer.remove()
        return
      }
      clusterRef.current = layer
    })()

    return () => {
      cancelled = true
    }
  }, [ready, filter, points])

  // ── Popup panel ─────────────────────────────────────────────────────────────
  const PopupPanel = selected ? (
    <div className="absolute bottom-4 left-4 z-[1000] w-72 rounded-xl border border-white/10 bg-[#0f0f1a]/95 backdrop-blur-md p-4 shadow-2xl">
      <button
        onClick={() => setSelected(null)}
        aria-label={lang === 'th' ? 'ปิดรายละเอียดตั๋ว' : 'Close ticket details'}
        className="absolute top-3 right-3 text-zinc-500 hover:text-[--color-fg] text-xs"
      >✕</button>
      <p className="text-xs text-zinc-500 font-mono mb-2">{selected.ticket_id}</p>
      <p className="text-sm font-semibold text-[--color-fg] mb-1">{problemTypeLabel(selected.type, lang)}</p>
      <p className="text-xs text-zinc-400 mb-3">
        {dict.map.popup_district}: {districtName(selected.district, lang)}
      </p>
      <div className="space-y-1">
        {selected.days_open !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">
              {selected.flag === 'stale' ? dict.map.popup_days_open : dict.map.popup_resolution_time}
            </span>
            <span className={`font-semibold ${selected.flag === 'stale' ? 'text-red-400' : 'text-[--color-fg]'}`}>
              {selected.days_open}d
            </span>
          </div>
        )}
        {selected.star !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">{dict.map.popup_star}</span>
            <span className="font-semibold text-amber-400">{'★'.repeat(Math.round(selected.star))} {selected.star}/5</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">{dict.map.popup_status}</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            selected.flag === 'stale' ? 'bg-red-400/10 text-red-400' : 'bg-amber-400/10 text-amber-400'
          }`}>
            {selected.flag === 'stale' ? dict.map.status_stale : dict.map.status_low_sat}
          </span>
        </div>
      </div>
    </div>
  ) : null

  const DistrictPanel = selectedDistrict ? (
    <section
      aria-label={dict.map.district_detail}
      className="absolute bottom-4 left-4 z-[1000] w-72 rounded-xl border border-white/10 bg-[#0f0f1a]/95 p-4 shadow-2xl backdrop-blur-md"
    >
      <button
        onClick={() => setSelectedDistrict(null)}
        aria-label={dict.map.close_panel}
        className="absolute right-3 top-3 text-xs text-zinc-500 hover:text-[--color-fg]"
      >✕</button>
      <p className="pr-5 text-sm font-semibold text-[--color-fg]">{districtName(selectedDistrict.district, lang)}</p>
      <p className="mt-1 text-xs text-zinc-500">{dict.map.district_detail}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-white/5 px-1 py-2">
          <dt className="text-zinc-500">{dict.map.district_resolution}</dt>
          <dd className="mt-1 font-semibold text-emerald-300">{selectedDistrict.resolution_rate?.toFixed(1) ?? '—'}%</dd>
        </div>
        <div className="rounded-lg bg-white/5 px-1 py-2">
          <dt className="text-zinc-500">{dict.map.district_stale}</dt>
          <dd className="mt-1 font-semibold text-amber-300">
            {selectedDistrict.total_tickets > 0 ? ((selectedDistrict.stale_tickets / selectedDistrict.total_tickets) * 100).toFixed(1) : '—'}%
          </dd>
        </div>
        <div className="rounded-lg bg-white/5 px-1 py-2">
          <dt className="text-zinc-500">{dict.map.district_speed}</dt>
          <dd className="mt-1 font-semibold text-[--color-fg]">{selectedDistrict.median_resolution_days?.toFixed(1) ?? '—'}d</dd>
        </div>
      </dl>
      <Link
        href={`/${lang}/districts?district=${toSlug(districtName(selectedDistrict.district, 'en'))}`}
        className="mt-3 block rounded-lg bg-teal-400 px-3 py-2 text-center text-xs font-semibold text-[#062524] transition-colors hover:bg-teal-300"
      >
        {dict.map.open_district}
      </Link>
    </section>
  ) : null

  const sampleDescription = filter === 'stale'
    ? dict.map.sample_stale
      .replace('{shown}', staleSampleCount.toLocaleString())
      .replace('{total}', totalStale.toLocaleString())
    : filter === 'low_sat'
      ? dict.map.sample_low_sat.replace('{shown}', lowSatSampleCount.toLocaleString())
      : dict.map.sample_all
        .replace('{stale}', staleSampleCount.toLocaleString())
        .replace('{low}', lowSatSampleCount.toLocaleString())

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex w-[min(23rem,calc(100%-2rem))] flex-col gap-2">
        <section aria-live="polite" className="rounded-xl border border-white/10 bg-[#0f0f1a]/95 p-3 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold text-[--color-fg]">{dict.map.sample_title}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">{sampleDescription}</p>
          <details className="mt-2 text-xs text-zinc-500">
            <summary className="cursor-pointer text-teal-300 hover:text-teal-200">{dict.map.no_api_key}</summary>
            <p className="mt-2 leading-5">{dict.map.map_api_detail}</p>
          </details>
        </section>
        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label={dict.map.title}>
          {(['all', 'stale', 'low_sat'] as MapFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === f
                  ? 'bg-teal-500 border-teal-500 text-[--color-fg]'
                  : 'bg-[#0f0f1a]/80 border-white/10 text-zinc-400 hover:text-[--color-fg]'
              }`}
            >
              {f === 'all' ? dict.map.filter_all : f === 'stale' ? dict.map.filter_stale : dict.map.filter_low_sat}
            </button>
          ))}
        </div>

        {/* Choropleth toggle + metric selector */}
        <div className="flex gap-1.5 items-center flex-wrap">
          <button
            onClick={() => setShowChoropleth((v) => !v)}
            aria-pressed={showChoropleth}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              showChoropleth
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-[#0f0f1a]/80 border-white/10 text-zinc-400 hover:text-[--color-fg]'
            }`}
          >
            {dict.map.choropleth_label}
          </button>
          {showChoropleth && (
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as ChoroplethMetric)}
              className="px-2 py-1 rounded-lg text-xs bg-[#0f0f1a]/90 border border-white/10 text-zinc-300 outline-none"
            >
              <option value="resolution_rate">{dict.map.metric_resolution}</option>
              <option value="stale_rate">{dict.map.metric_stale}</option>
              <option value="median_resolution_days">{dict.map.metric_speed}</option>
            </select>
          )}
        </div>

        <label className="sr-only" htmlFor="map-district-select">{dict.map.district_select}</label>
        <select
          id="map-district-select"
          value={selectedDistrict?.district ?? ''}
          onChange={(event) => {
            const district = districtMap.current.get(event.target.value)
            if (district) focusDistrict(district)
          }}
          className="w-full rounded-lg border border-white/10 bg-[#0f0f1a]/90 px-2 py-1.5 text-xs text-zinc-300 outline-none"
        >
          <option value="">{dict.map.district_select}</option>
          {[...districts]
            .sort((a, b) => districtName(a.district, lang).localeCompare(districtName(b.district, lang), lang))
            .map((district) => (
              <option key={district.district} value={district.district}>{districtName(district.district, lang)}</option>
            ))}
        </select>
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {ready && visibleCount === 0 && (
        <p className="absolute left-4 top-24 z-[1000] rounded-lg border border-white/10 bg-[#0f0f1a]/90 px-3 py-2 text-xs text-zinc-300">
          {dict.map.no_results}
        </p>
      )}

      {/* Ticket popup panel */}
      {PopupPanel}
      {DistrictPanel}

      {/* Legend */}
      {showChoropleth && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border border-white/10 bg-[#0f0f1a]/90 backdrop-blur p-3 text-xs">
          <p className="text-zinc-400 mb-2 font-medium">{dict.map.choropleth_label}</p>
          {(metric === 'median_resolution_days'
            ? [
                { color: '#0b4f6c', label: '≤3d' },
                { color: '#1d7a8c', label: '3.1–7d' },
                { color: '#49a2a6', label: '7.1–14d' },
                { color: '#f0b429', label: '14.1–21d' },
                { color: '#d64545', label: '>21d' },
              ]
            : metric === 'stale_rate'
              ? [
                  { color: '#0b4f6c', label: '≤10%' },
                  { color: '#1d7a8c', label: '10.1–20%' },
                  { color: '#49a2a6', label: '20.1–30%' },
                  { color: '#f0b429', label: '30.1–40%' },
                  { color: '#d64545', label: '>40%' },
                ]
              : [
                  { color: '#0b4f6c', label: '≥85%' },
                  { color: '#1d7a8c', label: '75–84.9%' },
                  { color: '#49a2a6', label: '65–74.9%' },
                  { color: '#f0b429', label: '55–64.9%' },
                  { color: '#d64545', label: '<55%' },
                ]
          ).map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
              <span className="text-zinc-400">{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-[999] rounded-xl border border-white/10 bg-[#0f0f1a]/90 p-3 text-xs backdrop-blur-md">
        <p className="mb-2 font-medium text-zinc-300">{dict.map.marker_legend}</p>
        <div className="flex items-center gap-2 text-zinc-400"><span className="h-2.5 w-2.5 rounded-full bg-red-400" />{dict.map.marker_stale}</div>
        <div className="mt-1 flex items-center gap-2 text-zinc-400"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-1 ring-amber-100/60" />{dict.map.marker_low_sat}</div>
      </div>
    </div>
  )
}
