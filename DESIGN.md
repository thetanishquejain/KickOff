# Kickoff design system

Kickoff is a verified-revenue marketplace for Indian SaaS, AI products and apps. The design has one job: make verified numbers easy to trust and easy to compare.

## Principles
- **Trust signals first.** Verified numbers, badges and sources come before marketing copy.
- **One primary action per screen.** Never two saffron buttons in the same view.
- **Numbers are the hero.** Every metric uses the mono font, INR formatting and a clear label.
- **Fast over fancy.** No heavy animation, no large images above the fold.

## Colors (dark theme)
Use the token names in code, never raw hex values.

| Token | Value | Use |
|---|---|---|
| `bg` | `#0E1626` | Page background |
| `surface` | `#16213A` | Cards, tables, inputs |
| `surface-hover` | `#1C2946` | Hovered cards and rows |
| `border` | `#26324D` | Card borders, dividers |
| `text` | `#FFFFFF` | Main text |
| `text-muted` | `#A3AEC6` | Labels, secondary text |
| `accent` | `#FF8A3D` | Primary buttons, active tab, links on hover (saffron) |
| `accent-hover` | `#FF9F5E` | Primary button hover |
| `verified` | `#2BB673` | Verified badge, positive growth |
| `warning` | `#F5B841` | Risk flags |
| `danger` | `#E5484D` | Errors and destructive actions only |

Contrast: `text` and `text-muted` on `bg` and `surface` pass WCAG AA. Text on `accent` buttons is `bg` (dark), not white.

## Typography
- **Sans (all UI text):** Inter, system-ui, sans-serif
- **Mono (all numbers: MRR, prices, %, tables):** JetBrains Mono, ui-monospace

| Token | Size / line height | Use |
|---|---|---|
| `text-xs` | 12 / 16 | Captions, metadata |
| `text-sm` | 14 / 20 | Labels, table text |
| `text-base` | 16 / 24 | Body text |
| `text-lg` | 18 / 28 | Card titles |
| `text-xl` | 20 / 28 | Section headings |
| `text-2xl` | 24 / 32 | Page headings |
| `text-3xl` | 32 / 40 | Big metric numbers |
| `text-4xl` | 48 / 56 | Home page hero only |

Weights: 400 body, 500 labels, 600 headings, 700 hero and big numbers.
Sentence case everywhere. ALL CAPS only for acronyms (MRR, ARR, KYC).

## Spacing
Base unit 4px. Use only: `1`=4px, `2`=8px, `3`=12px, `4`=16px, `6`=24px, `8`=32px, `12`=48px, `16`=64px, `24`=96px.
Card padding 24px. Gap between cards 16px. Section spacing 64px (48px on mobile).

## Shapes and elevation
- Radius: `sm` 4px (badges), `md` 8px (buttons, inputs), `lg` 14px (cards), `full` 9999px (pills, avatars). Don't use any other values.
- Shadow: one level only, `0 1px 2px rgba(0,0,0,0.25)`, on cards. Hover shows `surface-hover` and the `border` colour lightened, not a bigger shadow.

## Motion
- `fast`: 150ms `cubic-bezier(0.4, 0, 0.2, 1)` for colour, border and background changes
- `base`: 250ms `ease-in-out` for opacity (modals, toasts, chat messages)
- Respect `prefers-reduced-motion`: turn off all transitions.

## Number formatting
- INR with Indian grouping: ₹1,25,000. Short form in cards: ₹1.25L, ₹2.4Cr.
- Growth shown with sign and colour: `+12.4%` in `verified`, `-3.1%` in `danger`.
- Every verified number has a small "Verified from Razorpay data" note or badge nearby.

## Components

**Button**
- Primary: `accent` background, `bg` text, radius `md`, 40px tall, 16px side padding. Hover `accent-hover`.
- Secondary: transparent, `border` outline, `text` colour. Hover `surface-hover`.
- Destructive: `danger` outline, used only for delete.
- States: hover, focus-visible (2px `accent` ring with 2px offset), active (slightly darker), disabled (40% opacity, no pointer), loading (spinner and the label kept).

**Verified badge**
- Pill (`full`), `verified` text on a 15% `verified` background, check icon followed by "Verified MRR". `text-xs`, weight 500.

