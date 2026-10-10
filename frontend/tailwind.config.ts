import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDF0F3",
        surface: "#FFFFFF",
        ink: "#16212B",
        muted: "#5B6B7A",
        line: "#D5DCE3",
        brand: { DEFAULT: "#1F4E6B", dark: "#163A50", tint: "#E3EDF3" },
        sev: { low: "#2E8B6A", medium: "#B8860B", high: "#E0692B", critical: "#C42B3A" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { panel: "10px" },
    },
  },
  plugins: [],
};
export default config;
