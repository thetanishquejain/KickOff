import { redirect } from "next/navigation"

import { getProfile } from "@/lib/auth"
import { AuthShell } from "@/components/auth-shell"

import { SignupForm } from "./form"

export const metadata = { title: "Sign up" }

export default async function SignupPage({ searchParams }: { searchParams: { message?: string; role?: string; next?: string } }) {
  const profile = await getProfile()
  if (profile) redirect(profile.role === "founder" ? "/dashboard" : "/marketplace")
  return (
    <AuthShell message={searchParams.message}>
      <SignupForm initialRole={searchParams.role === "buyer" ? "buyer" : "founder"} next={searchParams.next} />
    </AuthShell>
  )
}
