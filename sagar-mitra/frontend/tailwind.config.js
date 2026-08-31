/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50:  '#edfcff',
          100: '#d6f7ff',
          200: '#a5effe',
          300: '#5ee3fc',
          400: '#10caf5',
          500: '#00aedb',
          600: '#008db8',
          700: '#007095',
          800: '#035c78',
          900: '#094d65',
          950: '#063245',
        },
        marine: {
          900: '#0a0f1e',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
        },
        warning: '#f59e0b',
        danger:  '#ef4444',
        safe:    '#22c55e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 6s linear infinite',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash': 'flash 0.5s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        flash: {
          '0%':   { opacity: '1', backgroundColor: '#7f1d1d' },
          '100%': { opacity: '0.7', backgroundColor: '#450a0a' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
