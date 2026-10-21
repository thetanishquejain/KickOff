import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { askingMultiple, type ListingFull } from "@/lib/data"
import { inrShort, multiple } from "@/lib/format"

import { DemoTag, Growth, InitialAvatar, VerifiedBadge } from "./kit"

export function ListingCard({ l }: { l: ListingFull }) {
  const m = l.metrics
  return (
    <Link
      href={`/listing/${l.id}`}
      className="group flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 shadow-card transition-colors duration-150 hover:border-[#33416a] hover:bg-surface-hover"
    >
      <div className="flex items-center gap-3">
        <InitialAvatar name={l.name} />
        <div className="min-w-0">
          <div className="truncate text-lg font-medium text-ink">{l.name}</div>
          <div className="text-xs text-ink-muted">{l.category}</div>
        </div>
        {l.is_demo && (
          <span className="ml-auto">
            <DemoTag />
          </span>
        )}
      </div>
      <p className="line-clamp-2 min-h-10 text-sm text-ink-muted">{l.pitch}</p>
      <div>
        <div className="flex items-center gap-2">
          <span className="num text-3xl font-bold">{m ? inrShort(m.mrr) : "–"}</span>
          <span className="text-xs text-ink-muted">MRR</span>
        </div>
        <div className="mt-2">{m ? <VerifiedBadge /> : <span className="text-xs text-ink-muted">Not verified yet</span>}</div>
      </div>
      <dl className="grid grid-cols-3 gap-2 border-t border-line pt-4 text-sm">
        <div>
          <dt className="text-xs text-ink-muted">Growth</dt>
          <dd>
            <Growth value={m?.growth_pct} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Asking</dt>
          <dd className="num">{inrShort(l.asking_price_inr)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Multiple</dt>
          <dd className="num">{multiple(askingMultiple(l))}</dd>
        </div>
      </dl>
      {l.flags.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          {l.flags.length === 1 ? l.flags[0].title : `${l.flags.length} risk flags`}
        </div>
      )}
    </Link>
  )
}
