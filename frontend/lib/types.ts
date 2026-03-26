export type ProblemType = {
  type: string
  count: number
  resolution_rate: number | null
  median_resolution_days: number | null
}

export type MonthlyTrend = {
  ym: string
  total: number
  resolved: number
  stale: number
  avg_star: number
  pending: number
  resolution_rate: number
}

export type OverviewData = {
  total_tickets: number
  resolved_tickets: number
  resolution_rate: number
  pending_tickets: number
  stale_tickets: number
  stale_rate: number
  median_resolution_days: number
  avg_satisfaction: number
  avg_reopen_rate: number
  reopen_pct: number
  data_range: { from: string; to: string }
  top_problem_types: ProblemType[]
  monthly_trends: MonthlyTrend[]
}

export type DistrictData = {
  district: string
  total_tickets: number
  resolved_tickets: number
  resolution_rate: number | null
  median_resolution_days: number | null
  avg_satisfaction: number | null
  stale_tickets: number
  reopen_rate: number | null
  composite_score: number | null
  grade: string
  top_types: { type: string; count: number }[]
  monthly_trend: MonthlyTrend[]
  worst_stale: {
    ticket_id: string
    type: string
    days_open: number
    address: string
    last_activity: string
  }[]
}

export type OrgData = {
  organization: string
  total_tickets: number
  resolved_tickets: number
  resolution_rate: number | null
  median_resolution_days: number | null
  avg_satisfaction: number | null
  reopen_rate: number | null
}

export type GalleryItem = {
  ticket_id: string
  type: string
  district: string
  photo: string
  photo_after: string
  days_to_resolve: number | null
  star: number | null
  reported_date: string
  address: string | null
}

export type MapPoint = {
  ticket_id: string
  lat: number
  lon: number
  type: string
  district: string
  days_open: number | null
  star: number | null
  flag: 'stale' | 'low_sat'
}

export type Locale = 'th' | 'en'
