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
- [ ] `prefers-reduced-motion` : le dévoilement du poème l'honore (et le plantage
      de la page de fin est corrigé), mais les autres animations framer-motion
      ne le lisent toujours pas
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

## Le carnet — la récolte

Un recueil n'est pas vingt poèmes générés : c'est trois cents vers récoltés
puis assemblés à la main. Le moteur produisait dix-huit vers gardables par
séance et il n'existait aucun moyen de les garder.

- `◇ GARDER` sous chaque ligne des coutures, en fin de partie et dans la
  bibliothèque (`src/components/BoutonRecolte.tsx`).
- `/recolte` — le carnet : les vers de toutes les séances, réordonnables à la
  flèche, avec leur provenance, copiables et exportables en `.txt`.
- Table Dexie `recolte` (version 4), API dans `src/db/index.ts`. L'ordre est
  celui du médium, pas celui des dates : un recueil se compose.

L'entrée n'apparaît dans la bibliothèque que si le carnet contient quelque
chose — un carnet vide n'est pas une invitation, c'est un reproche.

## Le dévoilement — le dépli et l'encre

L'ancienne révélation tenait dans une ligne : `delay: 0.3 + i * 0.55`. Chaque
vers attendait la même chose, qu'il fasse un mot ou dix. Sur le poème d'atelier
à trente-sept vers, le dernier apparaissait à **20,1 s**, après 4,8 s
d'assemblage qu'on ne pouvait pas interrompre. Ce n'était pas une animation,
c'était une attente.

- **Le dépli** (`src/components/Depli.tsx`) — le feuillet est plié en volets,
  jusqu'à cinq, charnière en haut, `rotateX(-92°)` qui tombe à plat. Un volet
  par vers quand le poème est court : c'est exactement le pliage d'origine d'un
  cadavre exquis à trois ou quatre mains. La pliure SUBSISTE, faible, une fois
  le poème posé — le feuillet garde la marque d'avoir été plié.
- **L'encre** (`src/components/VersEncre.tsx`) — le vers n'apparaît plus en
  fondu : un masque le découvre mot après mot, à la vitesse d'une main. Par mot
  et jamais par lettre (mille nœuds animés tueraient un vieil iPhone).
- **La partition** (`src/lib/rythme.ts`) — le seul module qui se mesure. Le
  souffle du vers décide de son temps : `metrique.ts` compte ses mots, un vers
  court tombe vite et laisse un silence, un vers long se déroule.
  **Le plancher est un temps absolu, jamais un ratio** : un mot ne paraît
  jamais en moins de 58 ms, quelle que soit la longueur du poème. Première
  version : le plancher était en ratio (22 % de la vitesse naturelle), ce qui
  donnait 25 ms par mot sur un poème d'atelier — un clignotement, pas une
  écriture.
- **On n'anime que ce qu'on regarde** (`VERS_ANIMES = 9`). Un vers lisible
  coûte au moins un tiers de seconde ; trente-sept vers lisibles coûtent vingt
  à vingt-cinq secondes, quoi qu'on règle. Or l'écran d'un téléphone en montre
  neuf. La tête reçoit le rythme entier ; le reste du poème est porté par un
  dernier volet qui s'ouvre sur un texte déjà écrit — ce que fait une vraie
  feuille qu'on déplie. **Toute longueur tient donc en 10,7 s**, à 128–145 ms
  par mot.
- **Toute séquence est interruptible** : un appui n'importe où pose le poème
  entier. Une belle animation qu'on subit une deuxième fois est pire qu'une
  animation bancale.

`src/components/PoemeDevoile.tsx` compose le tout ; `FinDePartie` et
`FinOnline` l'appellent. Rien n'a été ajouté aux dépendances — framer-motion
était déjà là, c'était un manque de dessin, pas de librairie.

**Corrigé au passage, et c'était un plantage :** sous
`prefers-reduced-motion: reduce`, `RevealAssemblageTexte` calculait une durée
négative au treizième fragment et l'API Web Animations refusait. La page de fin
plantait entièrement — personne ne l'avait ouverte avec le réglage actif.

## Les polices — auto-hébergées depuis le 11 septembre 2026

Toute la typographie venait de `fonts.googleapis.com` par un `<link>`.
Pendant l'audit du 10 septembre ce chargement a échoué et `document.fonts`
est resté **vide** : l'app est tombée en police système, identité comprise.
Sur une PWA installable, hors ligne ou en réseau dégradé, c'est l'état normal
du jeu dans un train.

