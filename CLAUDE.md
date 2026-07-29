# Cadavre Exquis — notes de session

## Objectif final
**Mise sur l'App Store (iOS) et le Play Store (Android).**

## ✅ Application stabilisée pour soumission

**Dossier complet : [`docs/soumission-app-store.md`](docs/soumission-app-store.md)**
(état vérifié, conformité Apple, étapes Mac, points connus assumés).
Textes de la fiche anglaise : [`docs/app-store-en.md`](docs/app-store-en.md).

### Critères App Store — tous résolus

#### Bloquants
- [x] **Rate limiting distribué** — in-memory par instance Vercel (`api/_rateLimit.ts`)
- [x] **Modération galerie** — signalement (`api/report.ts` + bouton ⚑) + suppression propres publications (RLS delete policy)
- [x] **Blocage d'utilisateurs (guideline 1.2)** — « ⊘ Masquer l'auteur » dans la galerie (liste locale `auteurs-masques`, réinitialisable depuis Réglages)
- [x] **Suppression de compte (guideline 5.1.1)** — bouton dans Profil → `api/delete-account.ts` (jeton de session vérifié, publications galerie anonymisées, profil + compte auth supprimés)
- [x] **Politique de confidentialité** — page `/privacy` (RGPD) depuis Réglages
- [x] **Packaging natif** — Capacitor configuré, scripts `cap:ios` / `cap:android`, resources/ prêts (icon.png 1024, splash.png 2732, adaptive icons)
- [x] **Icônes app** — générées (icon-192, icon-512, icon-512-maskable, apple-touch-icon, icon-1024, resources/)
- [x] **Nettoyage rooms** — cron Vercel toutes les heures (`/api/cleanup`, `vercel.json`)
- [x] **Analytics** — Vercel Analytics (`@vercel/analytics`) intégré dans `main.tsx`
- [x] **Dessins Supabase Storage** — `gallery-images` bucket, upload via `uploaderImageGalerie()`
- [x] **Bilingue FR / EN** — interface, moteur grammatical, galerie et salons filtrés par langue
- [x] **Identité visuelle** — l'Œil cousu : icône, favicon, splash, photo de profil Instagram
- [x] **Pas de contenu de debug livré** — gestionnaire d'erreurs retiré d'`index.html`, écran de secours au registre du carnet
- [x] **Illustrations au format Instagram** — 3:4 vertical, 1080 × 1440 px

#### Non bloquants (v1.1)
- [ ] React Router v7 (2 vulnérabilités modérées non atteignables — voir le dossier de soumission)
- [ ] Haptique iOS : brancher `@capacitor/haptics` (`navigator.vibrate` est ignoré par le WKWebView)
- [ ] `useAmbiance` est un moignon : le bouton son du mode dessin ne coupe rien
- [ ] Minuteur de tour en ligne côté serveur (une partie attend si le joueur ferme l'app)
- [ ] Mode spectateur codé mais sans point d'entrée
- [ ] La série (streak) compte les ouvertures, pas les poèmes écrits
- [ ] Réactions et vues de la galerie invisibles pour l'auteur
- [ ] `prefers-reduced-motion` ne neutralise pas les animations framer-motion
- [ ] Monitoring erreurs Sentry (optionnel — Vercel Analytics couvre les Web Vitals)
- [ ] Nettoyage galerie ancienne (images orphelines dans Storage)

## Procédure de soumission (sur Mac avec Xcode / Android Studio)

```bash
# 1. Build
npm run build

# 2. Ajouter les plateformes (première fois uniquement)
npm run cap:add:ios
npm run cap:add:android

# 3. Générer les assets natifs (icônes + splash à toutes les tailles)
# fond NOIR PUR : l'Œil cousu est composé sur noir, #0f0805 laisserait un liseré
npx @capacitor/assets generate --iconBackgroundColor '#000000' --splashBackgroundColor '#000000'

# 4. Sync et ouvrir
npm run cap:ios        # ouvre Xcode → Archive → App Store Connect
npm run cap:android    # ouvre Android Studio → Generate Signed Bundle
```

### Variables d'environnement Vercel à configurer
| Variable | Usage |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (cron cleanup uniquement) |
| `ANTHROPIC_API_KEY` | Voix IA Claude |
| `FAL_KEY` | Illustrations FLUX |
| `CRON_SECRET` | Protège `/api/cleanup` (générer avec `openssl rand -hex 32`) |
| `ELEVENLABS_API_KEY` | Voix de lecture directe (optionnel — sinon la lecture passe par FAL_KEY, déjà configurée) |
| `RESEND_API_KEY` + `REPORT_EMAIL` | E-mail au modérateur à chaque signalement (optionnel) |

### App Store Connect
- **Bundle ID** : `fr.nathansonnet.cadavreexquis`
- **Version** : 1.0.0
- **iOS minimum** : 16.0
- **Catégorie** : Games → Word Games
- **Âge** : 4+
- **Politique de confidentialité** : `https://cadavre-exquis-beta.vercel.app/privacy`
- **Support URL** : `https://cadavre-exquis-beta.vercel.app`

## Stack
- React + TypeScript + Vite + PWA (Vercel)
- Supabase (DB, Auth, Realtime, Storage)
- Claude API (voix IA), fal.ai (illustrations FLUX)
- Capacitor (iOS + Android natif)
- i18n maison : `tr(fr, en)` + `langueActuelle()` (`src/i18n/`)
- Tests : Vitest (74 tests unitaires) + Playwright (16 tests E2E, FR et EN)

## Branche de développement
`claude/cadavre-exquis-pwa-SlVtb` (= main)
