# Cadavre Exquis — notes de session

## Objectif final
**Mise sur l'App Store (iOS) et/ou le Play Store (Android).**
Me prévenir dès que l'application atteint les critères de maturité pour une soumission.

## Critères App Store manquants (à tracker)

### Bloquants
- [ ] **Rate limiting distribué** — l'implémentation in-memory actuelle ne survit pas à plusieurs instances Vercel ; migrer vers Upstash Redis ou Supabase RPC
- [ ] **Modération galerie** — signalement / suppression de contenu ; Apple rejette sans mécanisme de modération
- [ ] **Politique de confidentialité** — URL obligatoire pour toute app avec compte utilisateur
- [ ] **Packaging natif** — la PWA seule ne suffit pas pour l'App Store ; utiliser Capacitor (wrapper natif iOS/Android) ou soumettre comme app web via Safari (pas d'App Store)

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
