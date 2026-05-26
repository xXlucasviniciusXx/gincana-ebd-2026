/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada nos logos: navy + acentos vibrantes
        brand: {
          navy: '#0b1f4d',
          'navy-light': '#1e3a8a',
          teal: '#2ea3a5',
          yellow: '#f5b921',
          orange: '#ef6a36',
          red: '#c0392b',
          cream: '#fdf8ee',
        },
      },
      fontFamily: {
        display: [
          '"Fredoka"',
          '"Baloo 2"',
          'ui-rounded',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 10px 40px -10px rgba(46, 163, 165, 0.45)',
        card: '0 8px 28px -10px rgba(11, 31, 77, 0.18)',
      },
      keyframes: {
        'confetti-fall': {
          '0%': { transform: 'translateY(-120%) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { transform: 'translateY(120vh) rotate(720deg)', opacity: '0' },
        },
        pulseRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 185, 33, 0.5)' },
          '50%': { boxShadow: '0 0 0 14px rgba(245, 185, 33, 0)' },
        },
      },
      animation: {
        'confetti-fall': 'confetti-fall 4s linear infinite',
        'pulse-ring': 'pulseRing 2.4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
