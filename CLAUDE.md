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
- [x] **Nettoyage rooms** — cron Vercel quotidien (`/api/cleanup`, `vercel.json`) ; il scelle aussi les poèmes du jour
- [x] **Analytics** — Vercel Analytics (`@vercel/analytics`) intégré dans `main.tsx`
- [x] **Dessins Supabase Storage** — `gallery-images` bucket, upload via `uploaderImageGalerie()`
- [x] **Bilingue FR / EN** — interface, moteur grammatical, galerie et salons filtrés par langue
- [x] **Identité visuelle** — l'Œil cousu : icône, favicon, splash, photo de profil Instagram
- [x] **Pas de contenu de debug livré** — gestionnaire d'erreurs retiré d'`index.html`, écran de secours au registre du carnet
- [x] **Illustrations au format Instagram** — 3:4 vertical, 1080 × 1440 px

#### Le poème du jour
- [x] **Migration appliquée** — `supabase/migrations/20260917000010_cadavre_du_jour.sql`,
      le 21 septembre 2026 ; `GET /api/jour?langue=fr` répond en production
- [x] **Le cron quotidien** — `/api/cleanup` à 00 h 30 UTC, un seul déclenchement
      (plan Hobby), qui nettoie les salons puis scelle les jours écoulés
- [x] **`CRON_SECRET` posé chez Vercel** — le 22 septembre 2026 ; vérifié en
      production : 200 avec le secret, 401 sans et 401 avec un faux
- [x] **Scellement vu en vrai** — le 23 septembre à 00 h 30 UTC, sur la
      chaîne du 22 : « 5 VERS · 2 MAINS », deux anonymes et trois voix (le
      greffier, le géologue, le météorologue). Exactement le cas prévu.

#### Abonnement — reste à faire hors du code
- [ ] Appliquer `supabase/migrations/20260730000010_abonnement.sql`
- [ ] Créer le compte RevenueCat, l'entitlement `encrier`, l'offering par défaut
- [ ] Créer les abonnements dans App Store Connect et Google Play Console
- [ ] **Créer les deux flacons** — consommables, mêmes identifiants que
      `FLACONS` dans `api/_acces.ts` :
      `fr.nathansonnet.cadavreexquis.flacon.4` (0,99 €) et
      `…flacon.12` (2,99 €). À ranger dans le **même offering** que les
      abonnements : `lireOffres` et `lireFlacons` les trient par
      identifiant de produit
- [ ] Renseigner les 4 variables `REVENUECAT_*` (voir `.env.example`)
- [ ] S'inscrire au Small Business Program d'Apple (15 % au lieu de 30 %)

#### Le lancement — reste à faire hors du code
- [x] **Migration appliquée** — `supabase/migrations/20261014000010_lancement.sql`,
      le 14 octobre 2026 (collée en TEXTE dans SQL Editor : le chemin seul
      n'est pas du SQL, c'est ce qui avait échoué au premier essai).
      Vérifié en production par l'API publique : la colonne `exclus` répond,
      `cadavre_inconvenant` rend vrai pour « espèce de connard » et
      « xX_salope_Xx », faux pour « le cône de lumière » et « he will bite ».

#### Non bloquants (v1.1)
- [ ] React Router v7 (2 vulnérabilités modérées non atteignables — voir le dossier de soumission)
- [ ] Haptique iOS : brancher `@capacitor/haptics` (`navigator.vibrate` est ignoré par le WKWebView)
- [ ] Minuteur de tour en ligne côté serveur (une partie attend si le joueur ferme l'app)
- [ ] Mode spectateur codé mais sans point d'entrée
- [x] Réactions et vues de la galerie visibles pour l'auteur — sur son feuillet, au recueil, au Profil (voir « La galerie, une revue »)
- [ ] `prefers-reduced-motion` : le dévoilement du poème l'honore (et le plantage
      de la page de fin est corrigé), mais les autres animations framer-motion
      ne le lisent toujours pas
- [ ] Monitoring erreurs Sentry (optionnel — Vercel Analytics couvre les Web Vitals)
- [ ] Nettoyage galerie ancienne (images orphelines dans Storage)
- [ ] La voix intérieure du mode hypnotique puise encore dans le stock commun
      (« chavire », « la nuit garde tout ») : une réserve « du médium » reste
      à écrire, comme celles des voix (`data/reserveVoix.ts`)

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

# 4. Sync et ouvrir — `cap:telephone` passe automatiquement :
#    portrait seul, iPhone seulement, iOS 16 minimum
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

