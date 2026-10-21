"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SortSelect({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const next = new URLSearchParams(params?.toString())
        if (v === "mrr") next.delete("sort")
        else next.set("sort", v)
        next.delete("show")
        router.replace(`${pathname}?${next.toString()}`, { scroll: false })
      }}
    >
      <SelectTrigger className="h-9 w-48" aria-label="Sort startups">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-line bg-surface">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
