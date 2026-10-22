// Hex copies of the CSS tokens in app/globals.css, for places that can't read CSS
// variables (SVG chart attributes, the logo). Keep these in sync with globals.css.
export const THEME = {
  surface: "#FFFFFF",
  border: "#DFE5E2",
  foreground: "#101814",
  muted: "#54615A",
  primary: "#047857",
  accent: "#D97706",
  success: "#15803D",
}

/** Startup initials and featured tiles use four related tones defined in globals.css (light and dark). */
export const AVATAR_TONE_COUNT = 4

export function avatarTone(name: string | null | undefined) {
  const str = name ?? ""
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  const n = (h % AVATAR_TONE_COUNT) + 1
  return { bg: `rgb(var(--tone-${n}-bg))`, fg: `rgb(var(--tone-${n}-fg))` }
}
