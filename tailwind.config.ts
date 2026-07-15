import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/frontend/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
        brand: ['"Outfit"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Navy core
        navy: {
          50: '#eef2ff',
          100: '#dde5ff',
          200: '#b3c4ff',
          300: '#7a9bff',
          400: '#4170ff',
          500: '#0038FF',
          600: '#0030dd',
          700: '#0025b0',
          800: '#0a1433',
          900: '#060c22',
          950: '#030614',
        },
        // Energetic yellow
        volt: {
          50: '#fffde7',
          100: '#fff9c4',
          200: '#fff59d',
          300: '#ffee58',
          400: '#ffea00',
          500: '#FFD60A',
          600: '#ffc107',
          700: '#ffb300',
          800: '#ff8f00',
          900: '#ff6f00',
        },
        // Coral energy
        coral: {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ff8a8a',
          400: '#ff5252',
          500: '#e0002b',
          600: '#c50024',
          700: '#a3001e',
        },
        // Mint fresh
        mint: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // Surface system (light with depth)
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
        },
        // Text
        ink: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
        },
        // Unified brand palette (matches landing page)
        charcoal: {
          DEFAULT: '#070A12',
          50: '#f8f9fa',
          100: '#e9ecef',
          800: '#050810',
          900: '#070A12',
        },
        mustard: {
          DEFAULT: '#E8B931',
          50: '#FFF8E1',
          100: '#FEF0C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#E8B931',
          600: '#D97706',
        },
        ember: {
          DEFAULT: '#FF6B35',
          50: '#FFF3ED',
          100: '#FFE0D1',
          500: '#FF6B35',
          600: '#E85D2C',
        },
        cream: {
          DEFAULT: '#FAF8F5',
          50: '#FAF8F5',
          100: '#F5F0EA',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 56, 255, 0.08)',
        'glass-lg': '0 16px 48px rgba(0, 56, 255, 0.12)',
        'glass-xl': '0 24px 64px rgba(0, 56, 255, 0.16)',
        'glow-yellow': '0 0 40px rgba(255, 214, 10, 0.3)',
        'glow-navy': '0 0 40px rgba(0, 56, 255, 0.2)',
        'glow-navy-lg': '0 0 80px rgba(0, 56, 255, 0.25)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 12px 40px rgba(0, 0, 0, 0.1)',
        'elevated': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'elevated-lg': '0 20px 60px rgba(0, 0, 0, 0.12)',
        'float': '0 32px 64px rgba(0, 56, 255, 0.1)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #0038FF 0%, #4170ff 50%, #7c3aed 100%)',
        'gradient-volt': 'linear-gradient(135deg, #FFD60A 0%, #ffea00 50%, #ffc107 100%)',
        'gradient-surface': 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 40% 20%, rgba(0, 56, 255, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 214, 10, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(124, 58, 237, 0.04) 0px, transparent 50%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.5s ease-out',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2.5s linear infinite',
        'ripple': 'ripple 1s ease-out',
        'wave': 'wave 3s ease-in-out infinite',
        'blob': 'blob 7s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'morph': 'morph 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(1deg)' },
          '66%': { transform: 'translateY(-4px) rotate(-1deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        wave: {
          '0%, 100%': { transform: 'translateX(0) translateY(0)' },
          '25%': { transform: 'translateX(5px) translateY(-3px)' },
          '50%': { transform: 'translateX(0) translateY(-6px)' },
          '75%': { transform: 'translateX(-5px) translateY(-3px)' },
        },
        blob: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%': { borderRadius: '50% 60% 30% 60% / 30% 60% 70% 40%' },
          '75%': { borderRadius: '60% 40% 60% 30% / 60% 40% 30% 60%' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
