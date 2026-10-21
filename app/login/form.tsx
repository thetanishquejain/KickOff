import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/db/supabase/server"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { SubmitButton } from "./submit-button"

function safeNext(next: FormDataEntryValue | null): string | null {
  const v = typeof next === "string" ? next : ""
  return v.startsWith("/") && !v.startsWith("//") ? v : null
}

export function LoginForm({ mode, role, next }: { mode: "login" | "signup"; role?: "founder" | "buyer"; next?: string }) {
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

  const signUp = async (formData: FormData) => {
    "use server"
    const origin = headers().get("origin")
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")
    const fullName = String(formData.get("full_name") ?? "").trim()
    const chosen = formData.get("role") === "founder" ? "founder" : "buyer"
    if (password.length < 6) return redirect(`/login?mode=signup&role=${chosen}&message=Use at least 6 characters for the password.`)
    const db = createClient()
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback`, data: { role: chosen, full_name: fullName } },
    })
    if (error) return redirect(`/login?mode=signup&role=${chosen}&message=${encodeURIComponent(error.message)}`)
    const { error: err } = await db.auth.signInWithPassword({ email, password })
    if (err) return redirect("/login?message=Account created. Check your email to confirm, then log in.")
    return redirect(safeNext(formData.get("next")) ?? (chosen === "founder" ? "/dashboard/new" : "/marketplace"))
  }

  return (
    <Tabs defaultValue={mode} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-surface">
        <TabsTrigger value="login">Log in</TabsTrigger>
        <TabsTrigger value="signup">Sign up</TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <div className="rounded-lg border border-line bg-surface p-6">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-muted">Log in to your Kickoff account.</p>
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
      </TabsContent>

      <TabsContent value="signup">
        <div className="rounded-lg border border-line bg-surface p-6">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-ink-muted">Pick how you'll use Kickoff. You can't change this later in v1.</p>
          <form className="mt-6 grid gap-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="sr-only">I am a</legend>
              {(
                [
                  ["founder", "Founder", "List and sell my startup"],
                  ["buyer", "Buyer", "Find and check startups"],
                ] as const
              ).map(([value, title, sub]) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-md border border-line p-3 transition-colors duration-150 hover:bg-surface-hover has-[:checked]:border-saffron has-[:checked]:bg-saffron/10"
                >
                  <input type="radio" name="role" value={value} defaultChecked={(role ?? "founder") === value} className="sr-only" />
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-ink-muted">{sub}</span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" autoComplete="name" placeholder="Aditi Sharma" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@company.in" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={6} required />
            </div>
            <SubmitButton formAction={signUp} pendingText="Creating account…">
              Create account
            </SubmitButton>
          </form>
        </div>
      </TabsContent>
    </Tabs>
  )
}
