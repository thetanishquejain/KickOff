import { redirect } from "next/navigation"

import { getProfile } from "@/lib/auth"
import { AuthShell } from "@/components/auth-shell"

import { LoginForm } from "./form"

export const metadata = { title: "Log in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string; mode?: string; role?: string; next?: string }
}) {
  const profile = await getProfile()
  if (profile) redirect(searchParams.next || (profile.role === "founder" ? "/dashboard" : "/marketplace"))

  if (searchParams.mode === "signup") redirect(`/signup${searchParams.role ? `?role=${searchParams.role}` : ""}`)

  return (
    <AuthShell message={searchParams.message}>
      <LoginForm
        role={searchParams.role === "buyer" ? "buyer" : searchParams.role === "founder" ? "founder" : undefined}
        next={searchParams.next}
      />
    </AuthShell>
  )
}
