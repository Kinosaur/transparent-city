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
  }
}

type Props = {
  points: MapPoint[]
  districts: DistrictData[]
  geojson: object
  dict: Dict
  lang: Locale
}

export default function MapLoader(props: Props) {
  return <MapClient {...props} />
}
