export default function MapLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Map skeleton */}
      <div className="flex-1 relative overflow-hidden bg-[--color-surface-900]">
        <div className="absolute inset-0 animate-pulse bg-[--color-surface-800]" />
        {/* Grid lines to suggest a map */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Center pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: '#2dd4bf' }} />
        </div>
      </div>
    </div>
  )
}
