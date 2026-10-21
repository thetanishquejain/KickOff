// Hex copies of the CSS tokens in app/globals.css, for places that can't read CSS
// variables (SVG chart attributes, the logo). Keep these in sync with globals.css.
export const THEME = {
  surface: "#FFFFFF",
  border: "#E2DDD3",
  foreground: "#161C19",
  muted: "#58625C",
  primary: "#0F6B54",
  accent: "#D66920",
  success: "#15803D",
}

/** Muted tints for startup initials, so a list of listings is easy to scan. Text colours pass 4.5:1 on their background. */
export const AVATAR_TONES: { bg: string; fg: string }[] = [
  { bg: "#E3F0EA", fg: "#0B5340" }, // brand green
  { bg: "#FBE9DC", fg: "#8A3E0C" }, // marigold
  { bg: "#E4ECF7", fg: "#1E4A85" }, // blue
  { bg: "#EFE6F5", fg: "#5B2E7A" }, // plum
  { bg: "#F6E4E4", fg: "#8A2A2A" }, // brick
  { bg: "#E6F1F3", fg: "#1D5A66" }, // teal
  { bg: "#F3EFDC", fg: "#6B5410" }, // ochre
]

export function avatarTone(name: string | null | undefined) {
  const s = name ?? ""
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}
