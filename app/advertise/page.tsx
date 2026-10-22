import Link from "next/link"

import { PageHeader, Prose } from "@/components/page-header"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Advertise on Kickoff" }

export default function AdvertisePage() {
  return (
    <div className="pb-10">
      <PageHeader title="Advertise on Kickoff">Coming soon.</PageHeader>
      <Prose>
        <p>
          Kickoff will offer a small number of sponsored spots beside the home page, for tools that Indian founders and buyers actually use: payments, compliance, legal, hosting and analytics.
        </p>
        <p>Sponsored spots will always be labelled as sponsored and will never change a startup&apos;s verified numbers, rank or risk flags.</p>
        <p>Until then, the tiles beside the home page are featured Kickoff startups, picked by verified MRR. Nobody pays for them.</p>
      </Prose>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/signup?role=founder">List your startup</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/marketplace">Browse the marketplace</Link>
        </Button>
      </div>
    </div>
  )
}