## L'histoire du projet — `docs/journal.md`

Tout ce qui a été mesuré, décidé et corrigé depuis août 2026 vit dans
[`docs/journal.md`](docs/journal.md), sections inchangées. **Avant de
toucher à une partie du jeu, lire sa section** : chaque choix y a sa
raison, et beaucoup de « corrections » évidentes ont déjà été essayées et
défaites. Ce fichier-ci ne garde que l'état, les règles et la carte.

| partie du jeu | section du journal | fichiers principaux |
|---|---|---|
| économie, encrier, flacons | « Modèle économique — l'abonnement » | `api/_acces.ts`, `src/lib/acces.ts`, `MurAbonnement.tsx` |
| Atelier (gelé) | « L'Atelier — gelé le 27 août » | `src/lib/determinants.ts`, `formes.ts`, `metrique.ts`, `lexique.ts` |
| carnet, reliure | « Le carnet — la récolte », « Le carnet compose » | `src/pages/Recolte.tsx`, `src/lib/reliure.ts` |
| dévoilement, feuille de papier | « Le dévoilement », « La feuille de papier », « La feuille pliée, au doigt » | `FeuillePliee.tsx`, `src/lib/paquet.ts`, `PoemeDevoile.tsx`, `Depli.tsx`, `src/lib/rythme.ts`, `src/lib/papier.ts` |
| écriture, pli, rabat | « Le pli à l'écriture » | `Jeu.tsx`, `Papier.tsx`, `Rabat.tsx`, `src/lib/pli.ts` |
| fin de partie, coutures | « La fin de partie — le poème parle d'abord » | `FinDePartie.tsx`, `src/lib/plis.ts`, `src/lib/composition.ts` |
| table locale, prénoms | « La table locale » | `src/lib/table.ts`, `NomsDesMains.tsx` |
| poème du jour | « Le poème du jour » | `api/_jour.ts`, `src/lib/jourLogique.ts`, `PoemeDuJour.tsx` |
| voix, registre, genre | « Le registre des voix », « La Découverte, et le genre des voix » | `api/_voices.ts`, `src/data/voiceIds.ts`, `RegistreVoix.tsx` |
| galerie | « La galerie, une revue » | `Galerie.tsx`, `EntreeGalerie.tsx`, `src/lib/publier.ts` |
| partage, affiche, vidéo | « Le partage — une porte, et une affiche qui tient » | `src/utils/partager.ts`, `src/lib/affiche.ts` |
| dessiné, studio | « Le studio du dessiné », « La lecture du dessin », « Le dessin plié, au doigt » | `JeuDessin.tsx`, `src/lib/trait/`, `RevealDessin.tsx`, `FeuillePliee.tsx` |
| salon en ligne, convenance | « Le lancement — ce qui relevait du code » | `src/lib/salonEnLigne.ts`, `src/lib/convenance.ts` |
| couleurs, accueil | « Les couleurs des rubriques », « Les quatre pavés » | `src/reve/`, `src/lib/nuances.ts` |
| conformité (Apple, DSA, AI Act) | « La conformité — 22 septembre » | `/conditions`, `api/signaler-vers.ts` |
| téléphone, natif, fichiers | « L'audit du 30 septembre » | `capacitor.config.ts`, `src/lib/emporter.ts` |
| polices, clavier, accessibilité | « Les polices », « Le clavier », « L'accessibilité » | `src/polices.css`, `src/lib/clavier.ts`, `src/lib/a11y.ts` |

**L'économie en bref** (le détail et les calculs sont au journal) : le jeu
est gratuit et entier ; seuls trois actes coûtent de l'argent réel —
l'illustration FLUX, une partie où les voix écrivent, la lecture d'un
dessin. Essai offert une fois : 2 illustrations, 8 parties avec les voix,
3 lectures. L'encrier rend 1 partie par semaine (lundi UTC). Les flacons
(4 ou 12 images) ne valent que pour les images. Abonnement « L'Encrier » :
4,99 €/mois ou 39,99 €/an. Aucune publicité. Réseau ou registre
injoignable : on laisse passer. Les cadrans se règlent dans `api/_acces.ts`.

## Les règles de l'auteur — elles tiennent jusqu'à ce qu'il les change

- **Rien de visuel ou de sonore n'entre dans le jeu sans images témoins
  montrées et validées** : références, puis maquettes au format réel, puis
  sa validation, puis l'intégration. Jamais l'intégration d'abord (la
  couture du 7 novembre a été retirée pour cela).
