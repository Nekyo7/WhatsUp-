import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08090D",
        card: "#0F111A",
        cardHover: "#151824",
        border: "#1E2235",
        borderHighlight: "#2D3452",
        muted: "#8890A6",
        crimson: {
          DEFAULT: "#FF334B",
          glow: "rgba(255, 51, 75, 0.25)",
          dark: "#8F1022",
        },
        amber: {
          DEFAULT: "#FF9F0A",
          glow: "rgba(255, 159, 10, 0.25)",
          dark: "#8A5300",
        },
        emerald: {
          DEFAULT: "#30D158",
          glow: "rgba(48, 209, 88, 0.25)",
          dark: "#0F5E24",
        },
        cyan: {
          DEFAULT: "#64D2FF",
          glow: "rgba(100, 210, 255, 0.25)",
          dark: "#0A5C80",
        },
        parchment: {
          DEFAULT: "#F5EEDB",
          light: "#FAF5EA",
          dark: "#E3D4B6",
          border: "#3F3022",
        },
        moss: {
          DEFAULT: "#5E7E52",
          light: "#789B6A",
          dark: "#3B5234",
        },
        twilight: {
          DEFAULT: "#2B213A",
          light: "#7A6B8A",
          dark: "#171222",
        },
        umber: {
          DEFAULT: "#2B2017",
          light: "#5C4635",
          dark: "#1A130C",
        },
        coral: {
          DEFAULT: "#D66E5B",
          light: "#E89180",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "Courier New", "monospace"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["var(--font-display)", "Outfit", "Space Grotesk", "sans-serif"],
        fantasy: ["Cinzel", "Georgia", "serif"],
        storybook: ["Crimson Pro", "Georgia", "serif"],
      },
      boxShadow: {
        stamp: "0 0 0 1px #FF334B, 0 4px 12px rgba(255, 51, 75, 0.15)",
        stampAmber: "0 0 0 1px #FF9F0A, 0 4px 12px rgba(255, 159, 10, 0.15)",
        glow: "0 0 25px -5px rgba(255, 51, 75, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
