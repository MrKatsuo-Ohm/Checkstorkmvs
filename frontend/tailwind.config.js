/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        thai: ['Noto Sans Thai', 'sans-serif']
      }
    }
  },
  plugins: []
}
