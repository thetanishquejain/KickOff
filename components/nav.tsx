import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/db/supabase/server"

import { getProfile } from "@/lib/auth"
import { initials } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Logo } from "./logo"
import { MobileNav } from "./mobile-nav"
import { NavLinks } from "./nav-links"
import { NavSearch } from "./nav-search"
import { ThemeToggle } from "./theme-toggle"

async function signOut() {
  "use server"
  const db = createClient()
  await db.auth.signOut()
  redirect("/")
}

export async function Nav() {
  const profile = await getProfile()
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 sm:gap-4 md:px-8">
        <Logo />
        <NavLinks />
        <NavSearch className="ml-auto hidden w-56 md:block xl:w-64" />
        <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
          <ThemeToggle />
          {profile ? (
            <>
              {profile.role === "founder" && (
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-ink"
                  aria-label="Account menu"
                >
                  {initials(profile.full_name || profile.email)}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-line bg-surface shadow-pop">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-sm text-ink">{profile.full_name || profile.email}</div>
                    <div className="text-xs capitalize text-ink-muted">{profile.role}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-line" />
                  {profile.role === "founder" ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/new">New listing</Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/marketplace">Browse startups</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-line" />
                  <form action={signOut}>
                    <button type="submit" className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink-muted hover:bg-surface-hover hover:text-ink">
                      Log out
                    </button>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/signup?role=founder">List your startup</Link>
              </Button>
            </>
          )}
          <MobileNav role={profile?.role ?? null} />
        </div>
      </div>
    </header>
  )
}
