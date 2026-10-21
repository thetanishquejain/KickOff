// Founder-written startup insights. Shown to buyers as the founder's own words; never treated as verified.

export type Insights = {
  value_proposition?: string
  problem?: string
  audience?: string
  customer_type?: "B2B" | "B2C" | "B2B and B2C"
  pricing?: string
  tech_stack?: string
  acquisition_channels?: string
  extra?: string
}

export const INSIGHT_FIELDS: { key: Exclude<keyof Insights, "customer_type">; label: string; placeholder: string; max: number; rows?: number }[] = [
  { key: "value_proposition", label: "Value proposition", placeholder: "What you do, in one or two sentences", max: 280, rows: 2 },
  { key: "problem", label: "Problem solved", placeholder: "The pain your customers had before", max: 400, rows: 2 },
  { key: "audience", label: "Audience", placeholder: "e.g. Freelancers, small agencies, CA firms", max: 160 },
  { key: "pricing", label: "Pricing", placeholder: "e.g. Starter ₹999/month, Pro ₹2,499/month, yearly at 10x", max: 300 },
  { key: "tech_stack", label: "Tech stack", placeholder: "Comma separated, e.g. Next.js, Supabase, Razorpay", max: 200 },
  { key: "acquisition_channels", label: "Where customers come from", placeholder: "e.g. Google search, WhatsApp groups, partner CAs", max: 200 },
  { key: "extra", label: "Anything else buyers should know", placeholder: "Team, what's included in the sale, reason for selling", max: 500, rows: 3 },
]

export function readInsights(form: FormData): Insights {
  const out: Insights = {}
  for (const f of INSIGHT_FIELDS) {
    const v = String(form.get(`insight_${f.key}`) ?? "").trim().slice(0, f.max)
    if (v) out[f.key] = v
  }
  const ct = String(form.get("insight_customer_type") ?? "")
  if (ct === "B2B" || ct === "B2C" || ct === "B2B and B2C") out.customer_type = ct
  return out
}

export function hasInsights(i: Insights | null | undefined): boolean {
  return Boolean(i && Object.values(i).some((v) => typeof v === "string" && v.trim()))
}
