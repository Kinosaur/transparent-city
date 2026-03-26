'use client'

import { useEffect, useRef, useState } from 'react'
import type { MapPoint, DistrictData, Locale } from '@/lib/types'
import { districtName } from '@/lib/districts-en'

// ─── Types ────────────────────────────────────────────────────────────────────

type DistrictFeature = {
  type: 'Feature'
  properties: { district: string }
  geometry: { type: string; coordinates: unknown[] }
}

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
  }
}

type Props = {
  points: MapPoint[]
  districts: DistrictData[]
  geojson: { type: string; features: DistrictFeature[] }
  dict: Dict
  lang: Locale
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BKK_CENTER: [number, number] = [13.756, 100.502]
const BKK_ZOOM = 11

function choroplethColor(value: number | null, metric: ChoroplethMetric): string {
  if (value === null) return '#1e1e35'
  if (metric === 'resolution_rate') {
    if (value >= 85) return '#166534'
    if (value >= 75) return '#15803d'
    if (value >= 65) return '#4ade80'
    if (value >= 55) return '#fbbf24'
    return '#f87171'
  }
  if (metric === 'stale_rate') {
    if (value <= 10) return '#166534'
    if (value <= 20) return '#15803d'
    if (value <= 30) return '#4ade80'
    if (value <= 40) return '#fbbf24'
    return '#f87171'
  }
  // median_resolution_days — lower is better
  if (value <= 3) return '#166534'
  if (value <= 7) return '#15803d'
  if (value <= 14) return '#4ade80'
  if (value <= 21) return '#fbbf24'
  return '#f87171'
}

function pointColor(flag: string): string {
  return flag === 'stale' ? '#f87171' : '#fbbf24'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapClient({ points, districts, geojson, dict, lang }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<import('leaflet').Map | null>(null)
  const clusterRef = useRef<import('leaflet').LayerGroup | null>(null)
  const choroplethRef = useRef<import('leaflet').GeoJSON | null>(null)

  const [filter, setFilter] = useState<MapFilter>('stale')
  const [metric, setMetric] = useState<ChoroplethMetric>('resolution_rate')
  const [showChoropleth, setShowChoropleth] = useState(true)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<MapPoint | null>(null)

  // District lookup
  const districtMap = useRef<Map<string, DistrictData>>(
    new Map(districts.map((d) => [d.district, d]))
  )
  const initAbortRef = useRef<AbortController | null>(null)

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
        delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const map = L.map(mapRef.current!, {
          center: BKK_CENTER,
          zoom: BKK_ZOOM,
          zoomControl: true,
        })

        if (signal.aborted) {
          map.remove()
          return
        }

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
    ;(async () => {
      const L = (await import('leaflet')).default
      choroplethRef.current?.remove()

      if (!showChoropleth) return

      const layer = L.geoJSON(geojson as GeoJSON.FeatureCollection, {
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
        },
      }).addTo(leafletMap.current)

      choroplethRef.current = layer as unknown as import('leaflet').LayerGroup
    })()
  }, [ready, showChoropleth, metric, geojson, lang, dict])

  // ── Cluster layer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !leafletMap.current) return
    ;(async () => {
      const L = (await import('leaflet')).default
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
        marker.on('click', () => setSelected(pt))
        layer.addLayer(marker)
      })

      layer.addTo(leafletMap.current!)
      clusterRef.current = layer
    })()
  }, [ready, filter, points])

  // ── Popup panel ─────────────────────────────────────────────────────────────
  const PopupPanel = selected ? (
    <div className="absolute bottom-4 left-4 z-[1000] w-72 rounded-xl border border-white/10 bg-[#0f0f1a]/95 backdrop-blur-md p-4 shadow-2xl">
      <button
        onClick={() => setSelected(null)}
        className="absolute top-3 right-3 text-zinc-500 hover:text-white text-xs"
      >✕</button>
      <p className="text-xs text-zinc-500 font-mono mb-2">{selected.ticket_id}</p>
      <p className="text-sm font-semibold text-white mb-1">{selected.type}</p>
      <p className="text-xs text-zinc-400 mb-3">
        {dict.map.popup_district}: {districtName(selected.district, lang)}
      </p>
      <div className="space-y-1">
        {selected.days_open !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">{dict.map.popup_days_open}</span>
            <span className={`font-semibold ${selected.flag === 'stale' ? 'text-red-400' : 'text-white'}`}>
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
          <span className="text-zinc-500">Type</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            selected.flag === 'stale' ? 'bg-red-400/10 text-red-400' : 'bg-amber-400/10 text-amber-400'
          }`}>
            {selected.flag === 'stale' ? dict.map.filter_stale : dict.map.filter_low_sat}
          </span>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'stale', 'low_sat'] as MapFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === f
                  ? 'bg-teal-500 border-teal-500 text-white'
                  : 'bg-[#0f0f1a]/80 border-white/10 text-zinc-400 hover:text-white'
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
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              showChoropleth
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-[#0f0f1a]/80 border-white/10 text-zinc-400 hover:text-white'
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
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Ticket popup panel */}
      {PopupPanel}

      {/* Legend */}
      {showChoropleth && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border border-white/10 bg-[#0f0f1a]/90 backdrop-blur p-3 text-xs">
          <p className="text-zinc-400 mb-2 font-medium">{dict.map.choropleth_label}</p>
          {[
            { color: '#166534', label: metric === 'median_resolution_days' ? '≤3d' : metric === 'stale_rate' ? '≤10%' : '≥85%' },
            { color: '#4ade80', label: metric === 'median_resolution_days' ? '≤14d' : metric === 'stale_rate' ? '≤30%' : '≥65%' },
            { color: '#fbbf24', label: metric === 'median_resolution_days' ? '≤21d' : metric === 'stale_rate' ? '≤40%' : '≥55%' },
            { color: '#f87171', label: metric === 'median_resolution_days' ? '>21d' : metric === 'stale_rate' ? '>40%' : '<55%' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
              <span className="text-zinc-400">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
