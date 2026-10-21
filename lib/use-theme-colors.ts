"use client"

import { useEffect, useState } from "react"

import { THEME } from "./theme"

type Colors = { border: string; muted: string; foreground: string; surface: string; primary: string; success: string }

const FALLBACK: Colors = { border: THEME.border, muted: THEME.muted, foreground: THEME.foreground, surface: THEME.surface, primary: THEME.primary, success: THEME.success }

function read(): Colors {
  const s = getComputedStyle(document.documentElement)
  const v = (name: string, fb: string) => {
    const raw = s.getPropertyValue(name).trim()
    return raw ? `rgb(${raw.split(/\s+/).join(",")})` : fb
  }
  return {
    border: v("--border", FALLBACK.border),
    muted: v("--muted-foreground", FALLBACK.muted),
    foreground: v("--foreground", FALLBACK.foreground),
    surface: v("--surface", FALLBACK.surface),
    primary: v("--primary", FALLBACK.primary),
    success: v("--success", FALLBACK.success),
  }
}

/** Resolved token colours for SVG charts (SVG attributes can't use CSS variables). Updates when the theme changes. */
export function useThemeColors(): Colors {
  const [c, setC] = useState<Colors>(FALLBACK)
  useEffect(() => {
    setC(read())
    const obs = new MutationObserver(() => setC(read()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })
    return () => obs.disconnect()
  }, [])
  return c
}
