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
- [ ] **Voir un scellement réel** — il n'a encore jamais tourné. Premier
      passage attendu le 23 septembre à 00 h 30 UTC, sur les chaînes du 22
      (fr : 2 mains → 3 voix ; en : 0 main → 5 voix)

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
  l'atelier **comme en vers libre**, les deux structures où
  `reconstruirePoeme` joint les cases par des retours à la ligne. Le vers
  libre avait été oublié au premier passage : le recueil annonçait
  « 2 FRAGMENTS » pour un poème de deux vers, vu à l'écran pendant le lot 11. « fragment » plutôt que « case » :
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

## L'accord de la dislocation — `src/lib/accord.ts`, lot 15

Le vers que l'audit désigne comme le seul vraiment raté d'une séance de onze :
**« il devient givré la rue, lait »**. Ce n'est pas de l'étrangeté, c'est une
faute, et elle se lit comme un bug — le surréalisme repose sur une syntaxe
CORRECTE appliquée à des images impossibles.

Deux fautes structurelles, pas lexicales : la tête (« il devient ») est tirée
AVANT que le nom (« la rue ») existe, et la virgule de dislocation manque.

**La correction se fait à la couture**, seul endroit qui voit à la fois la
tête et le nom. Aucune consigne ne peut faire accorder « givré » à « la rue » :
celle qui écrit l'adjectif ne verra jamais le nom, c'est le principe du jeu.
`corrigerAccords` (le modèle, à la fin, si le réseau répond) reste en second
rideau.

**Ce module ne touche à rien quand il n'est pas sûr** : élision (« l'ombre »),
nom nu, adjectif hors règles, adjectif invariable — on laisse. Un accord
inventé est pire que l'accord manquant, parce qu'il est invisible à la
relecture.

Mesuré sur 200 vers par table et trois tailles de table, engendrés par les
vrais gabarits : **5 dislocations, 4 fautives avant, 0 après**, 1 non jugée.
Limite connue : l'adjectif APPOSÉ à un groupe nominal plus loin dans le vers
n'est pas accordé — il faudrait les rôles, pas le texte.

## Emporter le recueil — `src/lib/recueil.ts`, lot 20

**Le rapport se trompe** en écrivant que le poème « part chez Supabase » :
`sauvegarderPoeme` écrit dans Dexie et aucun appel n'envoie un poème au
serveur. Seules les publications en galerie y vont, et ce sont des copies. Sa
conclusion tient quand même, et elle est plus sévère : il n'existe **nulle
part** une seule copie de la bibliothèque.

Deux fichiers, parce qu'ils ne servent pas à la même chose — un `.txt`
lisible (le livrable) et un `.json` qui se relit (la sauvegarde). Sans le
second, l'export serait un souvenir et non une sauvegarde.

`restaurerRecueil` remet tout dans UNE transaction : une restauration
interrompue laisserait une bibliothèque à moitié écrasée.

**Le bouton REMETTRE s'affiche même quand la bibliothèque est vide** — c'est
le test qui l'a imposé. Il était d'abord conditionné à avoir des poèmes, si
bien qu'il disparaissait exactement quand on en a besoin : après avoir tout
perdu.

## La carte du Recueil — lot 11

Le rapport la désigne comme le point faible du produit, et la mesure lui
donne raison. Relevé avant :

    « le vernis · PHRASE ÉTOFFÉE · 5 voix · 14 SEPTEMBRE 2026 »

là où le poème dit « le vernis craquelé avale une lampe sourde ».

- **Le premier VERS et non le premier fragment.** `extraitPoeme` lisait
  `cases[0].texte` ; `premierVers` reconstruit le poème et en prend la
  première ligne. Un recueil où l'on ne reconnaît pas ses propres poèmes
  n'est pas un recueil.
- **La vignette de l'illustration**, quand elle existe seulement — une case
  grise en attente vaudrait moins que rien. `alt` vide : elle est
  décorative, le nom du poème est juste à côté.
- **« ⟡ COUTURES » sur chaque carte**, vers `?coutures` — un paramètre d'URL
  et non un état de navigation, pour qu'il survive au rechargement et se
  partage. Les coutures sont la meilleure page du produit et il fallait deux
  gestes pour y arriver.
- Deux boutons **côte à côte et non imbriqués** : un bouton dans un bouton
  n'est pas du HTML valide, et le clavier n'y arrive jamais.

## Le solde de l'encrier — lot 13

La réserve d'essai n'était lisible que dans les Réglages, écran qu'un joueur
n'ouvre pas avant de jouer. Il découvrait donc la limite **au moment du
refus**, ce qui fait passer un modèle annoncé pour un piège.

