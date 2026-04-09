export default function DistrictsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Selector skeleton */}
      <div className="h-10 w-64 rounded-lg bg-[--color-surface-800] animate-pulse" />
      {/* Card skeleton */}
      <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] p-6 space-y-4 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-[--color-surface-700]" />
            <div className="h-4 w-24 rounded bg-[--color-surface-700]" />
          </div>
          <div className="h-16 w-16 rounded-xl bg-[--color-surface-700]" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-[--color-surface-800]" />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-[--color-surface-800]" />
      </div>
    </div>
  )
}
