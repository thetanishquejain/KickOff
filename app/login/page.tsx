import { redirect } from "next/navigation"

import { getProfile } from "@/lib/auth"

import { LoginForm } from "./form"

export const metadata = { title: "Log in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string; mode?: string; role?: string; next?: string }
}) {
  const profile = await getProfile()
  if (profile) redirect(searchParams.next || (profile.role === "founder" ? "/dashboard" : "/marketplace"))

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-12 md:pt-16">
      <LoginForm
        mode={searchParams.mode === "signup" ? "signup" : "login"}
        role={searchParams.role === "buyer" ? "buyer" : searchParams.role === "founder" ? "founder" : undefined}
        next={searchParams.next}
      />
      {searchParams.message && (
        <p role="alert" className="mt-4 w-full rounded-md border border-danger/40 bg-danger/10 p-3 text-center text-sm text-ink">
          {searchParams.message}
        </p>
      )}
    </div>
  )
}