`src/components/SoldeEncrier.tsx` l'écrit là où la dépense se décide : sous
« Ouvrir la séance » à l'Atelier, avant le bouton de la table du cadavre
écrit, en tête du panneau IMAGE. Petites capitales, onze pixels — la voix de
la revue, pas une bannière. `src/lib/solde.ts` porte le libellé, à part,
parce qu'il se mesure.

**Trois silences, et ils comptent.** L'abonné ne voit rien — il n'y a rien à
compter. Le **registre muet** ne montre rien non plus : le principe tenu
partout est que la comptabilité injoignable laisse passer, et afficher un
chiffre qu'on n'a pas reçu reviendrait à l'inventer — il serait faux
exactement pour celui qui a déjà consommé. **Aucune identité encore** : la
réserve est intacte par définition, on l'annonce telle quelle, sans ouvrir
d'identité ni entamer l'essai.

Une séance « Seul » et une table sans voix n'affichent rien. La lecture
surréaliste d'un dessin non plus : elle se lance toute seule à l'arrivée, il
n'y a pas d'appui à précéder.

## La fiche d'installation — lot 18

Le manifeste n'avait ni `id`, ni `shortcuts`, ni `screenshots` : Android
n'affichait que l'invite minimale — une ligne et un bouton — pour une
application dont c'est le seul étalage.

- **`id: '/'`** — sans lui l'identité installée est déduite de `start_url`.
  Le jour où celle-ci changerait, le navigateur croirait à une AUTRE
  application et en proposerait une seconde, avec son propre stockage. Or
  toute la bibliothèque vit dans IndexedDB : le joueur retrouverait une app
  vide en croyant ouvrir la sienne. **Cette chaîne ne se change plus.**
- **Trois captures**, de vraies captures prises au 540 × 960, écartées du
  précache (`globIgnores`) — le service worker reste à 103 entrées. Android
  exige un **rapport constant** entre les captures étroites : une seule d'un
  autre format et il les écarte toutes, en silence. Le test le mesure.
- **Deux raccourcis** — le cadavre écrit et l'Atelier. Pas le mode en ligne :
  il exige un salon, donc un code, donc quelqu'un d'autre.
- **`overscroll-behavior: none`** sur `html, body`. Le rebond découvre le
  fond de la webvue, blanc sous WKWebView : une bande claire sur les
  ambiances sombres. On supprime le geste plutôt que de repeindre un fond qui
  se négocie entre trois couches. Le « tirer pour recharger » part avec, et
  c'est voulu — un geste de trop rechargeait la page, et un fragment saisi
  n'y survit pas. **Non reproduit** : il n'y a pas d'iOS dans l'environnement
  de travail, c'est le correctif standard et l'écran natif tranchera.

## Le poème du jour — une chaîne, une main, un vers

**UN seul poème par jour et par langue.** Chaque main qui passe y ajoute un
vers à la suite, en ne voyant que le **dernier mot** du vers précédent. À
minuit UTC la chaîne se scelle et se dévoile : on apprend alors de quoi on
faisait partie, et entre quelles mains le sort vous a mis.

**Une main, un vers, un jour.** C'est la règle entière.

### Deux modèles abandonnés avant celui-là

1. **Chacun son poème sur une amorce commune.** Ce n'était pas un cadavre
   exquis : chaque poème était écrit par une seule main qui voyait tout ce
   qu'elle écrivait. La porte d'entrée du jeu aurait été le seul mode qui
   n'est pas le jeu.
2. **Des poèmes à quatre sièges, en parallèle.** Défaut de fond : en fixant
   la TAILLE, on faisait du NOMBRE de poèmes la variable d'ajustement. À deux
   cents joueurs, « LE poème du jour » désignait trente-trois parties privées
   et le mot « le » mentait.

On inverse : **le poème n'a pas de taille, il grandit avec la foule.** Sa
longueur EST le nombre de gens venus — un joueur cinq vers, deux cents
joueurs deux cents vers. Rendements croissants : le poème à deux cents mains
ne pouvait pas exister à six.

### La première main reçoit l'amorce ENTIÈRE

Premier jet : l'écho valait `dernierMot(amorce)` même quand la chaîne était
vide, par symétrie avec les autres tours. « la cire » devenait « cire » — et
l'on jetait justement ce qui avait été donné. Une amorce n'est pas un vers
dont on prend la queue : c'est une graine, et une graine se donne entière.
Le déterminant en fait partie, il oriente le genre et le nombre de ce qui
suivra.