- **Aucun son** ajouté sans son accord (les sons de papier du 1er octobre
  ont été retirés ; le froissement du dépli, essayé le 11 novembre, aussi :
  « définitivement le son ne me convient pas » — le dépli est muet). **Pas de tampon** (refusé le 8 novembre). **Pas de
  visage** pour les voix. La musique est en suspens.
- **Le mot est déjà écrit sur le volet** quand le papier se déplie.
- **Gravures du domaine public ou CC0 seulement** ; jamais Gallica, aucune
  caricature d'époque. Les motifs animés vivent **sur l'accueil seulement**,
  un par ambiance.
- **Les voix** : 23 femmes, 22 hommes et la notice ; la Découverte donne le
  premier et le dernier fragment au joueur.
- Écrire **en français, sobre**, sans point d'exclamation ni emoji. Parler
  à l'auteur sans jargon : il n'est pas développeur.
- **Pas d'agents en série ni de longs traitements qui consomment le crédit**
  (rappelé deux fois, le 14 octobre et le 10 novembre) : travailler
  directement, une chose à la fois, et montrer avant de continuer.
- Une migration SQL se donne **en texte dans la conversation**, à copier
  dans le SQL Editor de Supabase, jamais comme un fichier à télécharger.
- **Aucune clé, aucun secret dans le dépôt** (FAL, Anthropic, CRON_SECRET) :
  seulement en variable d'environnement le temps d'une commande.
- Pousser sur `claude/cadavre-exquis-pwa-SlVtb` **et** sur `main`.

## Travailler sur ce dépôt — les pièges connus

- Les parcours Playwright lisent `dist/` (`vite preview`) : **`npm run
  build` avant** `npx playwright test`, sinon on teste l'ancienne version.
- Dans un conteneur sans navigateur Playwright téléchargeable :
  `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test`.
- Bouchonner Supabase par un **prédicat d'hôte**
  (`u => u.hostname.endsWith('supabase.co')`) : le motif `**/supabase.co/**`
  ne prend pas `placeholder.supabase.co`.
- Un vers a deux nœuds texte pendant le dépli (le dessin et sa copie
  `.sr-only`) : `getByText(…).last()` est le dessin.
- Le plan Hobby de Vercel : un seul cron par jour, douze fonctions au plus.
  Un build refusé laisse servir l'ancien déploiement sans rien dire : seul
  le statut du commit sur GitHub le montre.
- Les règles du poème du jour et la convenance existent en double ou en
  triple (client, serveur, SQL) : des mesures les tiennent d'accord, on
  les change ensemble.

## Les chantiers ouverts

**La direction artistique** — [`docs/direction-artistique.md`](docs/direction-artistique.md).
L'auteur veut un jeu « à la pointe de la modernité », digne d'un studio de
jeu mobile. Sept chantiers par ordre d'impact, à valider un à un sur images
témoins. Fait : le décor vivant de l'accueil (quatre motifs gravés), la
feuille de papier de la fin de partie.

**Le plan « moderne », validé par l'auteur le 10 novembre** — cinq points,
dans cet ordre, chacun sur maquette témoin d'abord (`scripts/temoins/`,
voir son README) :
1. **On manipule soi-même** : le poème se déplie en tirant le bord de la
   feuille du doigt ; lâchée, elle retombe avec son poids (ressorts).
2. **La vibration** à chaque geste : plier, sceller, un volet qui tombe
   (`@capacitor/haptics`).
3. **Les écrans qui s'enchaînent** : la carte du recueil s'ouvre en feuille
   au lieu d'un fondu de page.
4. **La vraie 3D au bon endroit** : le dépli du poème et la révélation du
   dessin (lumière, ombre, épaisseur du papier) ; ailleurs un relief
   discret (boutons qui s'enfoncent, accueil qui bouge quand on incline le
   téléphone). Pas de 3D partout.
5. **Plus tard, un widget** « poème du jour » sur l'écran d'accueil de
   l'iPhone (code natif Swift, chantier à part).

