/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E6B7C7",
          light: "#F8EDF1",
          dark: "#BE879B",
        },
        secondary: {
          DEFAULT: "#6D9EEB",
          light: "#EAF1FE",
        },
        gray: {
          800: "#222222",
          600: "#6B6B73",
          300: "#E2E2E7",
        },
        paper: "#F5F5F7",
      },
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 8px 24px rgba(34, 34, 34, 0.06)",
        sheet: "0 -8px 28px rgba(34, 34, 34, 0.10)",
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
