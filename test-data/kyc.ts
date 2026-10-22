// KYC (test mode) validation tests. Run: pnpm test:kyc
import { validateKyc } from "../lib/kyc"

let failed = 0
const t = (name: string, ok: boolean) => {
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`)
}
const base = { role: "founder" as const, legalName: "Riya Menon", pan: "ABCPM1234K", consent: true }
t("valid founder PAN passes and is upper-cased", (() => { const r = validateKyc({ ...base, pan: "abcpm1234k" }); return r.ok && r.pan === "ABCPM1234K" })())
t("bad PAN shape rejected", !validateKyc({ ...base, pan: "ABCD12345K" }).ok)
t("invalid holder type (4th char) rejected", !validateKyc({ ...base, pan: "ABCXM1234K" }).ok)
t("buyer with trust PAN rejected", !validateKyc({ ...base, role: "buyer", pan: "ABCTM1234K" }).ok)
t("buyer with personal PAN passes", validateKyc({ ...base, role: "buyer" }).ok)
t("valid GSTIN passes", validateKyc({ ...base, gstin: "27ABCPM1234K1Z5" }).ok)
t("bad GSTIN rejected", !validateKyc({ ...base, gstin: "27ABCPM1234K1X5" }).ok)
t("missing consent rejected", !validateKyc({ ...base, consent: false }).ok)
t("name with digits rejected", !validateKyc({ ...base, legalName: "Riya 123" }).ok)
console.log(failed ? `${failed} failed` : "all KYC checks passed")
if (failed) process.exit(1)
