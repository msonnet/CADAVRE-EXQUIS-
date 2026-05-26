/** @type {import('tailwindcss').Config}
 *
 * REMPLACE INTÉGRALEMENT tailwind.config.js existant.
 * Les classes Tailwind pointent vers les variables CSS écrites par <ReveProvider>.
 * Toute la palette de l'app suit le rêve courant — aucune valeur en dur.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens dynamiques (suivent le rêve courant)
        bg: 'var(--reve-bg)',
        ink: 'var(--reve-ink)',
        'ink-soft': 'var(--reve-ink-soft)',
        'ink-faint': 'var(--reve-ink-faint)',
        accent: 'var(--reve-accent)',
        'accent-hover': 'var(--reve-accent-hover)',
        rule: 'var(--reve-rule)',

        // Compat legacy (alias)
        papier: 'var(--reve-bg)',
        encre: 'var(--reve-ink)',
        rouge: 'var(--reve-accent)',
        gris: 'var(--reve-ink-soft)',
        or: 'var(--reve-accent)',
      },
      fontFamily: {
        // Typographie unifiée
        fraunces: ['Fraunces', 'serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        cormorant: ['"Cormorant Garamond"', 'Georgia', 'serif'],

        // Compat legacy → pointent désormais vers Fraunces / Inter
        garamond: ['Fraunces', 'serif'],
        bodoni: ['Fraunces', 'serif'],
        lora: ['Inter', 'sans-serif'],
        fell: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'micro': ['0.875rem', { lineHeight: '1.4' }],
        'sm-plus': ['0.95rem', { lineHeight: '1.5' }],
      },
      lineHeight: {
        relax: '1.6',
        vers: '1.6',
      },
      animation: {
        'fade-in-q': 'fadeInQ 0.8s ease-out forwards',
        'ink-bloom-q': 'inkBloomQ 1.2s ease-out forwards',
        'symbol-drop': 'symbolDrop 1.1s cubic-bezier(0.34,1.2,0.64,1) forwards',
        'etiq-drop': 'etiqDrop 0.7s ease-out forwards',
        'cursor-blink': 'blinkCaret 1.2s steps(2) infinite',
        'pulse-q': 'pulseQ 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
