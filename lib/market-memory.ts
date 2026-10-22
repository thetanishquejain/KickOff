// In-memory implementation of the marketplace query interface, with SQL semantics:
// comparisons against NULL are false, NULLs sort last, count is taken before the page window.
// Used by tests (fixtures) and as a temporary fallback before the marketplace view exists.

import type { Filterable } from "./market-query"

type Row = Record<string, unknown>
type Pred = (r: Row) => boolean

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v))

export class MemoryQuery implements Filterable<MemoryQuery> {
  private preds: Pred[] = []
  private orders: { col: string; ascending: boolean; nullsFirst: boolean }[] = []
  private window: [number, number] | null = null

  constructor(private rows: Row[]) {}

  eq(c: string, v: unknown) {
    this.preds.push((r) => r[c] !== null && r[c] !== undefined && r[c] === v)
    return this
  }
  gt(c: string, v: number) {
    this.preds.push((r) => num(r[c]) !== null && num(r[c])! > v)
    return this
  }
  gte(c: string, v: number) {
    this.preds.push((r) => num(r[c]) !== null && num(r[c])! >= v)
    return this
  }
  lte(c: string, v: number) {
    this.preds.push((r) => num(r[c]) !== null && num(r[c])! <= v)
    return this
  }
  /** Supports the "col.ilike.*term*,col.ilike.*term*" form the marketplace builds. */
  or(filters: string) {
    const parts = filters.split(",").map((p) => {
      const [col, op, ...rest] = p.split(".")
      const pat = rest.join(".").replace(/^\*|\*$/g, "").toLowerCase()
      if (op !== "ilike") throw new Error(`Unsupported operator ${op}`)
      return (r: Row) => String(r[col] ?? "").toLowerCase().includes(pat)
    })
    this.preds.push((r) => parts.some((p) => p(r)))
    return this
  }
  order(col: string, opts: { ascending: boolean; nullsFirst: boolean }) {
    this.orders.push({ col, ...opts })
    return this
  }
  range(from: number, to: number) {
    this.window = [from, to]
    return this
  }

  run(): { data: Row[]; count: number } {
    const matched = this.rows.filter((r) => this.preds.every((p) => p(r)))
    const cmp = (a: Row, b: Row) => {
      for (const o of this.orders) {
        const av = a[o.col]
        const bv = b[o.col]
        const an = av === null || av === undefined
        const bn = bv === null || bv === undefined
        if (an && bn) continue
        if (an) return o.nullsFirst ? -1 : 1
        if (bn) return o.nullsFirst ? 1 : -1
        const x = typeof av === "number" || typeof bv === "number" || (!isNaN(Number(av)) && !isNaN(Number(bv)) && typeof av !== "boolean") ? Number(av) - Number(bv) : String(av).localeCompare(String(bv))
        if (x !== 0) return o.ascending ? x : -x
      }
      return 0
    }
    const sorted = [...matched].sort(cmp)
    const data = this.window ? sorted.slice(this.window[0], this.window[1] + 1) : sorted
    return { data, count: matched.length }
  }
}
