// tailwind.config.js
const withOpacity = (variable) => ({ opacityValue }) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}))`;
  }
  return `rgb(var(${variable}) / ${opacityValue})`;
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          25: withOpacity("--color-brand-25"),
          50: withOpacity("--color-brand-50"),
          100: withOpacity("--color-brand-100"),
          200: withOpacity("--color-brand-200"),
          400: withOpacity("--color-brand-400"),
          500: withOpacity("--color-brand-500"),
          600: withOpacity("--color-brand-600"),
          700: withOpacity("--color-brand-700"),
          900: withOpacity("--color-brand-900"),
        },
        surface: {
          DEFAULT: withOpacity("--color-surface"),
          subdued: withOpacity("--color-surface-subdued"),
        },
        border: {
          DEFAULT: withOpacity("--color-border"),
        },
        content: {
          DEFAULT: withOpacity("--color-content"),   // inverted in dark
          muted: withOpacity("--color-content-muted"),
          subtle: withOpacity("--color-content-subtle"),
          inverted: withOpacity("--color-content-inverted"),
        },
        accent: {
          success: "#22c55e",
          warning: "#eab308",
          danger: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
