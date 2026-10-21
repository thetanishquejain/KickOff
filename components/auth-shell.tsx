import { BadgeCheck, Bot, ShieldAlert } from "lucide-react"

const POINTS = [
  { icon: BadgeCheck, title: "Revenue from payment data", text: "MRR, growth and refunds are calculated from Razorpay exports, not typed in." },
  { icon: ShieldAlert, title: "Risks flagged up front", text: "Customer concentration, spikes and refunds are checked on every listing." },
  { icon: Bot, title: "AI that shows its working", text: "Summaries and answers only use the listing's verified numbers." },
]

export function AuthShell({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-10 md:grid-cols-[1fr_420px] md:items-start md:py-16">
      <aside className="hidden flex-col gap-6 md:flex">
        <h2 className="max-w-sm text-2xl font-semibold leading-tight tracking-tight">Buy and sell Indian startups on numbers you can check.</h2>
        <ul className="flex flex-col gap-4">
          {POINTS.map((p) => (
            <li key={p.title} className="grid grid-cols-[32px_1fr] gap-3">
              <span className="flex size-8 items-center justify-center rounded-md bg-brand/10 text-brand">
                <p.icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium">{p.title}</span>
                <span className="block text-sm text-ink-muted">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex flex-col gap-4">
        {message && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-ink">
            {message}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
