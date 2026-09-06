import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#F7FAFC",
          secondary: "#EFF6FB",
        },
        brand: {
          primary: "#2E9CCA",
          dark: "#1A6FA8",
        },
        accent: "#5FD6C4",
        risk: {
          low: "#2FAE6B",
          medium: "#F0A93B",
          high: "#E0563C",
        },
        ink: {
          heading: "#16242E",
          body: "#5A6B78",
        },
        card: {
          bg: "#FFFFFF",
          border: "#E3ECF1",
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(20, 60, 90, 0.06)',
        'hover': '0 8px 30px rgba(20, 60, 90, 0.1)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2E9CCA, #1A6FA8)',
      },
      borderRadius: {
        'xl': '18px',
      }
    },
  },
  plugins: [],
};

export default config;
