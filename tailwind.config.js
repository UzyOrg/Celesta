/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: '#0D1117',
        neutral: {
          100: '#F7F9FA',
          200: '#E3E8EE',
        },
        turquoise: '#05F7FF',
        lime: '#B6FF6D',
      },
      fontFamily: {
        'clash': ['"Clash Display"', 'sans-serif'],
        'general-sans': ['"General Sans"', 'sans-serif'],
      },
      maxWidth: {
        '8xl': '1440px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite',
        'fadeGlow': 'fadeGlow 2s ease-out forwards',
        'pulseSlow': 'pulseSlow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulseSlowDelay': 'pulseSlow 4s cubic-bezier(0.4, 0, 0.6, 1) 2s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-20px)',
          },
        },
        gradient: {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
        fadeGlow: {
          'from': {
            opacity: '0',
          },
          'to': {
            opacity: '1',
          },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};