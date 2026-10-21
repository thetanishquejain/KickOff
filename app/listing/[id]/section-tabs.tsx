"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "risks", label: "Risks" },
  { id: "analysis", label: "Buyer analysis" },
]

/** In-page section tabs that jump to each section and highlight the one in view. */
export function SectionTabs({ riskCount }: { riskCount: number }) {
  const [active, setActive] = useState("overview")
  useEffect(() => {
    const els = TABS.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (vis) setActive(vis.target.id)
      },
      { rootMargin: "-120px 0px -55% 0px" }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return (
    <nav aria-label="Listing sections" className="sticky top-16 z-20 -mx-4 border-b border-line bg-bg/95 px-4 backdrop-blur md:mx-0 md:px-0">
      <ul className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              aria-current={active === t.id ? "true" : undefined}
              onClick={() => setActive(t.id)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors duration-150",
                active === t.id ? "border-brand font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              {t.label}
              {t.id === "risks" && riskCount > 0 && <span className="num rounded-full bg-warning/15 px-1.5 text-caption text-warning">{riskCount}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
