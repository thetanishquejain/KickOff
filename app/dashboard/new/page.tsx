import { redirect } from "next/navigation"

import { getProfile } from "@/lib/auth"
import { CATEGORIES } from "@/lib/data"

import { NewListingForm } from "./form"

export const metadata = { title: "List your startup" }

export default async function NewListingPage() {
  const profile = await getProfile()
  if (!profile) redirect("/signup?role=founder&next=/dashboard/new")
  if (profile.role !== "founder") redirect("/marketplace")
  return (
    <div className="mx-auto max-w-xl pt-10">
      <h1 className="text-2xl font-semibold">List your startup</h1>
      <p className="mt-1 text-sm text-ink-muted">Start with the basics. Next, you'll upload your Razorpay payments to verify revenue.</p>
      <NewListingForm categories={CATEGORIES} />
    </div>
  )
}
