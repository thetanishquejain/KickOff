import type { Config } from "tailwindcss"

// Tokens from DESIGN.md. shadcn/ui names are mapped onto the Kickoff palette.
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
      colors: {
        // Kickoff tokens
        bg: "#0E1626",
        surface: { DEFAULT: "#16213A", hover: "#1C2946" },
        line: "#26324D",
        ink: { DEFAULT: "#FFFFFF", muted: "#A3AEC6" },
        saffron: { DEFAULT: "#FF8A3D", hover: "#FF9F5E" },
        verified: "#2BB673",
        warning: "#F5B841",
        danger: "#E5484D",
        rank: { gold: "#F5B841", silver: "#C9D1E0", bronze: "#D08A5B" },

        // shadcn/ui names
        border: "#26324D",
        input: "#26324D",
        ring: "#FF8A3D",
        background: "#0E1626",
        foreground: "#FFFFFF",
        primary: { DEFAULT: "#FF8A3D", foreground: "#0E1626" },
        secondary: { DEFAULT: "#1C2946", foreground: "#FFFFFF" },
        destructive: { DEFAULT: "#E5484D", foreground: "#FFFFFF" },
        muted: { DEFAULT: "#1C2946", foreground: "#A3AEC6" },
        accent: { DEFAULT: "#1C2946", foreground: "#FFFFFF" },
        popover: { DEFAULT: "#16213A", foreground: "#FFFFFF" },
        card: { DEFAULT: "#16213A", foreground: "#FFFFFF" },
      },
      borderRadius: { sm: "4px", md: "8px", lg: "14px", xl: "14px" },
      boxShadow: { card: "0 1px 2px rgba(0,0,0,0.25)" },
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
