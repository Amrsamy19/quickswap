/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(217 33% 18%)',
        input: 'hsl(217 33% 18%)',
        ring: 'hsl(217 91% 60%)',
        background: '#0B0F17',
        surface: '#111827',
        card: '#161F30',
        primary: {
          DEFAULT: '#3B82F6',
          foreground: '#FFFFFF',
          hover: '#2563EB',
        },
        accent: {
          cyan: '#06B6D4',
          violet: '#8B5CF6',
          emerald: '#10B981',
          rose: '#F43F5E',
        },
      },
    },
  },
  plugins: [],
};
