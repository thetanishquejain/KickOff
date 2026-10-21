import Link from "next/link"

import { askingMultiple, type ListingFull } from "@/lib/data"
import { inrShort, multiple } from "@/lib/format"

import { FlagIcon, Growth, InitialAvatar } from "./kit"

export function ForSaleTag() {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-sm bg-saffron/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-saffron">
      For sale
    </span>
  )
}

/** Compact one-line listing row used on the home page. */
export function ListingRow({ l }: { l: ListingFull }) {
  const m = l.metrics
  return (
    <li>
      <Link
        href={`/listing/${l.id}`}
        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-surface-hover sm:grid-cols-[auto_1fr_repeat(4,auto)] sm:gap-5"
      >
        <InitialAvatar name={l.name} size={32} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{l.name}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
            {l.asking_price_inr ? <ForSaleTag /> : null}
            <span className="truncate">{l.category}</span>
            {l.is_demo && <span className="hidden shrink-0 text-[10px] text-ink-muted xl:inline">· demo</span>}
          </span>
        </span>
        <span className="text-right">
          <span className="flex items-center justify-end gap-1">
            <span className="num text-sm font-bold">{m ? inrShort(m.mrr) : "–"}</span>
            <FlagIcon titles={l.flags.map((f) => f.title)} />
          </span>
          <span className="block text-[11px] text-ink-muted">MRR</span>
        </span>
        <span className="hidden text-right sm:block">
          <Growth value={m?.growth_pct} className="text-sm" />
          <span className="block text-[11px] text-ink-muted">MoM</span>
        </span>
        <span className="hidden text-right sm:block">
          <span className="num text-sm">{inrShort(l.asking_price_inr)}</span>
          <span className="block text-[11px] text-ink-muted">Asking</span>
        </span>
        <span className="hidden text-right sm:block">
          <span className="num text-sm">{multiple(askingMultiple(l))}</span>
          <span className="block text-[11px] text-ink-muted">Multiple</span>
        </span>
      </Link>
    </li>
  )
}

export function ListingRows({ title, href, linkLabel, listings, empty }: { title: string; href: string; linkLabel: string; listings: ListingFull[]; empty: string }) {
  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-end justify-between gap-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <Link href={href} className="text-xs text-ink-muted hover:text-saffron">
          {linkLabel} →
        </Link>
      </div>
      {listings.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {listings.map((l) => (
            <ListingRow key={l.id} l={l} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">{empty}</p>
      )}
    </section>
  )
}

/** Row of small startup tiles that link into the leaderboard. */
export function StartupStrip({ listings }: { listings: ListingFull[] }) {
  if (!listings.length) return null
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Startups on the leaderboard">
      {listings.map((l) => (
        <Link key={l.id} href={`/listing/${l.id}`} title={l.name} className="shrink-0 rounded-md transition-transform duration-150 hover:-translate-y-0.5">
          <InitialAvatar name={l.name} size={40} className="border border-line" />
          <span className="sr-only">{l.name}</span>
        </Link>
      ))}
    </div>
  )
}
