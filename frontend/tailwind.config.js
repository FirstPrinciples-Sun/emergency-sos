const path = require('path');

const frontendDir = __dirname;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(frontendDir, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(frontendDir, 'components/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(frontendDir, 'lib/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e61919',
          light: '#ffe5e5',
          dark: '#b31010',
        },
        'bg-main': '#0f172a',
        'bg-surface': '#1e293b',
        'bg-card': '#334155',
        'ai-soft': '#e6f7f0',
        'ai-border': '#c2eadd',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Noto Sans Thai', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'Noto Sans Thai', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '2.5rem',
        full: '9999px',
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(230, 25, 25, 0.08)',
        glow: '0 0 60px rgba(230, 25, 25, 0.4)',
        'glow-lg': '0 0 100px 20px rgba(230, 25, 25, 0.3)',
      },
    },
  },
  plugins: [],
};
