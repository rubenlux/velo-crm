/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        'accent-text': 'var(--accent-text)',
        green: 'var(--green)',
        'green-soft': 'var(--green-soft)',
        'green-text': 'var(--green-text)',
        red: 'var(--red)',
        'red-soft': 'var(--red-soft)',
        'red-text': 'var(--red-text)',
        amber: 'var(--amber)',
        'amber-soft': 'var(--amber-soft)',
        blue: 'var(--blue)',
        'blue-soft': 'var(--blue-soft)',
        purple: 'var(--purple)',
        'purple-soft': 'var(--purple-soft)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)',
      },
      borderRadius: {
        lg: '14px',
        xl: '16px',
      },
      keyframes: {
        veloFade: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        veloPop: {
          from: { opacity: 0, transform: 'translateY(-8px) scale(.985)' },
          to: { opacity: 1, transform: 'none' },
        },
      },
      animation: {
        veloFade: 'veloFade .28s ease both',
        veloPop: 'veloPop .18s cubic-bezier(.2,.8,.3,1) both',
      },
      width: {
        side: 'var(--side-w)',
      },
    },
  },
  plugins: [],
};
