import Link from "next/link"
import { Megaphone } from "lucide-react"

import type { ListingFull } from "@/lib/data"
import { inrShort } from "@/lib/format"
import { avatarTone } from "@/lib/theme"
import { initials } from "@/lib/format"

/**
 * Side rails for very wide screens (home page only). Tiles are Kickoff's own published
 * startups, labelled "Featured", never third-party ads. Paid placements are a v2 feature,
 * so the last tile is an "Advertise · coming soon" slot.
 */
export function SideRails({ listings }: { listings: ListingFull[] }) {
  const picks = [...listings].filter((l) => l.metrics).sort((a, b) => (b.metrics?.mrr ?? 0) - (a.metrics?.mrr ?? 0)).slice(0, 8)
  if (picks.length < 2) return null
  const left = picks.filter((_, i) => i % 2 === 0)
  const right = picks.filter((_, i) => i % 2 === 1)
  return (
    <>
      <Rail side="left" items={left} />
      <Rail side="right" items={right} />
    </>
  )
}

function Rail({ side, items }: { side: "left" | "right"; items: ListingFull[] }) {
  return (
    <aside
      aria-label={side === "left" ? "Featured startups" : "More featured startups"}
      className="fixed top-20 z-10 hidden max-h-[calc(100vh-6rem)] w-[148px] flex-col gap-2.5 overflow-y-auto pb-6 [scrollbar-width:none] min-[1536px]:flex"
      style={side === "left" ? { left: "max(16px, calc((100vw - 1200px) / 2 - 160px))" } : { right: "max(16px, calc((100vw - 1200px) / 2 - 160px))" }}
    >
      <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-ink-muted">Featured on Kickoff</span>
      {items.map((l) => (
        <FeatureTile key={l.id} l={l} />
      ))}
      <Link
        href="/advertise"
        className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-5 text-center transition-colors duration-150 hover:border-ink-muted/40 hover:bg-surface"
      >
        <Megaphone className="size-4 text-ink-muted" aria-hidden="true" />
        <span className="text-sm font-medium text-ink">Advertise here</span>
        <span className="text-caption text-ink-muted">Coming soon</span>
      </Link>
    </aside>
  )
}

function FeatureTile({ l }: { l: ListingFull }) {
  const tone = avatarTone(l.name)
  return (
    <Link
      href={`/listing/${l.id}`}
      className="group flex flex-col items-center gap-1.5 rounded-lg px-3 py-4 text-center shadow-card transition-transform duration-150 hover:-translate-y-0.5"
      style={{ background: tone.bg, color: tone.fg }}
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-white/70 text-sm font-bold" aria-hidden="true">
        {initials(l.name)}
      </span>
      <span className="text-label font-semibold leading-tight">{l.name}</span>
      <span className="line-clamp-2 text-[11px] leading-4 opacity-80">{l.pitch}</span>
      {l.metrics && (
        <span className="num mt-0.5 text-caption font-semibold">
          {inrShort(l.metrics.mrr)} MRR{l.is_demo ? " · demo" : ""}
        </span>
      )}
    </Link>
  )
}
