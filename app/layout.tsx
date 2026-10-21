import "./globals.css"
import { ReactNode } from "react"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Footer } from "@/components/footer"
import { Nav } from "@/components/nav"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Kickoff: buy and sell Indian SaaS with verified revenue", template: "%s · Kickoff" },
  description:
    "Kickoff is India's verified-revenue marketplace for buying and selling SaaS, AI products and apps. Revenue is checked from Razorpay payment data, and buyers use AI to analyse every listing.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="min-h-screen bg-bg font-sans text-ink">
        <TooltipProvider delayDuration={150}>
          <Nav />
          <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 md:px-8">{children}</main>
          <Footer />
        </TooltipProvider>
        <Toaster richColors theme="dark" />
      </body>
    </html>
  )
}
