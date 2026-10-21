"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

/** Goes back to the marketplace/leaderboard view the buyer came from, keeping their filters. */
export function BackLink() {
  const router = useRouter()
  return (
    <Link
      href="/marketplace"
      onClick={(e) => {
        try {
          const ref = document.referrer ? new URL(document.referrer) : null
          if (ref && ref.origin === window.location.origin && /^\/(marketplace|leaderboard)?$/.test(ref.pathname.replace(/\/$/, "") || "/")) {
            e.preventDefault()
            router.back()
          }
        } catch {
          /* fall back to the plain link */
        }
      }}
      className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to results
    </Link>
  )
}
