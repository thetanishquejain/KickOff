// Keyword fallback used only when Claude isn't configured. Results are marked "rules".
import type { Interval, Label } from "./metrics"

export function ruleLabel(
  description: string,
  status: string,
  ctx?: { customer_payments?: number; customer_same_amount?: boolean }
): { label: Label; interval: Interval } {
  const d = description.toLowerCase()
  if (/\brefund|chargeback/.test(d)) return { label: "refund", interval: null }
  if (/(annual|yearly|12 months|per year)/.test(d)) return { label: "recurring", interval: "yearly" }
  if (/(lifetime|ltd\b|setup|onboarding|one[- ]?time|consult|custom report)/.test(d))
    return { label: "one_time", interval: null }
  if (/(plan|renewal|subscription|monthly|seats|license|licence)/.test(d))
    return { label: "recurring", interval: "monthly" }
  // Same customer, same amount, 3+ times: treat as a subscription.
  if ((ctx?.customer_payments ?? 0) >= 3 && ctx?.customer_same_amount) return { label: "recurring", interval: "monthly" }
  return { label: "unclear", interval: null }
}
