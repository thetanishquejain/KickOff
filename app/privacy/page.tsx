import { PageHeader, Prose } from "@/components/page-header"

export const metadata = { title: "Privacy" }

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy">Draft for the hackathon version of Kickoff. This is not legal advice and will be reviewed before launch.</PageHeader>
      <Prose>
        <h2>What we collect</h2>
        <p>Your name, email and role (founder or buyer) when you sign up. For founders, the listing details you enter and the Razorpay payments CSV you upload.</p>
        <h2>Customer data in payment files</h2>
        <p>Customer emails, phone numbers and IDs in an uploaded CSV are turned into a one-way code before they are stored. We keep payment amounts, dates, statuses and descriptions so we can calculate metrics.</p>
        <h2>Who can see what</h2>
        <p>Raw payment rows are visible only to the founder who uploaded them. Buyers see calculated metrics, risk flags and AI-written summaries for published listings.</p>
        <h2>AI processing</h2>
        <p>Payment descriptions, calculated metrics and listing text are sent to Anthropic's Claude API to label payments and write explanations. Buyer questions are sent with that listing's verified data only.</p>
        <h2>Deleting your data</h2>
        <p>Founders can delete a listing and its payment data from the dashboard at any time.</p>
      </Prose>
    </>
  )
}
