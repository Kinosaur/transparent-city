'use client'

import dynamic from 'next/dynamic'
import type { MapPoint, DistrictData, Locale } from '@/lib/types'

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-[--color-muted] text-sm">
      Loading map…
    </div>
  ),
})

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
    controls_title: string
    reports_label: string
    district_context: string
    district_metric: string
    district_jump: string
    legend_title: string
    data_notes: string
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

export default function MapLoader(props: Props) {
  return <MapClient {...props} />
}
