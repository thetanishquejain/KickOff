// KYC validation (test mode). Format and checksum-free structural checks only; no external lookup.

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
// GSTIN: 2-digit state code, the business PAN, entity number, 'Z', check character.
export const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

// 4th PAN character = holder type. P individual, C company, F firm/LLP, H HUF, A AOP, T trust, B BOI, L local authority, J artificial juridical person, G government.
const PAN_HOLDER_TYPES = new Set(["P", "C", "F", "H", "A", "T", "B", "L", "J", "G"])

export type KycInput = { role: "founder" | "buyer"; legalName: string; pan: string; gstin?: string; consent: boolean }

export function validateKyc(i: KycInput): { ok: true; pan: string; gstin: string | null; name: string } | { ok: false; error: string } {
  const name = i.legalName.trim().replace(/\s+/g, " ")
  if (name.length < 3 || name.length > 100) return { ok: false, error: "Enter your full legal name as on your PAN card." }
  if (!/^[A-Za-z .'-]+$/.test(name)) return { ok: false, error: "Use letters only for the name, as printed on the PAN card." }
  const pan = i.pan.trim().toUpperCase()
  if (!PAN_RE.test(pan)) return { ok: false, error: "PAN should look like ABCDE1234F: 5 letters, 4 digits, 1 letter." }
  if (!PAN_HOLDER_TYPES.has(pan[3])) return { ok: false, error: "The 4th character of a PAN shows the holder type (P for a person, C for a company). This one isn't valid." }
  if (i.role === "buyer" && pan[3] !== "P" && pan[3] !== "C" && pan[3] !== "F") return { ok: false, error: "Buyers verify with a personal (P), company (C) or firm (F) PAN." }
  let gstin: string | null = null
  if (i.gstin && i.gstin.trim()) {
    gstin = i.gstin.trim().toUpperCase()
    if (!GSTIN_RE.test(gstin)) return { ok: false, error: "GSTIN should be 15 characters, like 27ABCDE1234F1Z5." }
  }
  if (!i.consent) return { ok: false, error: "Tick the box to confirm the details are yours." }
  return { ok: true, pan, gstin, name }
}
