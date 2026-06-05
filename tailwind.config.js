/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./js/**/*.js"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        darkBg: "#0f172a",
        cardBg: "#1e293b",
        cardHover: "#334155",
        primary: "#6366f1",
      },
    },
  },
  plugins: [],
};
