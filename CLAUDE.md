# Cadavre Exquis — notes de session

## Objectif final
**Mise sur l'App Store (iOS) et le Play Store (Android).**

## ✅ Application prête pour soumission

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

#### Non bloquants (v2)
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
npx @capacitor/assets generate --iconBackgroundColor '#0f0805' --splashBackgroundColor '#0f0805'

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
| `ELEVENLABS_API_KEY` | Voix de lecture premium (optionnel — repli voix système sinon) |
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
- Tests : Vitest (29 tests unitaires) + Playwright (11 tests E2E)

## Branche de développement
`claude/cadavre-exquis-pwa-SlVtb` (= main)
