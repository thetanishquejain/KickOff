"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/leaderboard", label: "Leaderboard" },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="ml-2 flex items-center gap-1" aria-label="Main">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-md px-2 py-1.5 text-sm transition-colors duration-150 sm:px-3",
            pathname?.startsWith(l.href) ? "text-ink" : "text-ink-muted hover:text-ink"
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
