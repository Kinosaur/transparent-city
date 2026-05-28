'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyTrend } from '@/lib/types'

type Props = {
  data: MonthlyTrend[]
  dict: {
    charts: {
      monthly_trend_title: string
      monthly_trend_subtitle: string
      resolved: string
      pending: string
      total: string
    }
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatYm(ym: string): string {
  const [year, month] = ym.split('-')
  return `${MONTHS[parseInt(month) - 1]} '${year.slice(2)}`
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { color: string; name: string; value: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[--color-border] bg-[--color-surface-800]/95 backdrop-blur-sm px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-[--color-fg]">{formatYm(label ?? '')}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mt-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span style={{ color: p.color }} className="font-medium">{p.name}:</span>
          <span className="text-[--color-fg]">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyChart({ data, dict }: Props) {
  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 pt-5 pb-3">
      <h2 className="text-sm font-semibold text-[--color-fg] mb-0.5">
        {dict.charts.monthly_trend_title}
      </h2>
      <p className="text-xs text-[--color-muted] mb-4">{dict.charts.monthly_trend_subtitle}</p>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="ym"
            tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYm}
            interval={2}
          />
          <YAxis
            tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: 'var(--color-subtle)' }}>{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="total"
            name={dict.charts.total}
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2dd4bf' }}
          />
          <Line
            type="monotone"
            dataKey="resolved"
            name={dict.charts.resolved}
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#4ade80' }}
          />
          <Line
            type="monotone"
            dataKey="pending"
            name={dict.charts.pending}
            stroke="#f87171"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 4, fill: '#f87171' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
