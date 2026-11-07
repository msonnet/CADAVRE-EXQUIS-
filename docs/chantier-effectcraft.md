# Le chantier EffectCraft — arrêté le 7 novembre 2026

> **Suspendu le 7 novembre au soir, à la demande de l'auteur.** La couture
> (étape 2) a été posée, jugée amateur et retirée. Les animations de ce
> document ne se font plus sans direction artistique validée d'abord —
> voir « Où en est le chantier », en fin de document. Le cadre technique
> (étape 1) reste en place et sert à la suite.

Ce document se suit dans une session Claude Code **sur l'ordinateur de
l'auteur**, là où EffectCraft et PhotoCraft sont connectés (serveurs MCP
d'ArtCraft). Une session dans le cloud ne les voit pas.

## Les décisions de l'auteur

| question | choix |
|---|---|
| où travailler | sur son ordinateur, avec les connexions ArtCraft |
| ce que montre l'ouverture | **l'Œil cousu**, et non plus l'étoile ✦ |
| le motif des attentes | **la couture** : une aiguille tire un fil et pose un point, puis le suivant |
| le périmètre de ce lot | l'ouverture, les attentes courtes et longues, le sceau au recueil, l'encrier qui se remplit |
| hors de ce lot | les titres de la vidéo App Store (lot suivant, avec FilmCraft) |

**Aucun son** n'accompagne ces animations : la règle de `CLAUDE.md` tient
(« ne pas réintroduire de son sans l'accord de l'auteur »).

## Le constat, mesuré le 7 novembre

- **L'ouverture ne montre pas la marque.** iOS affiche l'Œil cousu sur noir
  pendant 800 ms (`capacitor.config.ts`, `launchShowDuration`), puis
  `SplashScreen.tsx` passe au fond de l'ambiance et fait éclore une étoile
  ✦. L'Œil n'est jamais animé, et le passage de l'un à l'autre est une
  coupe.
- **Toutes les attentes sont la même étoile qui bat.** 34 boucles
  d'animation (`repeat: Infinity`) dans 17 fichiers. Dix-huit sont des
  attentes et partent dans ce lot ; douze sont des invitations, des signes
  ou des états, et restent (liste plus bas). Une première estimation
  disait « environ vingt-cinq attentes » : c'était faux, le compte exact est
  dix-huit.
