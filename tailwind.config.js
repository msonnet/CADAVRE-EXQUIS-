/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivoire: '#FAF6EE',
        encre: '#1A1A1A',
        or: '#B8956A',
        'or-clair': '#D4AF87',
        'or-fonce': '#8B6914',
        papier: '#F0E9D8',
        gris: '#6B6560',
        'gris-clair': '#C4BDB5',
      },
      fontFamily: {
        garamond: ['"EB Garamond"', 'Georgia', 'serif'],
        lora: ['Lora', 'Georgia', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      lineHeight: {
        relax: '1.6',
      },
      animation: {
        'fade-in-slow': 'fadeInSlow 1.2s ease-in forwards',
        'cursor-blink': 'cursorBlink 1.2s step-end infinite',
        'plume': 'plume 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInSlow: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        cursorBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        plume: {
          '0%, 100%': { transform: 'rotate(-5deg) translateY(0)' },
          '50%': { transform: 'rotate(5deg) translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
