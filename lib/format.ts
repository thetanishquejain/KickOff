// INR formatting helpers (Indian grouping, lakh / crore short forms)

export function inr(value: number | null | undefined, opts?: { decimals?: number }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–"
  const decimals = opts?.decimals ?? 0
  const sign = value < 0 ? "-" : ""
  return (
    sign +
    "₹" +
    Math.abs(value).toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  )
}

/** Short form: ₹850, ₹42.5K, ₹4.24L, ₹2.4Cr */
export function inrShort(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–"
  const sign = value < 0 ? "-" : ""
  const v = Math.abs(value)
  if (v >= 1e7) return `${sign}₹${trim(v / 1e7, 2)}Cr`
  if (v >= 1e5) return `${sign}₹${trim(v / 1e5, 2)}L`
  if (v >= 1e3) return `${sign}₹${trim(v / 1e3, 1)}K`
  return `${sign}₹${Math.round(v)}`
}

function trim(n: number, d: number) {
  return Number(n.toFixed(d)).toString()
}

export function pct(value: number | null | undefined, opts?: { sign?: boolean; decimals?: number }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–"
  const d = opts?.decimals ?? 1
  const s = Number(value.toFixed(d)).toString()
  return `${opts?.sign && value > 0 ? "+" : ""}${s}%`
}

export function multiple(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–"
  return `${Number(value.toFixed(1))}x`
}

export function monthLabel(key: string): string {
  // key: "2026-09"
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function initials(name?: string | null): string {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}
