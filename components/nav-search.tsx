"use client"

import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

export function NavSearch({ className, autoFocus, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter()
  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault()
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim()
        router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace")
        onDone?.()
      }}
    >
      <label htmlFor={autoFocus ? "nav-q-m" : "nav-q"} className="sr-only">
        Search startups
      </label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      <input
        id={autoFocus ? "nav-q-m" : "nav-q"}
        name="q"
        autoFocus={autoFocus}
        placeholder="Search startups"
        className="h-9 w-full rounded-md border border-line bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </form>
  )
}