**Points 1 et 4, le dépli tiré du doigt en 3D : maquette validée le
11 novembre** (`scripts/temoins/depli-au-doigt/paquet.html`). Le paquet
arrive fermé, chaque pli se dresse vers le joueur et retombe sous son
poids, le papier se courbe. **Sans aucun son** : un froissement a été
essayé puis retiré par l'auteur le même jour, définitivement. Tout le cheminement (quatre
retours de l'auteur) est dans `docs/direction-artistique.md`, « Le plan
moderne ». **Intégré à la fin de partie le 11 novembre** (`FeuillePliee.tsx`,
`lib/paquet.ts` ; journal, « La feuille pliée, au doigt ») ; il s'ouvre de
lui-même au bout de huit secondes si personne n'y touche. Restent le salon
et le poème du jour, qui gardent l'ancien dépli.

**Point 2, la vibration** : une page web ne peut plus faire vibrer un
iPhone (Apple a fermé la dernière astuce avec iOS 26.5) ; elle ne se
sentira que dans l'application installée (`@capacitor/haptics`).
L'auteur n'a jamais installé l'application sur son iPhone depuis Xcode :
la vibration se fera à cette première installation, guidée pas à pas.

**Point 3, les écrans qui s'enchaînent : maquette retenue le 11 novembre**
(`scripts/temoins/recueil-feuille/maquette.html`, reste à l'intégrer) —
la ligne du recueil devient un feuillet qui glisse à sa place et grandit
jusqu'à la feuille, déjà dépliée, sans son ; la page du poème montre le
poème sur sa feuille.

**Point 4, la révélation du dessin en 3D : maquette validée, intégrée le
11 novembre** (`scripts/temoins/dessin-3d/maquette.html` ; `RevealDessin.tsx`
sur `FeuillePliee`, au dessiné local et au salon ; journal, « Le dessin
plié, au doigt ») — il arrive plié, chaque pli découvre la bande d'une
main, son nom dans le coin, sans son ; la vue suit, puis recule sur le
dessin entier avant la lecture. Reste ensuite du point 4 le relief discret
(boutons qui s'enfoncent, accueil qui bouge quand on incline le
téléphone).

**Le chantier EffectCraft** — [`docs/chantier-effectcraft.md`](docs/chantier-effectcraft.md).
Suspendu. Le cadre technique Lottie est en place (`src/components/Animation.tsx`,
`src/lib/animation.ts`) ; la couture a été retirée. Les logiciels ArtCraft
sont connectés sur l'ordinateur de l'auteur, pas dans les sessions cloud.

**Ce qui reste de l'audit du 30 septembre** (non commencé, voulu) :
- En ligne : l'écran de tour moins soigné que le jeu local.
- Dessin : trait perlé ou haché ; le dessin ni gardé d'office ni signé par
  ses mains ; la lecture qui échoue à cinq bandes ; la lecture sans voix
  nommée.
- Le corps du texte (réglage CORPS en natif), la vibration
  (`@capacitor/haptics`), les pages qui ne se tournent pas.
- Les feuillets tournants ; le lexique anglais fixé ; la fiche anglaise
  des magasins ; les captures de la vitrine d'installation (un sablier).

**Hors du code** :
- Relire les 46 épigraphes (`src/data/epigraphes.ts`) et les 1 380
  fragments de réserve (`src/data/reserveVoix.ts`).
- `gallery_reactions` est ouverte à tous en écriture : à durcir par une
  migration (demande un compte pour réagir).
- La Bodoni Moda n'a pas de trait d'union ASCII ni de demi-cadratin.
- Au déploiement : vérifier l'aperçu des liens partagés ; le jour du
  domaine définitif, changer `PROD_API` et les images Open Graph.
- Les Règles peignent parfois « Cadavre écrit » et « L'Encrier » du même
  crème (minuit, encre, argile) : décision d'identité en attente.
- **Le questionnaire d'âge d'Apple, et la décision 4+ ou 13+** : un modèle
  qui écrit du texte libre et des inconnus qui écrivent ensemble rendent le
  4+ fragile. C'est ce qui peut faire refuser la soumission.
- Faire relire `/conditions` par un juriste (§4, §11, §12) ; trancher
  fournisseur ou déployeur au sens de l'AI Act ; décider d'une mention de
  l'IA sur l'image partagée.

## Stack
- React + TypeScript + Vite + PWA (Vercel)
- Supabase (DB, Auth, Realtime, Storage)
- Claude API (voix IA), fal.ai (illustrations FLUX)
- Capacitor (iOS + Android natif)
- i18n maison : `tr(fr, en)` + `langueActuelle()` (`src/i18n/`)
- Tests : Vitest (879 tests unitaires) + Playwright (174 tests E2E, FR et EN)

## Branche de développement
`claude/cadavre-exquis-pwa-SlVtb` (= main)
