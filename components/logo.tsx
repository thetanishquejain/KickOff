import Link from "next/link"

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#FF8A3D" />
      <path d="M10 8v16M10 16l8-8M13.5 12.5L21 24" stroke="#0E1626" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="23" cy="9" r="2.2" fill="#0E1626" />
    </svg>
  )
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md font-semibold tracking-tight text-ink" aria-label="Kickoff home">
      <LogoMark />
      <span className="hidden text-lg min-[420px]:inline">Kickoff</span>
    </Link>
  )
}
