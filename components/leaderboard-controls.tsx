"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Option = { value: string; label: string }

export function LeaderboardControls({
  sorts,
  ranges,
  sort,
  range,
}: {
  sorts: Option[]
  ranges: Option[]
  sort: string
  range: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params?.toString())
    next.set(key, value)
    next.delete("show")
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }
  return (
    <div className="flex gap-2">
      <Select value={sort} onValueChange={(v) => set("sort", v)}>
        <SelectTrigger className="h-10 w-[11rem] border-line bg-surface" aria-label="Sort by">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-line bg-surface">
          {sorts.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={range} onValueChange={(v) => set("range", v)}>
        <SelectTrigger className="h-10 w-[9.5rem] border-line bg-surface" aria-label="Time range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-line bg-surface">
          {ranges.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