**Listing card**
- `surface` background, `border`, radius `lg`, 24px padding.
- Layout: logo or initial avatar with the name and category → large MRR (mono `text-3xl`) and the verified badge → row of 3 small stats (growth, asking price, multiple) → flag count if any (`warning`).
- Whole card is one link; hover changes it to `surface-hover`.
- If the name is long, cut it to one line with an ellipsis.

**Metric tile**
- Label (`text-sm`, `text-muted`), value (mono `text-2xl` or `text-3xl`), and an optional change line.

**Risk flag card**
- 4px left border in `warning`, `surface` background.
- Title (what code found), AI explanation (plain English), and "Ask the founder:" question in `text-muted`.
- Small "AI explanation" tag so users know which text is AI-written.

**Leaderboard**
- Header row: "Leaderboard" (`text-2xl`, weight 600) on the left. Two dropdowns on the right: sort (MRR, Revenue, Growth, Traffic, Revenue per visitor) and time range (Last 30 days, Last 6 months, All time).
- Dropdown: `surface` background, `border`, radius `md`, 40px tall. Open menu on `surface` with radius `lg`; selected item on `surface-hover` with an `accent` check icon. Works with the keyboard (arrow keys, Enter, Escape).
- Columns: rank, startup, founder, the sorted metric, MoM growth. On desktop, the asking price and multiple go after the metric.
- Rank: positions 1–3 get a round badge with the number, gold `#F5B841`, silver `#C9D1E0` and bronze `#D08A5B` (these three colours are only for rank badges). From 4 onwards it's just the number in `text-muted`.
- Startup cell: 40px logo with radius `md` (or the first letter on `surface-hover`), name in `text` weight 500, and the pitch on one line in `text-muted` `text-sm` with an ellipsis.
- Founder cell: 28px round avatar (or initial) and the name.
- Metric: mono, weight 700, right-aligned, e.g. ₹4.24L. If the listing has a risk flag, a small `warning` triangle icon sits after the number. Its tooltip shows the flag title.
- MoM growth: `verified` ↑ for positive and `danger` ↓ for negative, mono. Show "–" in `text-muted` when there's no previous month.
- Rows 72px tall, `border` dividers, hover `surface-hover`, and the whole row links to the listing.
- Mobile: rank, startup and metric only; the founder and growth go under the name.
- Empty: "No verified startups for this period yet."

**Inputs**
- `surface` background, `border`, radius `md`, 40px tall. Focus: `accent` border and ring. Error: `danger` border and a message below.

**AI buyer summary**
- Three blocks with headings "What is proven", "What is missing" and "Ask next". Each is a short list.
- Footer line: "Written by AI. Every number checked against verified data."

**Ask about this startup (chat)**
- Panel on the listing page. User messages right-aligned on `surface-hover`, AI answers left-aligned on `surface`.
- Placeholder: "Ask about revenue, customers or risks…". Shows three suggested questions when empty.
- When the data can't answer the question, the AI says so plainly.

**Empty states**
- No listings: "No verified startups here yet." with one button.
- No flags: a `verified` check with "No risk flags found in the payment data."

## Layout
- Max content width 1200px, centred, 16px side gutter on mobile and 32px on desktop.
- Breakpoints: mobile under 640px, tablet 640–1024px, desktop above 1024px. Check every page at 375px and 1440px.
- Top nav: Kickoff logo (left); Marketplace and Leaderboard; Log in and one primary button "List your startup" (right).

## Writing tone
Clear, honest and confident. Short sentences in the active voice. No hype words ("revolutionary", "game-changing"). Say what is verified and what isn't.

## Tailwind setup
```js
// tailwind.config.ts → theme.extend
colors: {
  bg: '#0E1626', surface: '#16213A', 'surface-hover': '#1C2946', border: '#26324D',
  text: '#FFFFFF', 'text-muted': '#A3AEC6', accent: '#FF8A3D', 'accent-hover': '#FF9F5E',
  verified: '#2BB673', warning: '#F5B841', danger: '#E5484D',
},
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
},
borderRadius: { sm: '4px', md: '8px', lg: '14px', full: '9999px' },
```
Load Inter and JetBrains Mono with `next/font/google`.

## Definition of done (every component)
- Uses tokens only, with no raw hex or px values in components
- Hover, focus-visible, active, disabled, loading, error and empty states all work
- Works with the keyboard alone (Tab, Enter, Escape)
- Looks right at 375px and 1440px
- Text passes AA contrast
