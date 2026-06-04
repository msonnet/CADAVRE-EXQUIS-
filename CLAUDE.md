# Cadavre Exquis — notes de session

## Objectif final
**Mise sur l'App Store (iOS) et/ou le Play Store (Android).**
Me prévenir dès que l'application atteint les critères de maturité pour une soumission.

## Critères App Store manquants (à tracker)

### Bloquants
- [x] **Rate limiting distribué** — migré vers Supabase RPC `check_rate_limit()` (atomic upsert), fallback in-memory conservé (`api/_rateLimit.ts`)
- [x] **Modération galerie** — signalement (`api/report.ts` + bouton ⚑ dans Galerie) + suppression de ses propres publications (colonne `author_id` + RLS delete policy)
- [x] **Politique de confidentialité** — page `/privacy` (RGPD) accessible depuis Réglages
- [x] **Packaging natif** — Capacitor installé (`@capacitor/core/cli/ios/android`), `capacitor.config.ts` créé, scripts `cap:ios` / `cap:android` dans package.json ; reste à ajouter les plateformes sur Mac avec Xcode

### Importants mais non bloquants
- [ ] Dessins base64 → Supabase Storage (scalabilité)
- [ ] Nettoyage des rooms expirées (cron Supabase ou Vercel)
- [ ] Monitoring erreurs (Sentry ou équivalent)
- [ ] Analytics (Plausible, PostHog…)

## Stack
- React + TypeScript + Vite + PWA (Vercel)
- Supabase (DB, Auth, Realtime, Storage)
- Claude API (voix IA), fal.ai (illustrations FLUX)
- Tests : Vitest (29 tests unitaires) + Playwright (11 tests E2E)

## Branche de développement
`claude/cadavre-exquis-pwa-SlVtb` (= main)
