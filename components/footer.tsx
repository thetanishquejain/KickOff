import Link from "next/link"

import { LogoMark } from "./logo"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/marketplace", label: "Marketplace" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "For founders",
    links: [
      { href: "/signup?role=founder", label: "List your startup" },
      { href: "/dashboard", label: "My listings" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "mailto:hello@kickoff.example", label: "Contact (placeholder)" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 md:grid-cols-[1.5fr_repeat(3,1fr)] md:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <LogoMark size={22} />
            Kickoff
          </div>
          <p className="max-w-xs text-sm text-ink-muted">
            A marketplace for Indian startups with revenue checked from payment data.
          </p>
          <p className="max-w-xs text-caption text-ink-muted">
            v1 checks Razorpay payment exports. It does not audit financial statements or verify identity or ownership.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ink">{c.title}</span>
            {c.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-ink-muted transition-colors duration-150 hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1200px] px-4 py-4 text-caption text-ink-muted md:px-8">© {new Date().getFullYear()} Kickoff. Built for an AI hackathon.</p>
      </div>
    </footer>
  )
}
