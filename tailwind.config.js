/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        court: {
          green: '#1b633e',
          line: '#ffffff',
          blue: '#1e3a8a',
          mat: '#15803d'
        },
        brand: {
          primary: '#10b981', // emerald
          accent: '#06b6d4',  // cyan
          teamA: '#38bdf8',   // light blue
          teamB: '#f97316'    // orange
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
