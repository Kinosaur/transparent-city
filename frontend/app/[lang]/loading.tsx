export default function PageLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[--color-surface-800]" />
        ))}
      </div>
      {/* Chart block */}
      <div className="h-64 rounded-xl bg-[--color-surface-800]" />
      {/* Secondary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-48 rounded-xl bg-[--color-surface-800]" />
        <div className="h-48 rounded-xl bg-[--color-surface-800]" />
      </div>
    </div>
  )
}
