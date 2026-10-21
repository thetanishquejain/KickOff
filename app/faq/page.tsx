import Link from "next/link"

import { FAQ } from "@/lib/content"
import { FaqList } from "@/components/faq-list"
import { PageHeader } from "@/components/page-header"

export const metadata = { title: "FAQ" }

export default function FaqPage() {
  return (
    <div className="grid gap-8 pb-8 lg:grid-cols-[1fr_2fr]">
      <div>
        <PageHeader title="Frequently asked questions">
          How Kickoff checks revenue, what the numbers mean, and what verification does and doesn&apos;t prove.
        </PageHeader>
        <p className="text-sm text-ink-muted">
          Still unsure? Read{" "}
          <Link href="/how-it-works" className="text-brand hover:underline">
            how it works
          </Link>{" "}
          or our{" "}
          <Link href="/terms" className="text-brand hover:underline">
            terms
          </Link>
          .
        </p>
      </div>
      <div className="lg:pt-10">
        <FaqList items={FAQ} defaultOpen={0} />
      </div>
    </div>
  )
}
