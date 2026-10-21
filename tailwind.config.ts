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
        sans: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Kickoff tokens
        bg: "#1A3A2A",
        surface: { DEFAULT: "#20442F", hover: "#275238" },
        line: "#33604A",
        ink: { DEFAULT: "#FFFFFF", muted: "#B3CBBE" },
        saffron: { DEFAULT: "#FF8A3D", hover: "#FF9F5E" },
        verified: "#4ADE80",
        warning: "#F5B841",
        danger: "#E5484D",
        rank: { gold: "#F5B841", silver: "#C9D1E0", bronze: "#D08A5B" },

        // shadcn/ui names
        border: "#33604A",
        input: "#33604A",
        ring: "#FF8A3D",
        background: "#1A3A2A",
        foreground: "#FFFFFF",
        primary: { DEFAULT: "#FF8A3D", foreground: "#1A3A2A" },
        secondary: { DEFAULT: "#275238", foreground: "#FFFFFF" },
        destructive: { DEFAULT: "#E5484D", foreground: "#FFFFFF" },
        muted: { DEFAULT: "#275238", foreground: "#B3CBBE" },
        accent: { DEFAULT: "#275238", foreground: "#FFFFFF" },
        popover: { DEFAULT: "#20442F", foreground: "#FFFFFF" },
        card: { DEFAULT: "#20442F", foreground: "#FFFFFF" },
      },
      borderRadius: { sm: "4px", md: "8px", lg: "14px", xl: "14px" },
      boxShadow: { card: "0 1px 2px rgba(0,0,0,0.05)" },
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
