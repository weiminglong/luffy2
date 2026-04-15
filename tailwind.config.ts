import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0A0B0F",
          secondary: "#0E0F16",
          card: "#12131A",
          "card-hover": "#1A1B24",
        },
        border: {
          subtle: "#1E2030",
          strong: "#2A2D42",
        },
        text: {
          primary: "#F0F0F5",
          secondary: "#8B8D9E",
          muted: "#5A5C70",
        },
        accent: {
          tempo: "#6C5CE7",
          "tempo-glow": "rgba(108,92,231,0.15)",
          positive: "#00CEC9",
          negative: "#FD7272",
          stablecoin: "#2ED573",
          warning: "#FFA801",
        },
        chain: {
          ethereum: "#627EEA",
          solana: "#9945FF",
          arbitrum: "#28A0F0",
          base: "#0052FF",
          polygon: "#8247E5",
          bnb: "#F0B90B",
          tempo: "#6C5CE7",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "gradient-hero":
          "linear-gradient(135deg, #6C5CE7 0%, #00CEC9 100%)",
        "gradient-card":
          "linear-gradient(180deg, rgba(108,92,231,0.04) 0%, rgba(0,0,0,0) 100%)",
        "dot-grid":
          "radial-gradient(circle at 1px 1px, rgba(108,92,231,0.18) 1px, transparent 0)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(108,92,231,0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(108,92,231,0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "fade-up": "fade-up 0.6s ease-out",
        "pulse-glow": "pulse-glow 2.5s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
