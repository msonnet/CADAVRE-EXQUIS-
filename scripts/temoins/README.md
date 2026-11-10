# Les maquettes témoins

La règle de l'auteur : rien de visuel n'entre dans le jeu sans images
témoins montrées et validées. Ce dossier sert à les fabriquer **hors du
jeu** : des pages HTML autonomes, aux couleurs, polices et papier du jeu,
qu'on photographie image par image puis qu'on montre à l'auteur.

## Le nécessaire

- `commun/kit.js` — les sept ambiances en variables CSS (`?ambiance=lin`),
  le papier de `src/lib/papier.ts`, les contenus témoins (`Temoin.poeme`,
  `?cas=court|etoffe|atelier` ; `Temoin.DESSIN`), des courbes
  (`Temoin.M`), une lumière (`Temoin.LUMIERE`, `Temoin.eclairement`) et
  **l'horloge** : une animation est une fonction pure du temps,
  `Temoin.enregistrer({ duree, rendre(t), poser?() })`. On la fige avec
  `?t=1200`, on la pose avec `?reduit=1`, on la ralentit avec `?vitesse=0.5`.
  Un appui pendant la séquence pose l'état final, comme dans le jeu.
- `commun/base.css`, `commun/polices.css` — la page et l'écran de fin du
  jeu, les polices de `public/fonts/`.
- `references/maquette-fin.html` — l'écran de fin de partie à l'état final,
  fidèle au jeu : le point de départ de toute maquette du dépli.
- `outils/dessin.html` — un cadavre dessiné à trois mains (plume, feutre,
  crayon). `node scripts/temoins/outils/rendre-dessin.mjs
  $PWD/scripts/temoins/outils/dessin.html $PWD/scripts/temoins/assets` le
  rend en PNG (l'assemblage et les trois bandes) dans `assets/`, non suivi
  par git.
- `outils/planche.mjs` — photographie une maquette à plusieurs instants et
  en fait une planche :
  `node scripts/temoins/outils/planche.mjs <maquette.html> <sortie.png>
  --t=0,300,600,fin --ambiance=minuit [--largeur=320 --hauteur=568]
  [--params="cas=atelier"] [--pleine]`. Dans un conteneur cloud, préfixer
  par `PW_CHROMIUM=/opt/pw-browsers/chromium`.

Une maquette va dans son propre sous-dossier et charge
`../commun/polices.css`, `../commun/base.css`, `../commun/kit.js`.

## Les principes du relief — « la table »

L'écran est une table vue de dessus ; les papiers y sont des objets.
Une seule lumière, en haut à gauche : les ombres tombent en bas à droite.
Le papier a deux faces et une épaisseur, jamais transparent. Une vraie
perspective (700 à 1 100 px). Les ombres portées bougent avec les objets.
Le poids : une chose qui tombe accélère, dépasse un peu et se pose.

Sur téléphone : CSS 3D et JavaScript nus, n'animer que `transform` et
`opacity`. Sur Safari, `overflow: hidden`, `opacity < 1` ou `filter` posés
sur un parent en `preserve-3d` aplatissent la scène, et deux faces dans le
même plan scintillent (les écarter de 0,5 px). Vérifier à 390 et 320 de
large, sur `lin`, `minuit` et `encre`.
