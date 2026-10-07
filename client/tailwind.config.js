/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--canvas)',
          subtle: 'var(--canvas-subtle)',
          text: 'var(--canvas-text)',
          muted: 'var(--canvas-muted)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
          elevated: 'var(--surface-elevated)',
          inset: 'var(--surface-inset)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          foreground: 'var(--brand-foreground)',
          hover: 'var(--brand-hover)',
          active: 'var(--brand-active)',
          accent: 'var(--brand-accent)',
          'accent-subtle': 'var(--brand-accent-subtle)',
        },
        status: {
          'available-bg': 'var(--status-available-bg)',
          'available-text': 'var(--status-available-text)',
          'available-border': 'var(--status-available-border)',
          'available-dot': 'var(--status-available-dot)',

          'overdue-bg': 'var(--status-overdue-bg)',
          'overdue-text': 'var(--status-overdue-text)',
          'overdue-border': 'var(--status-overdue-border)',
          'overdue-dot': 'var(--status-overdue-dot)',

          'warning-bg': 'var(--status-warning-bg)',
          'warning-text': 'var(--status-warning-text)',
          'warning-border': 'var(--status-warning-border)',
          'warning-dot': 'var(--status-warning-dot)',

          'info-bg': 'var(--status-info-bg)',
          'info-text': 'var(--status-info-text)',
          'info-border': 'var(--status-info-border)',
          'info-dot': 'var(--status-info-dot)',

          'neutral-bg': 'var(--status-neutral-bg)',
          'neutral-text': 'var(--status-neutral-text)',
          'neutral-border': 'var(--status-neutral-border)',
          'neutral-dot': 'var(--status-neutral-dot)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        modal: 'var(--shadow-modal)',
      },
      transitionTimingFunction: {
        spring: 'var(--ease-spring)',
      },
    },
  },
  plugins: [],
}
