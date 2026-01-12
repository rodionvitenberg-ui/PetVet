/** @type {import('tailwindcss').Config} */
module.exports = {
  // Мы говорим: "Ищи классы в корневом App.tsx И в папке app, И в папке components"
  content: [
    "./App.{js,jsx,ts,tsx}", 
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}