import { PageHeader, Prose } from "@/components/page-header"

export const metadata = { title: "Terms" }

export default function TermsPage() {
  return (
    <>
      <PageHeader title="Terms">Draft for the hackathon version of Kickoff. This is not legal advice and will be reviewed before launch.</PageHeader>
      <Prose>
        <h2>What "verified" means</h2>
        <p>
          Kickoff calculates metrics from the Razorpay payment export a founder uploads. It does not audit accounts, confirm that the export is complete, or verify the founder's identity or ownership of the business.
        </p>
        <h2>AI-written text</h2>
        <p>Summaries, flag explanations and chat answers are written by AI from the calculated metrics. They can be wrong and are not financial, legal or tax advice.</p>
        <h2>Founder responsibilities</h2>
        <p>Founders must only upload payment data for businesses they own or are authorised to sell, and must keep listing details accurate.</p>
        <h2>Buyer responsibilities</h2>
        <p>Buyers should do their own due diligence, including legal, tax and technical checks, before making any offer.</p>
        <h2>Demo listings</h2>
        <p>Listings tagged "Demo data" use sample data for demonstration and are not real businesses for sale.</p>
      </Prose>
    </>
  )
}
