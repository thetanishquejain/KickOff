import type { Config } from "tailwindcss"

// Every colour comes from the CSS variables in app/globals.css.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config = {
  darkMode: ["class"],
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Type scale: caption, label, table, body, section, page, display
        caption: ["12px", { lineHeight: "16px" }],
        label: ["13px", { lineHeight: "18px" }],
        table: ["14px", { lineHeight: "20px" }],
      },
      colors: {
        // Kickoff tokens
        bg: v("background"),
        surface: { DEFAULT: v("surface"), hover: v("surface-muted"), muted: v("surface-muted") },
        line: v("border"),
        ink: { DEFAULT: v("foreground"), muted: v("muted-foreground") },
        brand: { DEFAULT: v("primary"), hover: v("primary-hover"), foreground: v("primary-foreground") },
        marigold: v("accent"),
        verified: v("success"),
        warning: v("warning"),
        danger: v("danger"),
        rank: { gold: v("rank-gold"), silver: v("rank-silver"), bronze: v("rank-bronze") },

        // shadcn/ui names
        border: v("border"),
        input: v("border"),
        ring: v("focus-ring"),
        background: v("background"),
        foreground: v("foreground"),
        primary: { DEFAULT: v("primary"), foreground: v("primary-foreground") },
        secondary: { DEFAULT: v("surface-muted"), foreground: v("foreground") },
        destructive: { DEFAULT: v("danger"), foreground: v("primary-foreground") },
        muted: { DEFAULT: v("surface-muted"), foreground: v("muted-foreground") },
        accent: { DEFAULT: v("surface-muted"), foreground: v("foreground") },
        popover: { DEFAULT: v("surface"), foreground: v("foreground") },
        card: { DEFAULT: v("surface"), foreground: v("foreground") },
      },
      borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)", xl: "var(--radius-lg)" },
      boxShadow: { card: "0 1px 2px rgba(22, 28, 25, 0.05)", pop: "0 8px 24px rgba(22, 28, 25, 0.08)" },
      transitionTimingFunction: { kick: "cubic-bezier(0.4, 0, 0.2, 1)" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
