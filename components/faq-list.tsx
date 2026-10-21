"use client"

import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/** Accessible accordion: buttons with aria-expanded, arrow keys move between questions. */
export function FaqList({ items, defaultOpen }: { items: { q: string; a: string }[]; defaultOpen?: number }) {
  const [open, setOpen] = useState<number | null>(defaultOpen ?? null)
  const base = useId()

  function onKey(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const buttons = Array.from(e.currentTarget.closest("[data-faq]")!.querySelectorAll<HTMLButtonElement>("button[data-faq-q]"))
    const go = (n: number) => buttons[(n + buttons.length) % buttons.length]?.focus()
    if (e.key === "ArrowDown") (e.preventDefault(), go(i + 1))
    if (e.key === "ArrowUp") (e.preventDefault(), go(i - 1))
    if (e.key === "Home") (e.preventDefault(), go(0))
    if (e.key === "End") (e.preventDefault(), go(buttons.length - 1))
  }

  return (
    <div data-faq className="divide-y divide-line rounded-lg border border-line bg-surface">
      {items.map((it, i) => {
        const isOpen = open === i
        return (
          <div key={it.q}>
            <h3>
              <button
                type="button"
                data-faq-q
                id={`${base}-q${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-a${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                onKeyDown={(e) => onKey(e, i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-hover"
              >
                {it.q}
                <ChevronDown className={cn("size-4 shrink-0 text-ink-muted transition-transform duration-150", isOpen && "rotate-180")} aria-hidden="true" />
              </button>
            </h3>
            <div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} hidden={!isOpen} className="px-5 pb-4 text-sm leading-6 text-ink-muted">
              {it.a}
            </div>
          </div>
        )
      })}
    </div>
  )
}
