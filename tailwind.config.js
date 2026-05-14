/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ───── PALETTE ALMANACH SURRÉALISTE ─────
        papier: '#ede2c8',       // papier ivoire bruni (fond principal)
        'papier-fonce': '#d9c9a5',
        encre: '#1a1410',        // encre noire (texte principal)
        'encre-claire': '#3a302a',
        gris: '#6b5d4f',         // gris cendre (méta, folios)
        'gris-clair': '#a08e7a',
        rouge: '#a8332a',        // rouge Breton (accent + manuscrit)
        'rouge-fonce': '#7a2620',
        or: '#9a7d3a',           // or terni (séparateurs subtils)
        'or-clair': '#c9a85d',

        // ───── COMPATIBILITÉ ancienne ─────
        ivoire: '#ede2c8',
        'or-fonce': '#7a5a20',
      },
      fontFamily: {
        // ───── TYPOGRAPHIE ALMANACH ─────
        bodoni: ['"Bodoni Moda"', 'Georgia', 'serif'],
        fell: ['"IM Fell English"', 'Georgia', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        caveat: ['"Caveat"', 'cursive'],

        // ───── COMPATIBILITÉ ancienne ─────
        garamond: ['"Bodoni Moda"', 'Georgia', 'serif'],
        lora: ['"IM Fell English"', 'Georgia', 'serif'],
      },
      lineHeight: { relax: '1.6' },
      animation: {
        'fade-in-slow': 'fadeInSlow 1.2s ease-in forwards',
        'cursor-blink': 'cursorBlink 1.2s step-end infinite',
        'plume': 'plume 2s ease-in-out infinite',
        'ink-bloom': 'inkBloom 0.9s ease-out forwards',
        'collage-drop': 'collageDrop 1.1s cubic-bezier(0.34, 1.2, 0.64, 1) forwards',
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
        inkBloom: {
          '0%': { opacity: '0', filter: 'blur(2px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
        collageDrop: {
          '0%': { opacity: '0', transform: 'translateY(-30px) rotate(-20deg) scale(0.85)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
