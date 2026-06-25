import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        m: {
          bg:            '#080810',
          surface:       '#0d0d1a',
          raised:        '#131325',
          line:          '#1a1a30',
          spoke:         '#272745',
          ink:           '#e4e0f5',
          dim:           '#625f7a',
          ghost:         '#2a2840',
          violet:        '#a78bfa',
          'violet-bright': '#c4b5fd',
          'violet-deep': '#7c3aed',
          green:         '#34d399',
          amber:         '#fbbf24',
          red:           '#f87171',
        },
      },
    },
  },
  plugins: [],
}
export default config
