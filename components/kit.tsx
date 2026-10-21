import { AlertTriangle, ArrowDown, ArrowUp, BadgeCheck } from "lucide-react"

import { initials, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function VerifiedBadge({ label = "Verified MRR", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-verified/15 px-2 py-0.5 text-xs font-medium text-verified",
        className
      )}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

export function DemoTag() {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-sm border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
      Demo data
    </span>
  )
}

export function Growth({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value === null || value === undefined) return <span className={cn("num text-ink-muted", className)}>–</span>
  const up = value >= 0
  return (
    <span className={cn("num inline-flex items-center gap-0.5", up ? "text-verified" : "text-danger", className)}>
      {up ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />}
      {pct(Math.abs(value))}
      <span className="sr-only">{up ? "growth" : "decline"}</span>
    </span>
  )
}

export function InitialAvatar({ name, size = 40, className }: { name: string | null | undefined; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md bg-surface-hover font-semibold text-ink", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function FlagIcon({ titles }: { titles: string[] }) {
  if (!titles.length) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex rounded-sm text-warning" aria-label={`Risk flag: ${titles.join("; ")}`}>
          <AlertTriangle className="size-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 border-line bg-surface text-ink">
        {titles.map((t) => (
          <p key={t} className="text-xs">
            {t}
          </p>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

export function MetricTile({
  label,
  value,
  sub,
  big,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  big?: boolean
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className={cn("num mt-1 font-bold text-ink", big ? "text-3xl" : "text-2xl")}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-ink-muted">{sub}</div> : null}
    </div>
  )
}

export function AiTag({ children = "AI explanation" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-saffron/10 px-1.5 py-0.5 text-[11px] font-medium text-saffron">
      {children}
    </span>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <p className="text-ink">{title}</p>
      {children}
    </div>
  )
}