Les mains suivantes, elles, ne voient toujours qu'un mot.

### L'écho, et non l'aveuglement total

Voir le vers entier qui précède, c'est du **renga** : chacun répond, le texte
converge, il devient sage — Breton pliait le papier pour empêcher cela. Mais
l'aveuglement TOTAL sur deux cents vers donne un texte qui se disloque.
L'écho — le dernier mot seulement — est le régime que le jeu nomme déjà
(`visibilite: 'dernier-mot'`) : assez pour accrocher, pas assez pour diriger.

### L'aveuglement est tenu par les DROITS

Un vers ne se lit qu'une fois la chaîne scellée, ou s'il est le sien
(politique RLS). L'API ne renvoie qu'un mot. L'écran ne pourrait pas tricher
même s'il le voulait. **Ce n'est pas une politesse d'affichage, c'est le pli
du papier**, et il est posé à trois endroits.

### Ce que les voix font, et c'est peu

Elles complètent au **plancher de cinq vers, au scellement seulement**. Au-delà,
aucune voix n'intervient — la longueur doit rester la mesure de la journée.
**Cinq appels par langue et par jour au maximum, donc dix en tout**, et zéro
dès cinq joueurs dans chaque langue : **l'encrier n'est pas concerné**, le
rendez-vous ne décompte rien à personne. (On a longtemps écrit « quatre » :
le chiffre supposait qu'au moins une main humaine soit passée, et oubliait
qu'il y a une chaîne par langue. Une journée entièrement déserte en anglais
est l'état ordinaire d'un jeu qui commence.) Chaque voix reçoit
l'écho comme tout le monde ; une voix qui verrait le poème écrirait une chute.

### Le jour est UTC, et c'est une conséquence

Dès que les vers circulent, le jour LOCAL devient impossible : un joueur à
Lisbonne à 00 h 30 serait déjà sur la journée suivante et ne pourrait pas
s'asseoir à la même table qu'un joueur à Paris. Minuit UTC, soit 01 h ou 02 h
à Lamastre selon la saison. L'ambiance et la série, elles, restent locales.

### Où ça vit

- `api/_amorces.ts` — les 41 amorces, trois formes (déterminant + nom,
  + adjectif, + verbe) et le tirage en file. **Côté serveur** : une amorce
  calculée par le client serait une donnée que le client contrôle.
  Garde-raccord à 4 — à 1, la même amorce revenait parfois à deux jours
  d'écart (0,17 % des retours, deux fois l'an). Mesuré : min 5, médiane 41.
- `api/_jour.ts` · `api/jour.ts` — l'état, la pose d'un vers, la collision de
  rang tranchée par la base puis rejouée.
- `api/cleanup.ts` — le cron **quotidien**, à 00 h 30 UTC : il nettoie les
  salons expirés PUIS scelle les poèmes des jours écoulés. Ne scelle jamais
  le jour en cours. `portailOuvert` en garde la porte : sans secret elle
  n'ouvre plus **qu'en dehors de la production**, depuis que le scellement
  appelle le modèle. Le prix est assumé — tant que `CRON_SECRET` n'est pas
  posé chez Vercel, rien ne se scelle, et c'est une panne qui se voit.
- `src/lib/jourLogique.ts` — les règles côté client. **Elles sont en double
  avec le serveur, et c'est voulu** : le client anticipe pour refuser un vers
  de douze mots sans aller-retour, le serveur TRANCHE. Onze mesures tiennent
  les deux copies d'accord, parce qu'une duplication qui dérive serait pire
  qu'une duplication assumée.
- `src/lib/jour.ts` · `src/pages/PoemeDuJour.tsx` — le côté joueur.
- `supabase/migrations/20260917000010_cadavre_du_jour.sql` — **appliquée** le
  21 septembre 2026.

### L'amorce se donne entière — et la règle ne vit plus qu'à un endroit

La première main reçoit la graine complète, « la cire » et non « cire » ; les
suivantes ne voient qu'un mot. La règle était écrite **trois fois** côté
serveur, et la correction n'en avait touché qu'une : restaient la première
voix d'une journée déserte et le vers qui remplace un rang 1 retiré, qui
rendaient tous deux « cire ». `echoPour(amorce, versPrecedent)` la porte
désormais seule, et deux mesures la tiennent d'accord avec `echoDe` du client.

### Deux limites du plan Hobby, apprises à la dure

Elles ne se voient pas depuis l'application : le build échoue, et le
déploiement PRÉCÉDENT reste servi. Les anciennes routes répondent
normalement pendant que les nouvelles sont en 404, et rien ne dit qu'une
version d'il y a une semaine tourne. **Le seul endroit où la panne est
visible est le statut du commit sur GitHub.**

