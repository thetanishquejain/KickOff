"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { inr } from "@/lib/format"
import {
  BUSINESS_MODELS,
  CATEGORY_LIST,
  DEFAULT_STATE,
  GROWTH_OPTIONS,
  marketHref,
  parseMoney,
  withChange,
  type MarketState,
} from "@/lib/market-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MRR_PRESETS = [25000, 50000, 100000, 500000]
const PRICE_PRESETS = [1000000, 2500000, 5000000, 10000000]
const MULTIPLE_PRESETS = [2, 3, 5]

const control =
  "h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"

/**
 * Filter panel. The URL is the only source of truth: every change pushes a new URL (so Back
 * and Forward work) and the server renders results for it. Money inputs keep a local draft
 * until Apply, so typing doesn't fire a query per keystroke. The parent remounts this panel
 * with a key of the current URL, so drafts always resync after navigation.
 */
export function FilterPanel({ state, counts }: { state: MarketState; counts: Record<string, number> }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState({
    q: state.q,
    minMrr: state.minMrr?.toString() ?? "",
    maxPrice: state.maxPrice?.toString() ?? "",
    maxMultiple: state.maxMultiple?.toString() ?? "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const go = (patch: Partial<MarketState>) => start(() => router.push(marketHref(withChange(state, patch)), { scroll: false }))

  function applyDraft(e?: React.FormEvent) {
    e?.preventDefault()
    const next: Record<string, string> = {}
    const read = (key: "minMrr" | "maxPrice" | "maxMultiple") => {
      const raw = draft[key].trim()
      if (!raw) return null
      const n = parseMoney(raw)
      if (n === null || (key === "maxMultiple" && (n <= 0 || n > 1000))) {
        next[key] = key === "maxMultiple" ? "Enter a number like 3 or 2.5" : "Enter an amount in rupees, like 100000"
        return undefined
      }
      return n
    }
    const minMrr = read("minMrr")
    const maxPrice = read("maxPrice")
    const maxMultiple = read("maxMultiple")
    setErrors(next)
    if (Object.keys(next).length) return
    go({ q: draft.q.trim().slice(0, 80), minMrr: minMrr ?? null, maxPrice: maxPrice ?? null, maxMultiple: maxMultiple ?? null })
  }

  const catTotal = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        <div className="flex items-center gap-2">
          {pending && (
            <span className="inline-flex items-center gap-1 text-caption text-ink-muted" role="status">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Updating
            </span>
          )}
          <button type="button" onClick={() => start(() => router.push(marketHref({ ...DEFAULT_STATE, sort: state.sort, range: state.range, view: state.view }), { scroll: false }))} className="text-caption text-ink-muted underline-offset-2 hover:text-ink hover:underline">
            Reset all
          </button>
        </div>
      </div>

      <form onSubmit={applyDraft} className="flex flex-col gap-4" noValidate>
        <Field label="Search" htmlFor="f-q">
          <input id="f-q" type="search" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Name, pitch, category" className={control} maxLength={80} />
        </Field>

        <Field label="Minimum MRR (₹)" htmlFor="f-mrr" error={errors.minMrr} hint={state.minMrr !== null ? `Applied: ${inr(state.minMrr)}` : undefined}>
          <input id="f-mrr" inputMode="numeric" value={draft.minMrr} onChange={(e) => setDraft({ ...draft, minMrr: e.target.value })} placeholder="e.g. 100000" className={control} aria-invalid={Boolean(errors.minMrr)} aria-describedby="f-mrr-msg" />
          <Presets values={MRR_PRESETS} format={(v) => `${inr(v)}+`} active={state.minMrr} onPick={(v) => go({ minMrr: v })} label="Minimum MRR presets" />
        </Field>

        <Field label="Maximum asking price (₹)" htmlFor="f-price" error={errors.maxPrice} hint={state.maxPrice !== null ? `Applied: ${inr(state.maxPrice)}` : undefined}>
          <input id="f-price" inputMode="numeric" value={draft.maxPrice} onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })} placeholder="e.g. 1000000" className={control} aria-invalid={Boolean(errors.maxPrice)} aria-describedby="f-price-msg" />
          <Presets values={PRICE_PRESETS} format={(v) => `≤ ${inr(v)}`} active={state.maxPrice} onPick={(v) => go({ maxPrice: v })} label="Maximum price presets" />
        </Field>

        <Field label="Maximum ARR multiple" htmlFor="f-mult" error={errors.maxMultiple} hint="Asking price ÷ yearly recurring revenue. Listings without ARR are left out when this is set.">
          <input id="f-mult" inputMode="decimal" value={draft.maxMultiple} onChange={(e) => setDraft({ ...draft, maxMultiple: e.target.value })} placeholder="Any" className={control} aria-invalid={Boolean(errors.maxMultiple)} aria-describedby="f-mult-msg" />
          <Presets values={MULTIPLE_PRESETS} format={(v) => `≤ ${v}x`} active={state.maxMultiple} onPick={(v) => go({ maxMultiple: v })} label="Maximum multiple presets" />
        </Field>

        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Apply search and amounts
        </Button>
      </form>

      <fieldset className="flex flex-col gap-0.5">
        <legend className="mb-1.5 text-caption font-medium uppercase tracking-wide text-ink-muted">Category</legend>
        <CatButton active={!state.category} count={catTotal} onClick={() => go({ category: null })}>
          All categories
        </CatButton>
        {CATEGORY_LIST.filter((c) => counts[c]).map((c) => (
          <CatButton key={c} active={state.category === c} count={counts[c]} onClick={() => go({ category: c })}>
            {c}
          </CatButton>
        ))}
      </fieldset>

      <Field label="Business model" htmlFor="f-bm">
        <select id="f-bm" value={state.businessModel ?? ""} onChange={(e) => go({ businessModel: (e.target.value || null) as MarketState["businessModel"] })} className={control}>
          <option value="">All</option>
          {BUSINESS_MODELS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Month-on-month MRR growth" htmlFor="f-growth" hint="Needs two full months with MRR. Listings without a valid previous month are left out.">
        <select id="f-growth" value={state.growth ?? ""} onChange={(e) => go({ growth: (e.target.value || null) as MarketState["growth"] })} className={control}>
          <option value="">Any</option>
          {GROWTH_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-1">
        <Switch id="f-sale" checked={state.forSale} onChange={(v) => go({ forSale: v })} label="For sale only" hint="Founder has marked the startup as open to offers" />
        <Switch id="f-risk" checked={state.hideRisks} onChange={(v) => go({ hideRisks: v })} label="Hide listings with risk flags" hint="Off by default so buyers see every flag" />
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children, error, hint }: { label: string; htmlFor: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-caption font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </label>
      {children}
      <p id={`${htmlFor}-msg`} className={cn("text-caption", error ? "text-danger" : "text-ink-muted", !error && !hint && "sr-only")}>
        {error ?? hint ?? ""}
      </p>
    </div>
  )
}

