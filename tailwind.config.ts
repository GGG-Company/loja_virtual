import tailwindAnimate from 'tailwindcss-animate';
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Feira das Ferramentas — Brand Identity (Vermelho/Preto/Branco)
        primary: {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ff9494',
          400: '#f85555',
          500: '#e01020', // Vermelho principal da marca
          600: '#cc0a1a',
          700: '#a80816',
          800: '#890610',
          900: '#6b040c',
        },
        brand: {
          red: '#CC1020',
          black: '#1A1A1A',
          white: '#FFFFFF',
          dark: '#111111',
        },
        metallic: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        display: ['var(--font-barlow-condensed)', 'Barlow Condensed', 'sans-serif'],
        body: ['var(--font-barlow)', 'Barlow', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'brand-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(204, 16, 32, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(204, 16, 32, 0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'slide-in-left': 'slide-in-left 0.4s ease-out',
        'brand-pulse': 'brand-pulse 2s infinite',
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