- **Un déclenchement de cron par jour.** Un `5 * * * *` est rejeté AVANT la
  construction : échec en six secondes, aucun log, et un lien générique vers
  la page de tarification au lieu d'un lien vers un déploiement.
- **Douze fonctions serverless par déploiement.** Le projet en comptait dix ;
  le poème du jour en ajoutait trois. C'est pourquoi le scellement vit dans
  `cleanup.ts` plutôt que dans sa propre route — deux travaux de fin de
  journée, un seul cron, aucun des deux ne répond à un joueur.

### Bornes du vers

Neuf mots au plus, cent caractères : c'est la borne que `GardeMetrique` tient
déjà à l'Atelier. Une main qui écrirait trois phrases écrirait le poème des
autres à leur place. `nettoyerVersDeVoix` impose la même aux voix — sinon la
chaîne serait injuste avant d'être belle.

### Le signalement descend au vers

Celui de la galerie porte sur une publication entière, qui appartient à son
auteur. Ici les vers circulent chez des inconnus : un vers déplacé entre dans
LE poème du jour, celui de tout le monde.

**Un vers retiré est REMPLACÉ, jamais effacé.** Un trou casserait les rangs,
et l'écho qu'a reçu la main suivante ne voudrait plus rien dire. Le vers
devient un vers de voix écrit sur le MÊME écho — la main d'après répondait à
ce mot-là, elle continue d'y répondre. Ce qui disparaît, c'est le lien vers
la personne : `main_id` et `pseudo` sont vidés.

**Deux signalements, et le premier part par courriel.** À un seul, n'importe
qui ferait tomber chaque vers du poème l'un après l'autre — une main par
vers, et « un signalement par main et par vers » n'y changerait rien. À
deux, il faut deux comptes d'accord.

On ne signale **jamais le sien** : ce serait un moyen de récrire le poème des
autres après coup. Ni celui d'une **voix** : elle n'a pas de main à protéger,
et un vers de voix qui déplaît est un défaut de gabarit, qui se corrige à la
source. `api/signaler-vers.ts`, table `jour_signalements`.

### Le rendez-vous est inscrit dans le tutoriel, à deux endroits

- **Les Règles** (`/aide`) portent une quatrième entrée, « Le poème du
  jour », à côté du cadavre écrit, du dessiné et de l'Atelier. Quatre
  points — une main un vers, l'amorce, l'écho, le scellement — et un bouton
  qui y mène.
- **Le dernier écran du guide** se refermait seul en 2,6 s. C'était bien tant
  qu'il ne disait qu'« au revoir » ; ça ne l'est plus depuis qu'il porte la
  seule chose qu'on veut qu'un joueur retienne. **Un message qui s'efface
  avant d'être lu n'est pas un message** : il attend maintenant un geste, et
  propose le poème du jour. C'est le moment où le joueur vient de finir
  quelque chose et cherche la suite.

### La notification du scellement — locale, et pourtant juste

Une notification locale est planifiée à l'avance : elle ne peut pas savoir
qu'un poème vient de se sceller, et le vrai push (FCM, APNs, déclencheur
serveur) est un chantier d'un autre ordre.

Mais on n'en a pas besoin pour dire la vérité. Au moment où une main pose son
vers, on sait deux choses avec certitude : que le poème se scellera à minuit
UTC, et à quel rang cette main y est entrée. L'annonce est donc planifiée au
**lendemain 9 h locales** — après le scellement, jamais avant. Neuf heures et
non minuit : le poème se ferme à 01 h ou 02 h à Lamastre, et on ne réveille
personne pour un poème.

Elle ne part qu'à qui a écrit, et **ne demande aucune autorisation** : un
joueur qui pose son premier vers n'a pas à recevoir une demande dans la
foulée. S'il a déjà armé le rappel du soir, il est d'accord ; sinon on se
tait. `annoncerScellement` dans `src/utils/notifications.ts`.

## Stack
- React + TypeScript + Vite + PWA (Vercel)
- Supabase (DB, Auth, Realtime, Storage)
- Claude API (voix IA), fal.ai (illustrations FLUX)
- Capacitor (iOS + Android natif)
- i18n maison : `tr(fr, en)` + `langueActuelle()` (`src/i18n/`)
- Tests : Vitest (420 tests unitaires) + Playwright (58 tests E2E, FR et EN)

## Branche de développement
`claude/cadavre-exquis-pwa-SlVtb` (= main)
