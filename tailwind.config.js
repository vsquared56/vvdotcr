/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');
module.exports = {
  content: ["./packages/swa/src/*.{html,css,js}","./packages/swa/api/views/**"],
  theme: {
    extend: {},
    colors: {
      'transparent-black': {
        100: '#00000010',
        200: '#00000030',
        300: '#00000050',
        400: '#00000070',
        500: '#00000080',
        600: '#000000a0',
        700: '#000000c0',
        800: '#000000e0',
        900: '#000000ff',
      },
      yellow: colors.yellow,
      blue: colors.blue,
      neutral: colors.neutral
    }
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
            "primary": "#38bdf8",
            "secondary": "#818CF8",
            "accent": "#F471B5"
        }
      }
    ],
  },
}