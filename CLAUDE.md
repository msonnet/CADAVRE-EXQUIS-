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

#### Abonnement — reste à faire hors du code
- [ ] Appliquer `supabase/migrations/20260730000010_abonnement.sql`
- [ ] Créer le compte RevenueCat, l'entitlement `encrier`, l'offering par défaut
- [ ] Créer les abonnements dans App Store Connect et Google Play Console
- [ ] Renseigner les 4 variables `REVENUECAT_*` (voir `.env.example`)
- [ ] S'inscrire au Small Business Program d'Apple (15 % au lieu de 30 %)

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
| `RESEND_API_KEY` + `REPORT_EMAIL` | E-mail au modérateur à chaque signalement (optionnel) |
| `VITE_REVENUECAT_IOS_KEY` + `VITE_REVENUECAT_ANDROID_KEY` | Clés publiques RevenueCat (app native) |
| `REVENUECAT_SECRET_KEY` | Lecture de l'abonnement à la restauration |
| `REVENUECAT_WEBHOOK_SECRET` | Authentifie le webhook `/api/revenuecat` |

### App Store Connect
- **Bundle ID** : `fr.nathansonnet.cadavreexquis`
- **Version** : 1.0.0
- **iOS minimum** : 16.0
- **Catégorie** : Games → Word Games
- **Âge** : 4+
- **Politique de confidentialité** : `https://cadavre-exquis-beta.vercel.app/privacy`
- **Support URL** : `https://cadavre-exquis-beta.vercel.app`

## Modèle économique — l'abonnement « L'Encrier »

Le jeu est **gratuit et entier**. Écrire à plusieurs, dessiner, publier en
galerie, consulter ses créations : rien de tout cela n'appelle un serveur
facturé, rien n'est compté.

**Trois actes coûtent de l'argent réel** et sont donc les seuls limités :

| Acte | Moteur | Coût réel |
|---|---|---|
| Illustration grand format | FLUX pro 1.1 | 0,040 $ |
| Partie entière où l'IA écrit | Sonnet 4.6 + Opus 4.8 | ~0,020 $ |
| Lecture surréaliste d'un dessin | Sonnet 4.6 + vision | ~0,008 $ |
| *(photo de profil)* | FLUX schnell | 0,003 $ |

**Essai offert une fois**, à la création de l'identité : 5 illustrations,
5 parties avec les voix, 3 lectures de dessin — soit 0,32 $ au maximum par
joueur. C'est la dépense d'acquisition, et elle montre exactement ce que
l'abonnement ouvre.

**Abonnement** : 4,99 €/mois ou 39,99 €/an. Voix de l'IA et lectures de
dessins illimitées, 2 illustrations grand format par jour.

| | |
|---|---|
| Revenu net mensuel | 4,58 $ (après les 15 % Apple) |
| Coût d'un abonné moyen | ~0,80 $/mois → marge 83 % |
| Coût de l'abonné qui sature tous les plafonds | ~2,70 $/mois → marge 41 % |
| Point mort | ~3,5 % des installations abonnées un mois |

Aucune publicité, aucun identifiant publicitaire, aucun bandeau de
consentement : le 4+ est conservé sans discussion.

**Marche à suivre pour la mise en vente :**
[`docs/mise-en-vente-encrier.md`](docs/mise-en-vente-encrier.md) — les six
phases restantes, les valeurs exactes à recopier, les points de contrôle.

### Où ça vit

- `supabase/migrations/20260730000010_abonnement.sql` — tables `acces` et
  `usage_events`, RPC `etat_acces` / `consommer_acces` / `rendre_acces` /
  `poser_abonnement`. **Migration à appliquer.**
- `api/_acces.ts` — les plafonds journaliers (`PLAFOND_JOUR`) et le point de
  passage unique. C'est là que se règlent tous les cadrans économiques.
- `api/acces.ts` — état du joueur (GET) et ouverture d'une partie IA (POST).
- `api/revenuecat.ts` — webhook du magasin, **seul** endroit où le statut
  d'abonné s'écrit.
- `api/_revenuecat.ts` — lecture directe chez RevenueCat, pour « Restaurer
  mes achats » après une réinstallation.
- `src/lib/acces.ts` · `src/lib/achats.ts` · `src/hooks/useAcces.ts` ·
  `src/components/MurAbonnement.tsx` — le côté joueur.

### Principes tenus

- Le statut d'abonné ne vient **jamais** du client : il est écrit par le
  webhook, lu par le serveur, seulement reflété par l'app.
- Une partie se règle **à son ouverture**, jamais en cours de route — un
  poème ne s'interrompt pas au huitième vers.
- Toute génération ratée **rend** ce qu'elle a pris.
- Réseau injoignable : on laisse passer. Mieux vaut une partie de trop qu'un
  joueur bloqué par une coupure.
- **Registre injoignable = passage libre**, côté serveur aussi. Un refus n'a
  de sens que si la comptabilité a répondu ; si elle manque (base en panne,
  migration pas encore appliquée), refuser fermerait le jeu pour tout le
  monde sans rapporter un centime. Tant que la migration n'est pas passée,
  l'app fonctionne donc exactement comme avant, en gratuit intégral.

## L'Atelier — gelé le 27 août 2026

Six chantiers de mesure, quatre instruments, quatre gardes. **Gelé dans cet
état** : la suite du projet est administrative.

| instrument | garde | ce qu'il a corrigé |
|---|---|---|
| `src/lib/determinants.ts` | `GardeOuverture` | douze vers d'affilée ouvrant sur « le » ou « la » |
| `src/lib/formes.ts` | `GardeFormes` | quinze propositions complètes de suite, puis sept listes sur seize |
| `src/lib/metrique.ts` | `GardeMetrique` | zéro vers de dix mots ou plus, à toutes les tables |
| `src/lib/lexique.ts` | `GardeLexique` | zéro vers sur vingt-deux sans un mot savant |

**La méthode, si le chantier reprend un jour.** Une monotonie ne se corrige
que si on sait la compter : d'abord l'instrument, ensuite la cause, jamais la
reformulation de consigne. Reformuler n'a JAMAIS marché dans ce projet — le
boucher rendait « le persillé » huit fois sur huit, l'adverbe « obliquement »
onze fois sur seize. Seul un tirage par appel, ou une garde qui compte les
cases, y arrive.

**Mesure de clôture**, atelier du 27 août à trente-six voix : 19 % d'articles
définis, cinq familles de forme sur sept, vers de 1 à 10 mots, une dizaine de
mots savants sur vingt-deux vers. À la lecture, neuf ou dix vers dignes d'être
gardés — contre zéro deux jours plus tôt.

**Ce qui n'a pas été fait, et pourquoi.** La récolte : garder un vers, un
carnet qui les accumule à travers les séances, réordonnable et exportable.
C'est ce qui rendrait « Expiation Cadavérique » possible — un recueil n'est
pas vingt poèmes générés, c'est trois cents vers récoltés et assemblés à la
main. Chantier décidé mais non ouvert.

## Stack
- React + TypeScript + Vite + PWA (Vercel)
- Supabase (DB, Auth, Realtime, Storage)
- Claude API (voix IA), fal.ai (illustrations FLUX)
- Capacitor (iOS + Android natif)
- i18n maison : `tr(fr, en)` + `langueActuelle()` (`src/i18n/`)
- Tests : Vitest (74 tests unitaires) + Playwright (16 tests E2E, FR et EN)

## Branche de développement
`claude/cadavre-exquis-pwa-SlVtb` (= main)
