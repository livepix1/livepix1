import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "pixflow-dark": "#0A0E27",
        "pixflow-darker": "#050810",
        "pixflow-cyan": "#00D9FF",
        "pixflow-magenta": "#FF006E",
        "pixflow-slate": "#F0F4F8",
        // semantic aliases
        background: "#0A0E27",
        foreground: "#F0F4F8",
      },
      fontFamily: {
        sora: ["var(--font-sora)", "system-ui", "sans-serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "neon-gradient":
          "linear-gradient(120deg, rgba(0,217,255,0.18) 0%, rgba(255,0,110,0.12) 50%, rgba(10,14,39,0) 100%)",
        "neon-line":
          "linear-gradient(90deg, transparent, #00D9FF, #FF006E, transparent)",
      },
      boxShadow: {
        "neon-cyan": "0 0 0 1px rgba(0,217,255,0.15), 0 8px 30px rgba(0,217,255,0.10)",
        "neon-magenta": "0 0 0 1px rgba(255,0,110,0.15), 0 8px 30px rgba(255,0,110,0.10)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
