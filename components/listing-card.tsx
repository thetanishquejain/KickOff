import Link from "next/link"
import { AlertTriangle, BadgeCheck, ShieldCheck } from "lucide-react"

import { askingMultiple, type ListingFull } from "@/lib/data"
import { inrShort, multiple } from "@/lib/format"
import { isForSale } from "@/lib/market-query"
import { cn } from "@/lib/utils"

import { Growth, InitialAvatar } from "./kit"
import { ForSaleTag } from "./listing-row"

/** Compact marketplace card: identity, pitch, and the four numbers buyers compare first. */
export function ListingCard({ l, className }: { l: ListingFull; className?: string }) {
  const m = l.metrics
  return (
    <Link
      href={`/listing/${l.id}`}
      className={cn(
        "group flex flex-col rounded-lg border border-line bg-surface shadow-card transition-[border-color,box-shadow] duration-150 hover:border-ink-muted/30 hover:shadow-pop focus-visible:ring-2 focus-visible:ring-brand",
        className
      )}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <InitialAvatar name={l.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-ink group-hover:text-brand">{l.name}</span>
            {m && <BadgeCheck className="size-4 shrink-0 text-verified" aria-label="Revenue checked from payment data" />}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-caption text-ink-muted">
            <span className="truncate">{l.category}</span>
            {l.is_demo && (
              <>
                <span aria-hidden="true">·</span>
                <span title="Sample listing with generated payment data">Demo data</span>
              </>
            )}
            {isForSale(l) ? (
              <span className="ml-auto pl-2">
                <ForSaleTag />
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mb-3 line-clamp-2 min-h-[2.5rem] px-4 text-label text-ink-muted">{l.pitch}</p>

      <dl className="mt-auto grid grid-cols-2 border-t border-line text-label">
        <div className="border-r border-line px-4 py-2.5">
          <dt className="text-caption text-ink-muted">MRR</dt>
          <dd className="num flex items-baseline gap-1.5 text-lg font-semibold text-ink">
            {m ? inrShort(m.mrr) : <span className="text-sm font-normal text-ink-muted">Not verified</span>}
            {m && <Growth value={m.growth_pct} className="text-caption" />}
          </dd>
        </div>
        <div className="px-4 py-2.5">
          <dt className="text-caption text-ink-muted">Revenue, 6 mo</dt>
          <dd className="num text-lg font-semibold text-ink">{m ? inrShort(m.revenue_6m) : "–"}</dd>
        </div>
        <div className="border-r border-t border-line px-4 py-2.5">
          <dt className="text-caption text-ink-muted">Asking</dt>
          <dd className="num font-medium text-ink">{l.asking_price_inr ? inrShort(l.asking_price_inr) : <span className="font-normal text-ink-muted">Not set</span>}</dd>
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <dt className="text-caption text-ink-muted">Multiple</dt>
          <dd className="num font-medium text-ink">{askingMultiple(l) !== null ? multiple(askingMultiple(l)) : <span className="font-normal text-ink-muted">–</span>}</dd>
        </div>
      </dl>

      {l.flags.length > 0 ? (
        <div className="flex items-center gap-1.5 border-t border-line px-4 py-2 text-caption text-warning">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{l.flags.length === 1 ? l.flags[0].title : `${l.flags.length} risk flags`}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 border-t border-line px-4 py-2 text-caption text-ink-muted">
          <ShieldCheck className="size-3.5 shrink-0 text-verified" aria-hidden="true" />
          <span className="truncate">{m ? "No risk flags in payment data" : "Revenue not checked yet"}</span>
        </div>
      )}
    </Link>
  )
}
