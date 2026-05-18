/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617", // slate-950
        surface: "#0f172a", // slate-900
        primary: "#9333ea", // purple-600
        secondary: "#3b82f6", // blue-500
      },
    },
  },
  plugins: [],
}
