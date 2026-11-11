/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Mono', 'monospace'],
      },
      colors: {
        chronos: {
          bg: '#0A0A09',
          surface: 'rgba(18, 18, 16, 0.92)',
          border: 'rgba(244, 241, 234, 0.14)',
          text: '#F4F1EA',
          muted: '#8E8B82',
          orange: '#FF4F00',
          amber: '#FFB800',
        },
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
      },
    },
  },
  plugins: [],
};
