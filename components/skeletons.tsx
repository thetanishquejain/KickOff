export function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className}`} />
}

export function PageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-6 pt-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <Bar className="h-7 w-48" />
      <Bar className="h-4 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
            <Bar className="h-10 w-10" />
            <Bar className="h-4 w-2/3" />
            <Bar className="h-8 w-1/2" />
            <Bar className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 8, label = "Loading leaderboard" }: { rows?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-4 pt-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <Bar className="h-7 w-40" />
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex h-[60px] items-center gap-4 border-b border-line px-4 last:border-0">
            <Bar className="size-7 rounded-full" />
            <Bar className="size-9" />
            <Bar className="h-4 flex-1" />
            <Bar className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
