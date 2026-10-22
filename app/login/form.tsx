import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/db/supabase/server"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { SubmitButton } from "./submit-button"

function safeNext(next: FormDataEntryValue | null): string | null {
  const v = typeof next === "string" ? next : ""
  return v.startsWith("/") && !v.startsWith("//") ? v : null
}

export function LoginForm({ role, next }: { role?: "founder" | "buyer"; next?: string }) {
  const signIn = async (formData: FormData) => {
    "use server"
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")
    const db = createClient()
    const { data, error } = await db.auth.signInWithPassword({ email, password })
    if (error || !data.user) return redirect("/login?message=Wrong email or password.")
    const { data: p } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
    return redirect(safeNext(formData.get("next")) ?? (p?.role === "founder" ? "/dashboard" : "/marketplace"))
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-muted">
        New to Kickoff?{" "}
        <Link href={`/signup${role ? `?role=${role}` : ""}`} className="font-medium text-ink underline-offset-4 hover:text-brand hover:underline">
          Create an account
        </Link>
      </p>
      <form className="mt-6 grid gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" name="email" type="email" autoComplete="email" placeholder="you@company.in" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="login-password">Password</Label>
          <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton formAction={signIn} pendingText="Logging in…">
          Log in
        </SubmitButton>
      </form>
    </div>
  )
}
