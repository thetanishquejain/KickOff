import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { askingMultiple, type ListingFull } from "@/lib/data"
import { inrShort, multiple } from "@/lib/format"
import { isForSale } from "@/lib/market-query"

import { FlagIcon, InitialAvatar } from "./kit"
import { ForSaleTag } from "./listing-row"

/** Horizontally scrolling strip of compact deal cards: identity plus MRR, price and multiple. */
export function ListingRail({ title, href, linkLabel, listings, empty, id }: { title: string; href: string; linkLabel: string; listings: ListingFull[]; empty: string; id: string }) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <Link href={href} className="inline-flex items-center gap-0.5 text-label text-ink-muted hover:text-brand">
          {linkLabel} <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {listings.length ? (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] md:mx-0 md:px-0">
          {listings.map((l) => (
            <li key={l.id} className="w-[264px] shrink-0 snap-start">
              <RailCard l={l} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line px-6 py-8 text-center text-sm text-ink-muted">{empty}</p>
      )}
    </section>
  )
}

function RailCard({ l }: { l: ListingFull }) {
  const m = l.metrics
  const mult = askingMultiple(l)
  return (
    <Link
      href={`/listing/${l.id}`}
      className="group flex h-full flex-col rounded-lg border border-line bg-surface p-3.5 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-ink-muted/30 hover:shadow-pop"
    >
      <div className="flex items-start gap-2.5">
        <InitialAvatar name={l.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-medium group-hover:text-brand">{l.name}</span>
            <FlagIcon titles={l.flags.map((f) => f.title)} />
          </div>
          <div className="truncate text-caption text-ink-muted">
            {l.category}
            {l.is_demo ? " · demo" : ""}
          </div>
        </div>
        {isForSale(l) ? <ForSaleTag /> : null}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2.5">
        {[
          ["MRR", m ? inrShort(m.mrr) : "–"],
          ["Price", l.asking_price_inr ? inrShort(l.asking_price_inr) : "–"],
          ["Multiple", mult !== null ? multiple(mult) : "–"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">{k}</dt>
            <dd className="num text-sm font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </Link>
  )
}
