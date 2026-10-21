"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { NAV_LINKS } from "./nav-links"

type Props = { role: "founder" | "buyer" | null }

export function MobileNav({ role }: Props) {
  const [open, setOpen] = useState(false)
  const links = [
    ...NAV_LINKS,
    ...(role === "founder" ? [{ href: "/dashboard", label: "My listings" }] : []),
    ...(role ? [] : [
      { href: "/login", label: "Log in" },
      { href: "/signup?role=founder", label: "List your startup" },
    ]),
  ]
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 border-line bg-surface">
        <SheetTitle className="text-base">Menu</SheetTitle>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-base text-ink transition-colors duration-150 hover:bg-surface-hover"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
