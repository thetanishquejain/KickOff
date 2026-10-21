import Link from "next/link"
import { BadgeCheck, Bot, Calculator, FileSpreadsheet, ShieldAlert } from "lucide-react"

import { BUYER_STEPS, FOUNDER_STEPS } from "@/lib/content"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"

export const metadata = { title: "How it works" }

const PIPELINE = [
  { icon: FileSpreadsheet, title: "Payment export", text: "The founder uploads the payments CSV from Razorpay. Customer emails and phones become one-way codes." },
  { icon: Bot, title: "AI labels", text: "AI reads messy descriptions and labels each payment recurring, one-time, refund or unclear. Founders can correct labels." },
  { icon: Calculator, title: "Code calculates", text: "MRR, growth, refunds, revenue and customer concentration are worked out by code, never by AI." },
  { icon: ShieldAlert, title: "Risk checks", text: "Code flags concentration, revenue spikes, high refunds and unclear payments. AI explains each flag." },
  { icon: BadgeCheck, title: "Number check", text: "Every number in AI-written text is matched against the calculated metrics. If one doesn't match, it's blocked." },
]

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      <PageHeader
        title="How Kickoff works"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/marketplace">Browse startups</Link>
            </Button>
            <Button asChild>
              <Link href="/signup?role=founder">List your startup</Link>
            </Button>
          </div>
        }
      >
        Kickoff turns a founder&apos;s payment data into numbers buyers can compare, and uses AI to explain them in plain English.
      </PageHeader>

      <section aria-labelledby="pipe-heading">
        <h2 id="pipe-heading" className="mb-4 text-lg font-semibold">
          From payment file to verified profile
        </h2>
        <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <li key={p.title} className="flex flex-col gap-2 bg-surface p-5">
              <div className="flex items-center gap-2">
                <span className="num text-caption text-ink-muted">0{i + 1}</span>
                <p.icon className="size-4 text-brand" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold">{p.title}</h3>
              <p className="text-label text-ink-muted">{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Journey id="founders" title="For founders" steps={FOUNDER_STEPS} cta={{ href: "/signup?role=founder", label: "Start a listing" }} />
        <Journey id="buyers" title="For buyers" steps={BUYER_STEPS} cta={{ href: "/marketplace", label: "Browse the marketplace" }} />
      </div>

      <section aria-labelledby="limits-heading" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="limits-heading" className="text-lg font-semibold">
          What verification does and doesn&apos;t prove
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-verified">It shows</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-muted">
              <li>Payments in the uploaded Razorpay export, month by month</li>
              <li>How much is recurring versus one-time</li>
              <li>Refund rate and how much depends on the biggest customer</li>
              <li>Unusual spikes that a buyer should ask about</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-warning">It doesn&apos;t show (yet)</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-muted">
              <li>That the export is complete, or that the founder owns the business</li>
              <li>Profit, expenses or tax filings</li>
              <li>Revenue taken through other gateways or bank transfers</li>
              <li>Anything an independent audit or legal review would cover</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

function Journey({ id, title, steps, cta }: { id: string; title: string; steps: [string, string][]; cta: { href: string; label: string } }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 rounded-lg border border-line bg-surface p-6">
      <h2 id={`${id}-h`} className="text-lg font-semibold">
        {title}
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[28px_1fr] gap-3">
            <span className="num flex size-7 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{i + 1}</span>
            <div>
              <div className="text-sm font-medium">{t}</div>
              <p className="mt-0.5 text-sm text-ink-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href={cta.href} className="mt-5 inline-block text-sm font-medium text-brand hover:underline">
        {cta.label} →
      </Link>
    </section>
  )
}
