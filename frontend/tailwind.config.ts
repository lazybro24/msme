import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0A0A0A",
          900: "#111111",
          800: "#1C1C1C",
          700: "#2A2A2A",
          600: "#3D3D3D",
        },
        brand: {
          blue: "#0085C7",
          "blue-dark": "#006BA1",
          red: "#E31C23",
          "red-dark": "#C4161C",
          gold: "#E8A914",
          "gold-dark": "#C4890C",
          "gold-light": "#F5D56A",
        },
        slate: {
          50: "#F7F8FA",
          100: "#EEF1F5",
          200: "#DCE2EA",
          300: "#B8C2CF",
          500: "#6B7785",
          700: "#3A4550",
          900: "#1A222B",
        },
        navy: {
          950: "#0A0A0A",
          900: "#111111",
          800: "#1C1C1C",
          700: "#2A2A2A",
          600: "#3D3D3D",
        },
        gold: {
          500: "#E8A914",
          400: "#F0B31C",
          300: "#F5D56A",
          100: "#FFF6D6",
        },
        cream: {
          50: "#FFFFFF",
          100: "#F7F8FA",
          200: "#EEF1F5",
        },
        teak: {
          600: "#0085C7",
          500: "#0098E0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px -10px rgba(0, 0, 0, 0.18)",
        card: "0 2px 12px rgba(0, 0, 0, 0.08)",
      },
      backgroundImage: {
        "hero-awards":
          "linear-gradient(120deg, rgba(10,10,10,0.72) 0%, rgba(0,85,150,0.45) 55%, rgba(10,10,10,0.55) 100%), radial-gradient(circle at 70% 40%, rgba(0,133,199,0.35), transparent 50%)",
        "banner-blue":
          "linear-gradient(90deg, rgba(0,133,199,0.95) 0%, rgba(0,107,161,0.88) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
