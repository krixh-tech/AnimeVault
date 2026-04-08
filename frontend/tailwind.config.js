/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core brand
        brand: {
          50:  '#f3f0ff',
          100: '#e9e3ff',
          200: '#d4cbff',
          300: '#b5a5ff',
          400: '#9272ff',
          500: '#7c3aed',  // primary violet
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b1677',
        },
        // Neon accents
        neon: {
          violet: '#a855f7',
          cyan:   '#06b6d4',
          pink:   '#ec4899',
          green:  '#10b981',
          orange: '#f97316',
          yellow: '#eab308',
        },
        // Dark surfaces
        surface: {
          DEFAULT: '#0f0f17',
          50:  '#1a1a2e',
          100: '#16213e',
          200: '#0f3460',
          card: '#131320',
          overlay: '#1c1c2e',
          border: '#2a2a40',
        },
      },
      fontFamily: {
        display: ['var(--font-orbitron)', 'monospace'],
        body:    ['var(--font-inter)', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-anime': 'linear-gradient(135deg, #0f0f17 0%, #1a1a2e 50%, #16213e 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(124,58,237,0.1) 0%, rgba(15,15,23,0.95) 100%)',
        'neon-glow': 'radial-gradient(ellipse at center, rgba(124,58,237,0.3) 0%, transparent 70%)',
      },
      boxShadow: {
        'neon-sm':  '0 0 10px rgba(124,58,237,0.4)',
        'neon-md':  '0 0 20px rgba(124,58,237,0.5), 0 0 40px rgba(124,58,237,0.2)',
        'neon-lg':  '0 0 30px rgba(124,58,237,0.6), 0 0 60px rgba(124,58,237,0.3)',
        'neon-cyan': '0 0 20px rgba(6,182,212,0.5)',
        'neon-pink': '0 0 20px rgba(236,72,153,0.5)',
        'card':     '0 4px 20px rgba(0,0,0,0.5)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.7), 0 0 20px rgba(124,58,237,0.2)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
        'slide-up':   'slide-up 0.3s ease-out',
        'fade-in':    'fade-in 0.3s ease-out',
        'shimmer':    'shimmer 1.5s infinite',
        'scan-line':  'scan-line 8s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124,58,237,0.4)' },
          '50%':      { boxShadow: '0 0 40px rgba(124,58,237,0.8), 0 0 60px rgba(124,58,237,0.4)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'scan-line': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
