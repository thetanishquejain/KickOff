import "server-only"
import { createSign } from "node:crypto"

// Google Analytics 4 Data API via a service account (no OAuth screen, no SDK).

export function gaConfigured() {
  return Boolean(process.env.GA_SERVICE_ACCOUNT_EMAIL && process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY)
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")
}

let cached: { token: string; exp: number } | null = null

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
  const email = process.env.GA_SERVICE_ACCOUNT_EMAIL!
  const key = process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n")
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claim = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  )
  const signer = createSign("RSA-SHA256")
  signer.update(`${header}.${claim}`)
  const jwt = `${header}.${claim}.${b64url(signer.sign(key))}`
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Google sign-in for the service account failed. Check the GA env keys.")
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

export type GaDay = { date: string; active_users: number; sessions: number }

export async function fetchDailyTraffic(propertyId: string, days = 180): Promise<GaDay[]> {
  const token = await accessToken()
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "yesterday" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      limit: 1000,
    }),
    cache: "no-store",
  })
  if (res.status === 403 || res.status === 404) {
    throw new Error("Kickoff can't read this property yet. Check the Viewer access step and the property ID.")
  }
  if (!res.ok) throw new Error(`Google Analytics error ${res.status}`)
  const data = (await res.json()) as {
    rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]
  }
  return (data.rows ?? []).map((r) => {
    const d = r.dimensionValues[0].value // YYYYMMDD
    return {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      active_users: Number(r.metricValues[0].value),
      sessions: Number(r.metricValues[1].value),
    }
  })
}
