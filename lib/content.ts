// Shared copy for the home page, /how-it-works and /faq.

export const FOUNDER_STEPS: [string, string][] = [
  ["Create a listing", "Name, category, a one-line pitch and an asking price in rupees. Save it as a draft."],
  ["Upload your Razorpay payments", "Export the payments CSV from Razorpay and drop it in. Kickoff reads every row and tells you what it skipped and why."],
  ["Check the labels", "AI sorts each payment into recurring, one-time, refund or unclear. Correct anything that's wrong and the numbers recalculate."],
  ["Review your metrics", "Code works out MRR, growth, refunds and customer concentration, and raises risk flags with plain-English explanations."],
  ["Write and publish", "Let AI draft your description from the verified numbers, edit it, preview the page and publish."],
]

export const BUYER_STEPS: [string, string][] = [
  ["Browse without signing up", "Search and filter startups by category, MRR, asking price and risk flags."],
  ["Open a profile", "See MRR, revenue history, growth, refunds, customer concentration and the asking multiple."],
  ["Read the buyer summary", "Sign up free as a buyer to read what the payment data proves, what it doesn't, and what to ask next."],
  ["Ask about the startup", "Question the listing's data in chat. Answers use only that listing's verified numbers."],
  ["Take it to the founder", "Use the suggested questions in your own due diligence before you make an offer."],
]

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What does "verified" mean on Kickoff?',
    a: "The numbers were calculated by Kickoff's code from the Razorpay payments export the founder uploaded, not typed in or shown as a screenshot. It isn't an audit. Kickoff doesn't yet confirm that the export is complete, or that the founder owns the business.",
  },
  {
    q: "How is MRR calculated?",
    a: "MRR is the recurring revenue in the latest full month of data. Monthly plans count in the month they're paid. Yearly plans are spread over 12 months. One-time payments and refunds are left out.",
  },
  {
    q: "How is the asking multiple worked out?",
    a: "Asking price divided by annual recurring revenue (MRR × 12). If a founder hasn't set a price, or MRR is zero, no multiple is shown.",
  },
  {
    q: "Where does AI come in?",
    a: "AI labels messy payment descriptions, explains risk flags, drafts listing descriptions, writes the buyer summary and answers buyer questions. It never calculates numbers, and any AI text whose numbers don't match the calculated metrics is blocked.",
  },
  {
    q: "What are risk flags?",
    a: "Automatic checks for patterns buyers care about: one customer bringing in more than 30% of revenue, a month more than twice the previous 3-month average, refunds above 10% of revenue, and a large share of payments that couldn't be classified.",
  },
  {
    q: "What happens to customer data in the CSV?",
    a: "Customer emails, phone numbers and IDs are turned into one-way codes before storage. Raw payment rows are visible only to the founder who uploaded them. Buyers see calculated metrics only.",
  },
  {
    q: "Do I need an account to browse?",
    a: "No. Anyone can browse the marketplace, leaderboard and startup profiles. A free buyer account unlocks the AI buyer summary and the listing chat. Founders need an account to list.",
  },
  {
    q: "Which payment gateways are supported?",
    a: "Razorpay CSV exports today. Cashfree, PayU and live gateway connections are planned for a later version.",
  },
  {
    q: "What are demo listings?",
    a: 'Listings tagged "Demo data" use sample payment data so you can see how Kickoff works. They aren\'t real businesses for sale.',
  },
]
