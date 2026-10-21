import { INSIGHT_FIELDS, type Insights } from "@/lib/insights"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const field = "rounded-md border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"

/** Optional founder-written context shown to buyers as "Startup insights". */
export function InsightFields({ insights, foundedOn }: { insights?: Insights | null; foundedOn?: string | null }) {
  const i = insights ?? {}
  return (
    <fieldset className="grid gap-4 border-t border-line pt-4">
      <legend className="sr-only">Startup insights</legend>
      <div>
        <h3 className="text-sm font-semibold">Startup insights (optional)</h3>
        <p className="text-caption text-ink-muted">Shown to buyers as your own words, next to the verified numbers. Leave out anything you don&apos;t want public.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="insight_customer_type">Customers are</Label>
          <select id="insight_customer_type" name="insight_customer_type" defaultValue={i.customer_type ?? ""} className={`h-10 ${field} py-0`}>
            <option value="">Not set</option>
            <option value="B2B">Businesses (B2B)</option>
            <option value="B2C">Consumers (B2C)</option>
            <option value="B2B and B2C">Both</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="founded_on">Founded</Label>
          <Input id="founded_on" name="founded_on" type="month" defaultValue={foundedOn ? foundedOn.slice(0, 7) : ""} max={new Date().toISOString().slice(0, 7)} />
        </div>
        {INSIGHT_FIELDS.map((f) => (
          <div key={f.key} className={`grid gap-2 ${f.rows ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={`insight_${f.key}`}>{f.label}</Label>
            {f.rows ? (
              <textarea id={`insight_${f.key}`} name={`insight_${f.key}`} rows={f.rows} maxLength={f.max} defaultValue={i[f.key] ?? ""} placeholder={f.placeholder} className={field} />
            ) : (
              <Input id={`insight_${f.key}`} name={`insight_${f.key}`} maxLength={f.max} defaultValue={i[f.key] ?? ""} placeholder={f.placeholder} />
            )}
          </div>
        ))}
      </div>
    </fieldset>
  )
}
