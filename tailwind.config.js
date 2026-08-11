/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF6891",
          light: "#FFE8EF",
          dark: "#E5527A",
        },
        secondary: {
          DEFAULT: "#6BCCFF",
          light: "#EAF7FF",
        },
        gray: {
          800: "#2B2B2B",
          600: "#757575",
          300: "#E0E0E0",
        },
        paper: "#FAFAFA",
      },
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(43, 43, 43, 0.06)",
        sheet: "0 -4px 24px rgba(43, 43, 43, 0.12)",
      },
      keyframes: {
        "route-dash": {
          to: { strokeDashoffset: "-24" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "route-dash": "route-dash 1.2s linear infinite",
        "sheet-up": "sheet-up 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