- **Les longues attentes** — l'illustration (10 à 20 s), la reconstitution
  du dessin, la voix qui écrit (jusqu'à 12 s) — n'ont rien de plus que les
  courtes : trois points, ou « … » qui clignote.
- **Les deux moments de récompense sont muets** : le poème qu'on scelle au
  recueil, l'encrier qu'on vient de remplir.

## Avant de commencer, sur l'ordinateur

```bash
git clone https://github.com/msonnet/CADAVRE-EXQUIS-.git   # ou git pull
git checkout claude/cadavre-exquis-pwa-SlVtb
npm ci
npx playwright install chromium     # en local, le téléchargement est permis
npm run build && npx vitest run && npx playwright test
```

Les 803 mesures unitaires et les 159 parcours doivent passer avant la
première ligne. Puis vérifier dans Claude Code (`/mcp`) que les serveurs
d'**EffectCraft** et de **PhotoCraft** répondent.

## Le cadre technique — posé une fois, avant la première animation

1. **Le lecteur.** `lottie-web@5.13.0`, importé par
   `lottie-web/build/player/lottie_light` : rendu SVG, sans expressions.
   Mesuré sur 5.12.2 : 168 Ko, **46 Ko compressés** (le lecteur complet en
   fait 76). Import **dynamique**, au premier affichage d'une animation :
   rien ne s'ajoute au chargement de l'accueil.
2. **Les couleurs repères.** Une animation ne porte jamais une couleur
   d'ambiance : elle porte trois repères, remplacés au chargement.

   | repère | valeur dans EffectCraft | remplacé par |
   |---|---|---|
   | accent | `#FF0000` | `seance.colorSchema.hex` |
   | encre | `#00FF00` | `seance.colorSchema.encre` |
   | papier | `#0000FF` | `seance.ambiance.bg` |

   Lottie écrit les couleurs en fractions de 0 à 1 : on compare à 1/255
   près. Seuls les aplats et les traits (`fl`, `st`) se recolorent ; les
   **dégradés (`gf`, `gs`) sont interdits**, ils ne se recolorent pas
   simplement. Seule exception : l'Œil de l'ouverture, qui garde ses
   couleurs (c'est la marque, crème et vermillon sur noir).
3. **Le composant** `src/components/Animation.tsx` :
   - `nom` (fichier de `public/animations/`), `boucle`, `taille`,
     `onFin`, `repli` (ce qui s'affiche pendant le chargement ou en cas
     d'échec : l'étoile d'aujourd'hui, pour qu'une panne ne laisse jamais
     un trou) ;
   - `etiquette` : nom pour le lecteur d'écran quand l'animation est seule
     (« Chargement… ») ; `aria-hidden` quand un texte voisin dit déjà ce
     qui se passe ;
   - les **segments** se lisent dans les repères de composition exportés
     par EffectCraft (`boucle`, `noeud`, `sec`, `remplir`, `plein`,
     `pose`) ;
   - **`prefers-reduced-motion`** : l'animation s'arrête sur son repère
     `pose`, une image fixe ;
   - pause quand la page est cachée, `destroy()` au démontage.
4. **Hors ligne.** `vite.config.ts` ne précache pas le JSON
   (`globPatterns` s'arrête à `png,svg,woff2,mp3…`). Ajouter
   `animations/*.json`, sinon le jeu dans le train retombe sur le repli.
5. **Les sources entrent au dépôt.** Les projets EffectCraft (`.ecproj`,
   du JSON versionné) dans `animations/`, les exports dans
   `public/animations/`. Export : commande `file.exportLottie`, expressions
   **désactivées** (le lecteur léger ne les lit pas). La liste
   d'avertissements que rend l'export doit être **vide**.
6. **Les mesures** (`src/__tests__/animations.test.ts`), sur chaque fichier
   de `public/animations/` :
   - il se lit, 30 images/s, aucune expression ;
   - aucune couleur hors des trois repères (sauf l'Œil) ;
   - les repères de segments attendus existent, dont `pose` ;
   - un plafond de poids : couture 15 Ko, couture longue 40 Ko, sceau
     30 Ko, encrier 40 Ko, Œil 200 Ko.

   Et un parcours (`e2e/animations.spec.ts`) : l'ouverture montre l'Œil ;
   chaque attente monte `Animation` ; sous mouvement réduit rien ne tourne ;
   la couleur du fil, relue dans le SVG, est l'accent de l'ambiance — sur
   une ambiance claire, une sombre et le kraft, à 320 et à 390 points.

## Les cinq animations

### 1. L'ouverture — `oeil-cousu.json`

- **Où** : `src/components/SplashScreen.tsx`. Remplace l'étoile ✦ et le
  halo ; la phrase « Chaque fragment ignore les autres. » et son écriture
  lettre à lettre restent.
- **La continuité avec l'écran natif.** `resources/splash.png` fait
  2732 × 2732, fond noir, l'Œil centré, **927 px de diamètre, soit 33,9 %
  du côté** (mesuré). La première image de l'animation doit être cette
  image-là, au même endroit et à la même taille à l'écran, sur fond noir —
  sinon le passage reste une coupe. iOS remplit l'écran avec l'image
  carrée : sur un iPhone en portrait, l'Œil vaut donc 33,9 % de la
  **hauteur** d'écran. **À vérifier sur l'iPhone** avant de figer la
  taille. Android 12 et plus montre l'icône, pas cette image : là, on part
  de l'Œil seul.
- **La séquence**, dans les 4,2 s actuelles (3 s par un lien partagé) :
  - 0 – 0,4 s : l'image du natif, immobile ;
  - 0,4 – 1,6 s : les rayons se cousent un à un, un fil crème passe de
    l'un à l'autre ;
  - 1,6 – 2,2 s : l'Œil cligne et s'ouvre ;
  - 2,2 – 2,8 s : le noir cède à la couleur de l'ambiance — **dans le
    code**, pas dans l'animation, puisque la couleur change chaque jour — et
    l'Œil remonte pour laisser la phrase s'écrire.

  Un toucher abrège, comme aujourd'hui. Sous mouvement réduit : l'Œil fixe,
  puis la phrase.
- **La matière.** L'Œil n'existe qu'en gravure raster (`resources/icon.png`,
  1024 px) : aucun fichier vectoriel dans le dépôt. Dans PhotoCraft, le
  découper en calques **PNG** : le blanc de l'œil et l'iris, la paupière
  haute, la paupière basse. Le cercle et les rayons se **redessinent** en
  calques de forme dans EffectCraft (des traits et des points d'épine) :
  c'est ce qui permet de les coudre, par des tracés progressifs (`tm`, que
  l'export Lottie d'EffectCraft prend en charge).

### 2. L'attente courte — `couture.json`

- **Motif** : l'aiguille descend, remonte, le fil pose un point ; la
  couture avance d'un point et recommence, sans à-coup à la reprise.
  Boucle de 1,2 à 1,6 s. Format 3:1 (une couture est horizontale), 28 px
  de haut là où l'étoile en faisait 20 à 24.
- **Couleurs** : fil = accent, aiguille = encre.
- **Repères** : `boucle` ; `pose` = un point noué, immobile.
- **Les douze endroits** :

  | fichier | ligne | attente |
  |---|---|---|
  | `src/pages/Bibliotheque.tsx` | 315 | le recueil se charge |
  | `src/pages/Galerie.tsx` | 649 | la galerie se charge |
  | `src/pages/Galerie.tsx` | 797 | « Charger plus », dans le bouton — encre = `btnText` |
  | `src/pages/PoemeDetail.tsx` | 252 | le feuillet se charge |
  | `src/pages/DessinDetail.tsx` | 141 | le dessin se charge |
  | `src/pages/Profil.tsx` | 177 | le profil se charge |
  | `src/pages/ProfilPublic.tsx` | 204 | la page d'un auteur se charge |
  | `src/pages/PoemeDuJour.tsx` | 417 | le registre du jour répond |
  | `src/pages/Jeu.tsx` | 814 | la partie s'achève, avant la fin de partie |
  | `src/pages/JeuOnline.tsx` | 540 | « En attente de Mireille… » |
  | `src/pages/JeuOnline.tsx` | 622 | « En attente des autres joueurs… » |
  | `src/pages/JeuOnline.tsx` | 720 | « C'est au tour de… », « En attente de la partie… » |

### 3. L'attente longue — `couture-longue.json`

- **Motif** : la même couture, mais sur toute une ligne, point par point —
  seize points en douze secondes environ, **sans boucle visible** avant la
  fin ; ensuite l'aiguille reste suspendue et bat doucement. Une boucle
  d'une seconde, regardée quinze secondes, finit par agacer. Format 5:1.
- **Quand le résultat arrive**, la couture se termine en 0,3 s (segment
  `noeud`) avant de laisser place — c'est ce qui donne le sentiment que
  l'attente a produit quelque chose.
- **Repères** : `boucle`, `noeud`, `pose`.
- **Les six endroits** :

  | fichier | ligne | attente |
  |---|---|---|
  | `src/pages/FinDePartie.tsx` | 776 | l'illustration, « … EN COURS » |
  | `src/pages/FinOnline.tsx` | 771 | l'illustration au salon |
  | `src/pages/FinDessin.tsx` | 274 et 279 | « Le cadavre se reconstitue… » |
  | `src/pages/FinOnline.tsx` | 554 et 557 | la même, au salon |
  | `src/pages/Jeu.tsx` | 1014 et 1034 | la voix écrit — le mot « écrit » reste, ses points partent ; la ligne 1053 (l'étoile une fois le fragment déposé) devient le repère `pose` : le point est noué |
  | `src/components/RevealDessin.tsx` | 175 | « — LA LECTURE SE FAIT — » |

### 4. Le sceau — `sceau.json`

- **Où** : `src/pages/FinDePartie.tsx`, ligne 829, « Sceller au recueil ».
  Le poème est déjà au recueil ; le bouton ne faisait que mener à la
  bibliothèque. Le cachet se pose sur l'angle de la carte, **puis** on
  navigue.
- **Séquence, 0,9 s au plus** : le cachet descend (0,25 s), frappe — la
  cire s'écrase et s'étale —, se pose (0,6 s). L'empreinte est un Œil
  simplifié en traits. Un toucher abrège. Sous mouvement réduit : le cachet
  posé, fixe, 300 ms.
- **Couleurs** : cire = accent, empreinte = encre.
- **Repères** : `frappe`, `pose`.

### 5. L'encrier — `encrier.json`

- **Où** : `src/components/MurAbonnement.tsx`, sous le titre « — L'ENCRIER —
  » (ligne 199). Le même panneau s'ouvre depuis les Réglages (« REMPLIR
  L'ENCRIER », `src/pages/Reglages.tsx` ligne 267) et depuis six refus
  (`Configuration`, `Atelier`, `FinDePartie`, `FinDessin`, `FinOnline`,
  `JeuOnline`).
- **États** : `sec` quand le panneau s'ouvre sur un refus (un cerne d'encre
  séchée au fond) ; `plein` quand on vient le remplir de soi-même.
- **Le remplissage** : sur un achat réussi — les trois appels à
  `onEncrierRempli()`, lignes 107, 153 et 164 — une goutte tombe, l'encre
  monte (segment `remplir`, 1,2 s), **puis** `onEncrierRempli()`. Pas plus
  de 1,2 s ajoutées au parcours d'achat ; un toucher abrège.
- **Couleurs** : encre = encre ; verre = encre, à 40 % d'opacité ; reflet
  = papier.

## Ce qui ne bouge pas, et pourquoi

Douze boucles restent, parce qu'elles ne sont pas des attentes :

| fichier | ligne | ce que c'est |
|---|---|---|
| `src/pages/Jeu.tsx` | 1133 | « TOUCHER POUR CONTINUER » — une invitation |
| `src/pages/JeuOnline.tsx` | 468, 637 | « TOUCHER POUR COMMENCER » — une invitation |
| `src/components/RevealDessin.tsx` | 189 | l'invitation à poursuivre |
| `src/pages/JeuOnline.tsx` | 471, 640 | l'étoile de l'écran « À toi » — un ornement |
| `src/pages/Configuration.tsx` | 357 | l'étoile d'un siège de voix — ✦ est le signe des voix |
| `src/pages/Online.tsx` | 412 | le témoin de connexion — un état |
| `src/components/TutorielCoach.tsx` | 40, 127 | le point d'étape et la flèche du guide |
| `src/pages/JeuAtelier.tsx` | 1554, 1715 | les « … » de chaque voix à l'Atelier — une couture par ligne serait une foule |

Et quatre choses restent **dans le code**, volontairement : le dépli
(`Depli.tsx`), la bande rabattue (`Rabat.tsx`), l'encre des vers
(`VersEncre.tsx`) et les vignettes du décor (`reve/collages.tsx`). Les
trois premières portent un texte qui change à chaque partie, sont
chronométrées, interruptibles et lues au lecteur d'écran — une animation
figée ne sait rien de tout cela. Les vignettes relèvent d'abord de
VectorCraft.

## La méthode dans EffectCraft

1. Une composition par animation, 30 images/s, fond transparent.
2. Calques de forme seulement — sauf l'Œil et ses PNG. Ni effets, ni
   styles de calque, ni modes de fusion, ni 3D : Lottie ne les porte pas,
   et l'export le dit dans ses avertissements.
3. Les tracés du fil par `tm` (tracé progressif), les répétitions par `rp`.
4. Repères de composition aux noms ci-dessus : le composant les lit.
5. Export Lottie, expressions désactivées, avertissements vides.
6. Regarder chaque animation **dans le jeu**, pas seulement dans
   EffectCraft : trois ambiances (une claire, une sombre, le kraft), 320
   et 390 points, et mouvement réduit.

## L'ordre de travail

1. Le cadre technique et ses mesures, avec une animation d'essai minimale.
2. `couture.json`, posée aux douze endroits — c'est le geste qu'on voit le
   plus souvent, il fixe le style des autres.
3. `couture-longue.json`, aux six endroits.
4. `oeil-cousu.json` et l'ouverture — la plus délicate (découpage dans
   PhotoCraft, continuité avec l'écran natif, vérification sur l'iPhone).
5. `sceau.json`, puis `encrier.json`.

À chaque étape : `npm run build` (les parcours lisent `dist/`), les deux
suites, un commit, un push sur `claude/cadavre-exquis-pwa-SlVtb` et sur
`main`. **Critère de fin du lot** : 34 boucles avant, 12 après — exactement
celles du tableau « Ce qui ne bouge pas ». (Un `grep` en trouve 35 : la
trente-cinquième est dans un commentaire de `RevealDessin.tsx`, ligne 170.)

## Où en est le chantier

### Étape 1 — le cadre technique, 7 novembre

Fait sur l'ordinateur de l'auteur, EffectCraft 0.22.0 et PhotoCraft
connectés.

- **`src/lib/animation.ts`** : tout ce qui se calcule sans écran — la
  recoloration des repères (une copie, jamais l'original : `lottie-web`
  annote les données, et le JSON est partagé par toutes les instances), la
  lecture des repères de composition (nom nu ou enveloppé en JSON), le
  segment à jouer, l'image de pose, les proportions.
- **`src/components/Animation.tsx`** : `nom`, `boucle`, `segment`, `taille`
  (la hauteur), `largeur`, `onFin`, `repli`, `etiquette`, et deux réglages
  ajoutés pour les étapes suivantes — `couleurs` (remplacer une teinte : le
  bouton « Charger plus » veut encre = `btnText`) et `couleursPropres`
  (l'Œil). Un nom de segment inconnu joue le tout plutôt que rien. Sous
  mouvement réduit : la pose, et `onFin` 300 ms après. Pause quand la page
  se cache, `destroy()` au démontage. `data-animation` et `data-etat`
  (`chargement`, `pret`, `echec`) servent aux parcours.
- **Le repli par défaut est une étoile FIXE**, pas l'étoile qui bat : une
  boucle `repeat: Infinity` cachée dans le repli ferait mentir le critère
  de fin (34 → 12).
- **`vite.config.ts`** précache `animations/*.json` (le dossier seul).
- **`src/__tests__/animations.test.ts`** : la logique, puis chaque fichier de
  `public/animations/` — déclaré dans `ATTENDUS` (repères et plafond ; les
  cinq animations du lot y sont déjà), source `.ecproj` au dépôt, 30 im/s,
  ni expression, ni dégradé, ni effet, style, fusion ou 3D, calques de forme
  seulement (l'Œil a droit à ses PNG, embarqués), couleurs repères
  seulement, `pose` dans la durée. Plus deux gardes : le précache, et aucun
  import statique de `lottie-web` dans `src/`. Vérifié en y glissant un
  faux fichier : six alertes.
- **L'animation d'essai** est `essai.json` (aiguille, fil, un point ; 2,3 Ko).
  Réexportée depuis `animations/essai.ecproj` : identique à l'octet,
  avertissements vides. Elle reste tant qu'aucune autre n'est au dépôt —
  la retirer avec la couture, et sa ligne d'`ATTENDUS` avec elle.
- **Vu dans un navigateur** (page d'essai jetable) : le fil prend l'accent,
  l'aiguille l'encre, le chas le papier, sur Lin écru, Minuit profond et le
  kraft ; un fichier absent laisse l'étoile ; la boucle tourne, l'animation à
  fin rend la main ; sous mouvement réduit, rien ne bouge.
- **Reporté à l'étape 2, volontairement** : le parcours
  `e2e/animations.spec.ts`. Tant qu'aucun écran ne monte `Animation`, il
  n'a rien à lire ; il naît avec la première couture posée. Pour la même
  raison, le poids du lecteur dans `dist/` ne se mesure qu'alors : Vite
  n'embarque pas un composant que personne n'importe.
- **Deux mesures réparées en passant**, qui ne tenaient que dans le cloud :
  `telephone.test.ts` (sous macOS, le dossier temporaire passe par un lien
  vers `/private`, et le chemin relatif donné à `tar` remontait d'un cran
  de trop peu) ; `table-locale.spec.ts` (« — NE PAS LA DÉRANGER — » : la
  voix est tirée au sort, et le fossoyeur dit « LE » — un échec sur deux).

### Étape 2 — la couture, posée puis retirée, 7 novembre

Posée aux douze attentes courtes (commit `2c49bb5`), déployée, puis
**retirée le soir même à la demande de l'auteur** (annulation de ce
commit) : « on ne comprend pas que c'est une couture, on ne voit pas la
formation du nœud ». L'étoile qui bat est revenue aux douze endroits ;
l'animation d'essai aussi, pour les mesures du cadre.

Ce qui n'allait pas, et qu'il ne faut pas refaire :
- dessinée **sans référence**, en formes géométriques (des tirets, un trait
  penché pour l'aiguille), à 28 px : le geste n'était pas lisible ;
- le nœud **apparaissait** à la pose au lieu de se former ;
- **intégrée avant d'être montrée** : l'auteur l'a découverte en ligne.

La source reste dans l'historique (`animations/couture.ecproj` au commit
`2c49bb5`) ; ce qui s'y apprend sur EffectCraft — répétition, tracé
progressif, repères, export — vaut toujours.

## La suite : la direction artistique d'abord

Décidé avec l'auteur le 7 novembre : le jeu doit avoir l'air conçu par un
studio de jeu mobile. La mécanique ne bouge pas ; ce qui manque est la
vie — mouvement, son, illustration. Ordre de travail pour TOUT élément
visuel ou sonore désormais :

1. **Des références** (planche de tendances, sans reproduire d'image).
2. **Des images témoins** — trois ou quatre images fixes, au format réel,
   dans le vrai écran — montrées à l'auteur.
3. **Sa validation**, puis la production, puis l'intégration.

Matière première : des gravures du XIXᵉ du domaine public **CC0**
(Smithsonian Open Access, Metropolitan Museum, Rijksmuseum, British
Library sur Flickr). **Pas Gallica** : la réutilisation commerciale y est
soumise à licence. Chaîne : PhotoCraft découpe, VectorCraft vectorise
(« Image Trace », par dossier entier), EffectCraft anime et exporte en
Lottie pour le composant `Animation`.

Décisions de l'auteur, même jour :
- **pas de visage pour les voix** — l'idée est écartée ;
- **musique : en suspens** ;
- **vidéo de présentation : l'auteur en a déjà une**, à demander si besoin.
