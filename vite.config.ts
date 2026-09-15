import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png', 'audio/**/*'],
      manifest: {
        name: 'Cadavre Exquis',
        short_name: 'Cadavre Exquis',
        description: 'Jeu surréaliste pour une voix humaine et quarante inconnus',
        theme_color: '#0f0805',
        background_color: '#0f0805',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'fr',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        start_url: '/',
        scope: '/',
        categories: ['games', 'entertainment'],

        /*
          L'identité de l'application — lot 18 de l'audit du 10 septembre.

          Sans `id`, l'identité installée est déduite de `start_url`. Le jour
          où celle-ci changerait — une page d'accueil déplacée, un paramètre
          ajouté — le navigateur croirait à une AUTRE application et
          proposerait une seconde installation à côté de la première, avec
          son propre stockage. Or toute la bibliothèque du joueur vit dans
          IndexedDB : il retrouverait une app vide en croyant ouvrir la
          sienne. Cette chaîne ne se change plus, jamais.
        */
        id: '/',

        /*
          Les captures de la fiche d'installation.

          Sans elles, Android affiche une invite d'installation minimale —
          une ligne de titre et un bouton. Avec, il ouvre une vraie fiche à
          vignettes. Ce sont de VRAIES captures de l'application, prises au
          540 × 960 par le script de `e2e`, jamais des maquettes : une fiche
          qui montre autre chose que le jeu est un mensonge commercial,
          et Play Console le refuse.

          Elles sont écartées du précache (voir `globIgnores`) : personne
          n'a besoin de 570 Ko de captures hors ligne.
        */
        screenshots: [
          {
            src: '/screenshots/accueil.png',
            sizes: '540x960',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'L’entrée du jeu — le cadavre écrit, dessiné, ou à plusieurs',
          },
          {
            src: '/screenshots/atelier.png',
            sizes: '540x960',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'L’Atelier — écrire un poème avec les voix, sans jamais relire',
          },
          {
            src: '/screenshots/galerie.png',
            sizes: '540x960',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'La galerie — les poèmes et les dessins des autres mains',
          },
        ],

        /*
          Deux raccourcis, et deux seulement. L'appui long sur l'icône en
          affiche quatre au plus sur Android, et une liste qui déborde se
          fait ignorer : ce sont les deux portes d'entrée du jeu solo.
          Le mode en ligne n'y est pas — il exige un salon, donc un code,
          donc quelqu'un d'autre : un raccourci mènerait à une attente.
        */
        shortcuts: [
          {
            name: 'Cadavre écrit',
            short_name: 'Écrire',
            description: 'Ouvrir une table et écrire un poème à l’aveugle',
            url: '/config',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'L’Atelier',
            short_name: 'Atelier',
            description: 'Écrire avec les voix, vers après vers',
            url: '/atelier',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // skipWaiting laissé à false : le nouveau SW attend qu'on l'active
        // explicitement (updateSW(true) au moment opportun), jamais en pleine partie.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp3,ogg,wav}'],
        // Les captures de la fiche d'installation ne servent qu'au magasin
        // et à l'invite du navigateur : elles n'ont rien à faire dans le
        // cache hors ligne du joueur.
        globIgnores: ['**/screenshots/**'],
        // Plus de règle de cache pour Google Fonts : il n'y a plus rien à
        // aller y chercher. Les .woff2 vivent dans /fonts et le
        // `globPatterns` ci-dessus les précache comme le reste.
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
