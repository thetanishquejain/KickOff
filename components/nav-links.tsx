"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Main">
      {NAV_LINKS.map((l) => {
        const active = pathname?.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
              active ? "bg-surface-hover font-medium text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