- **Trois familles au maximum, et c'est une règle** — Bodoni Moda, Playfair
  Display, Raleway. En fontes **variables**, sous-ensembles `latin` +
  `latin-ext` : 12 fichiers, 428 Ko dans `public/fonts/`. En statique il en
  aurait fallu quinze pour les mêmes graisses.
  `src/__tests__/polices.test.ts` tient le plafond : une quatrième famille
  se glisse vite, et sur une PWA chaque famille est précachée pour toujours.
- **Caveat retirée le 12 septembre.** Une seule occurrence dans tout le
  dépôt — le « № 477 » griffonné sur le collage MERZ — pour 102 Ko, soit un
  cinquième du poids typographique. Remplacée par Playfair en italique, qui
  écrit déjà tout le reste de ce collage. L'alias Tailwind `caveat` n'était
  employé nulle part.
- `src/polices.css` — les `@font-face`, `font-display: swap`, les
  `unicode-range` de Google inchangés.
- Précachées par le service worker (`globPatterns` contenait déjà `woff2`) :
  101 entrées au lieu de 86.
- La règle `runtimeCaching` vers Google est retirée — elle n'avait plus
  d'objet.
- **Effet de bord qui compte** : un `<link>` vers Google transmettait l'IP du
  joueur à chaque chargement, sous un écran de Réglages affichant « AUCUN
  TRACKING · AUCUNE DONNÉE VENDUE ». La promesse cesse d'être contredite.

`Fraunces` n'a jamais été chargée : `tailwind.config.js` l'aliase sur Bodoni
Moda. Rien ne manquait, mais le nom trompe à la lecture.

## Le clavier logiciel — `src/lib/clavier.ts`

Les champs de saisie n'avaient aucun attribut de contrôle du clavier. Sur
iOS, l'absence d'`autocapitalize` vaut `sentences` : chaque fragment saisi
commençait par une majuscule. Or un fragment est presque toujours un MILIEU
de vers — d'où les « Vacille », « Calcaire », « La cire durcit » plantés au
milieu d'une phrase dans toute la galerie de production.

Deux régimes, parce qu'il y a deux gestes :

| | `autocapitalize` | `autocorrect` | `enterkeyhint` |
|---|---|---|---|
| `CLAVIER_FRAGMENT` — un morceau de vers | `none` | `off` | `done` |
| `CLAVIER_VERS` — une phrase entière | `sentences` | `off` | `send` |

Quatre champs les emploient : la case du cadavre écrit (`Jeu`), celle du
salon (`JeuOnline`), le fragment et le vers entier de l'atelier
(`JeuAtelier`). `spellcheck` reste actif — souligner une faute est utile, la
corriger sans demander ne l'est pas. **La taille de 20 px ne se touche
pas** : sous 16, iOS zoome à la mise au point.

## Le vocabulaire — « voix » ne compte plus les cases

L'audit disait que « voix » désignait trois choses. Vérifié : **deux**. Le
cadavre écrit convoque les mêmes quarante-six personas que l'atelier
(`Jeu.tsx` importe `VOICE_IDS`), donc « VOIX IA », « la voix écrit en
secret », « SCELLER CETTE VOIX » et « voix 2 · L'horloger » sont tous justes
et **restent**. Seul le COMPTE mentait — « 5 VOIX » sur une partie jouée
seul, où il n'y a qu'une main.

- `libelleMorceaux(structureId, n)` — « 5 FRAGMENTS », et « 11 VERS » à
  l'atelier où une case est un vers entier. « fragment » plutôt que « case » :
  c'est le mot de l'écran d'entrée et du champ de saisie.
- `libelleMains(n)` — « 4 MAINS » pour de vraies personnes, dans un salon.
  « main » est déjà le mot maison : « la main te revient ».
- Le second compte de la bibliothèque est **retiré** : il additionnait les
  cases de tous les poèmes, or une case d'atelier est un vers. Aucun mot
  n'était vrai pour les deux.
- `RevealAssemblageTexte` exige désormais son `libelle` : seul l'appelant
  sait ce qu'il compte, et le repli permettait de l'oublier.

Corrigé au passage : le recueil affichait « 11 VOIX » pour un poème
d'atelier là où la fin de partie affichait « 11 VERS ».

## Le tactile et le décor — lots 7 et 8 de l'audit

**Aucune cible sous 44 px.** La classe est posée GLOBALEMENT sur
`button, a[href], [role=button]` dans `src/index.css` : énumérer les fautifs
les corrigeait aujourd'hui, la règle les corrige aussi demain. Un
pseudo-élément centré, étiré au plus grand des deux — la taille réelle ou
44 px — reçoit les appuis sans rien déplacer dans le flux. Les dix écrans
ont été capturés avant/après avec un tirage d'ambiance fixé : pas un pixel
de déplacé. `e2e/cibles-tactiles.spec.ts` mesure la zone d'appui réelle,
pseudo-élément compris.

