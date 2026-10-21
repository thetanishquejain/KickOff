import { LogoMark } from "./logo"

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-8 text-sm text-ink-muted md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span>Kickoff: verified revenue for Indian startups.</span>
        </div>
        <p className="text-xs">
          v1 verifies payment data from Razorpay exports. Identity, ownership and tax checks are coming in v2.
        </p>
      </div>
    </footer>
  )
}
