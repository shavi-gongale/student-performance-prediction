/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'sans-serif'] },
      colors: { ink: '#111827', muted: '#64748B', accent: '#6366F1' },
      boxShadow: { soft: '0 18px 45px rgba(15, 23, 42, 0.07)' },
    },
  },
  plugins: [],
}
