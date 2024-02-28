/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./packages/swa/src/*.{html,css}","./packages/swa/api/views/**"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        night: {
          ...require("daisyui/src/theming/themes")["night"],
        }
      }
    ],
  },
}