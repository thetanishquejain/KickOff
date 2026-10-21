"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

/** On phones and tablets the filter panel folds behind a button; from lg up it is always open. */
export function FilterToggle({ active, children }: { active: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:contents">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="market-filters"
        className="flex h-10 w-full items-center justify-between rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink lg:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {active > 0 && <span className="num rounded-full bg-brand px-1.5 text-caption text-white">{active}</span>}
        </span>
        <span className="text-caption text-ink-muted">{open ? "Hide" : "Show"}</span>
      </button>
      <div id="market-filters" className={cn("mt-4 flex-col gap-5 lg:mt-0 lg:flex", open ? "flex" : "hidden")}>
        {children}
      </div>
    </div>
  )
}