function Presets({ values, format, active, onPick, label }: { values: number[]; format: (v: number) => string; active: number | null; onPick: (v: number | null) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={active === v}
          onClick={() => onPick(active === v ? null : v)}
          className={cn(
            "rounded-md border px-2 py-0.5 text-caption transition-colors duration-150",
            active === v ? "border-brand bg-brand/10 font-medium text-brand" : "border-line bg-surface text-ink hover:bg-surface-hover"
          )}
        >
          {format(v)}
        </button>
      ))}
    </div>
  )
}

function CatButton({ active, count, onClick, children }: { active: boolean; count?: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-150",
        active ? "bg-brand/10 font-medium text-brand" : "text-ink hover:bg-surface-hover"
      )}
    >
      <span>{children}</span>
      {count !== undefined && <span className="num text-caption text-ink-muted">{count}</span>}
    </button>
  )
}

function Switch({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-hint`}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-4 w-7 shrink-0 rounded-full transition-colors duration-150", checked ? "bg-brand" : "bg-line")}
      >
        <span className={cn("absolute top-0.5 size-3 rounded-full bg-surface shadow transition-all duration-150", checked ? "left-3.5" : "left-0.5")} />
        <span className="sr-only">{label}</span>
      </button>
      <label htmlFor={id} className="cursor-pointer text-sm leading-5 text-ink">
        {label}
        <span id={`${id}-hint`} className="block text-caption text-ink-muted">
          {hint}
        </span>
      </label>
    </div>
  )
}