**La vignette d'ambiance cède la place** (`useEcarterDuTexte`, `Decor.tsx`).
Elle garde son placement libre — c'est lui qui fait qu'aucun écran ne
ressemble au précédent — et perd seulement le droit de mordre : elle mesure
ce qu'elle recouvre et se décale en spirale jusqu'au premier emplacement
libre. Deux pièges rencontrés, tous deux écrits dans le code :
- un `MutationObserver` est nécessaire — le décor se monte avant le contenu,
  et à l'Atelier le champ est remonté à chaque tour ;
- la mesure doit geler la transition de 450 ms, sinon effacer le décalage
  lance une animation et l'on mesure une cible en mouvement.

**Le lot 6 (fondus) n'a pas été fait, et c'est délibéré.** Mesuré : le bouton
d'action est utilisable en 0 à 313 ms sur les cinq écrans (accueil 313,
préparatifs 44, atelier 0, en jeu 15, acte I 29). Les « 4 à 6 secondes » du
rapport ne se reproduisent pas ; les cascades décoratives se jouent derrière
un contenu déjà lisible.

## L'ambiance, le passage, la promesse — lots 12, 10 et 14

**L'ambiance tient à la journée** (`CLE_AMBIANCE`, `reve/Decor.tsx`). Elle
était retirée à chaque rechargement — mesuré N° 935 puis N° 767 — sous un
écran de Réglages qui annonce « Chaque jour, une ambiance est tirée au
sort ». La graine est stockée avec SON JOUR (local, comme la série) et n'est
retirée que si le jour a changé. « Nouvelle ambiance » réécrit les deux, si
bien qu'un tirage volontaire tient jusqu'au lendemain.

**Plus d'écran de passage en solo** (`RIDEAU_SOLO`, `Jeu.tsx`). L'écran
« Joueur 1. — C'EST PARTI → » s'intercalait avant chaque acte même à une
seule main : quatre tapes inutiles par partie. Le rideau reste — la
respiration entre les actes fait partie du rythme — mais il annonce
« Acte III. », trace un trait qui se remplit, et se lève seul en 1,1 s. À
plusieurs il attend toujours le geste : c'est lui qui garantit qu'on ne voit
pas la case du voisin.

**La promesse d'anonymat ne se contredit plus.** « tu ne sauras jamais
lesquelles parlent » devient « leurs noms ne te seront rendus qu'au dernier
vers » — les COUTURES cessent d'être un démenti pour devenir la récompense
annoncée.

## L'accessibilité — `src/lib/a11y.ts`, lots 17 et 16

Relevé le 12 septembre sur six écrans : **zéro** groupe sémantique dans toute
l'application, et cinq boutons sans aucun nom. Les sélecteurs étaient des
suites de `<button>` dont l'un est teinté — à l'œil on voit lequel est
choisi, au lecteur d'écran on entend sept boutons sans rapport.

- `groupeRadio()` / `optionRadio()` — sept sélecteurs les emploient :
  structure, visibilité (écrit, atelier, dessin), mode, validation, outils et
  tailles du studio. `role="radio"` et non `aria-pressed` : un bouton pressé
  est un interrupteur indépendant, une radio appartient à un groupe où l'on
  ne choisit qu'une chose. Le lecteur annonce « 2 sur 3 » au lieu de
  « activé ».
- `zoneVivante` — le compteur `VERS VII / XI` et « LES VOIX ÉCRIVENT ».
  C'était la seule chose qui disait qu'un tour était passé, et elle ne le
  disait à personne.
- Les cinq boutons muets étaient les **tailles de trait** du studio, pas les
  outils : ceux-là portaient déjà un `title`. Ils ont maintenant les deux.
- `:focus-visible` était **déjà** traité (`index.css`) — rien à faire.

**Lot 16 · la prémisse du rapport est fausse.** Les trois libellés PARTAGER /
COUTURES / IMAGE sont déjà exclusifs : un seul `activeSection` les gouverne,
ouvrir IMAGE ferme COUTURES. Et `role="tablist"` serait un mensonge d'un
autre genre — PARTAGER est une action, pas un onglet. Ce qui manquait
vraiment : `aria-controls`, pour que `aria-expanded` dise enfin QUOI s'ouvre.

## Stack
- React + TypeScript + Vite + PWA (Vercel)
- Supabase (DB, Auth, Realtime, Storage)
- Claude API (voix IA), fal.ai (illustrations FLUX)
- Capacitor (iOS + Android natif)
- i18n maison : `tr(fr, en)` + `langueActuelle()` (`src/i18n/`)
- Tests : Vitest (338 tests unitaires) + Playwright (44 tests E2E, FR et EN)

## Branche de développement
`claude/cadavre-exquis-pwa-SlVtb` (= main)
