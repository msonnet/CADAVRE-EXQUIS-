# Direction artistique — proposition du 7 novembre 2026

**Statut : proposition, à valider par l'auteur chantier par chantier.**
Rien de ce document n'entre dans le jeu sans images témoins validées
(règle posée le 7 novembre, après le retrait de la couture : voir
`docs/chantier-effectcraft.md`).

La demande de l'auteur : que le jeu ait l'air conçu par un studio de jeu
mobile. La mécanique ne bouge pas. Ce qui manque est ailleurs : le
mouvement, le son, l'illustration — « le jeu est complètement figé ».

## Le constat — vingt écrans relevés le 7 novembre

**Ce qui tient.** Une identité de revue littéraire : Bodoni, Playfair,
capitales espacées ; sept ambiances tirées chaque jour ; des clins d'œil
surréalistes (la cage d'après Magritte et Cornell, le rotorelief de
Duchamp, la montre molle). C'est la base, on la garde.

**Ce qui fait amateur.**
- **Tout est imprimé, rien ne vit.** L'accueil est une couverture de revue
  immobile. Le rotorelief — un objet fait pour tourner — ne tourne pas.
- **Les dix-sept vignettes** (`src/reve/collages.tsx`) sont de petits
  dessins au trait codés à la main : justes d'intention, pauvres de matière.
- **Le sommet du jeu est sous-joué.** La fin de partie montre une boîte
  grise qui se déplie lentement ; « Le cadavre se reconstitue… » est un
  titre sur fond uni.
- **Les surfaces sont plates.** Boutons et cartes ressemblent à un
  formulaire web : pas d'épaisseur, pas de réponse au doigt, pas de
  vibration.
- **Les écrans vides** se réduisent à une phrase.
- **Le son** : neuf bips d'oscillateur en la mineur (`useSound.ts`), aucun
  fichier audio.

**La vidéo de présentation** (`cadavre-exquis-v18-diffusion.mp4`, 45 s,
fournie par l'auteur) promet davantage que l'appli : du texte qui se tape,
des feuillets qui s'empilent sous le pli, un dessin à trois mains qui
devient monstre entre deux rochers gravés, l'Œil cousu et un tampon rouge.
Ce vocabulaire existe déjà : l'appli doit le rattraper.

## Ce que disent les références — Pinterest, 7 novembre

Recherches : collage surréaliste et gravure, cadavre exquis, gravure
animée, collage découpé animé, thaumatrope, papier plié, interfaces de
jeu d'époque, encre, tampons. Aucune image n'est reprise : ce sont des
directions.

1. **Les jouets optiques du XIXᵉ** — phénakistiscope, zootrope,
   praxinoscope, thaumatrope, les planches de Muybridge. C'est ce que
   renvoie « gravure animée » : des boucles gravées, animées par nature.
   Le rotorelief de Duchamp en descend. Et le plus classique des
   thaumatropes montre **un oiseau et une cage** qui ne font qu'une image
   quand le disque tourne — la cage est déjà dans le décor, et c'est
   exactement l'idée du cadavre exquis : deux images séparées, une seule
   par le mouvement.
2. **Le collage découpé animé** : des pièces de gravure articulées comme des
   marionnettes de papier, un mouvement légèrement saccadé (12 images par
   seconde), des ombres portées.
3. **La vraie matière, filmée** : papier plié, déplié, froissé ; encre qui
   diffuse et boit le papier. Les studios filment le papier plutôt que de
   le simuler, et s'en servent en transitions et en masques.
4. **Des interfaces qu'on touche** : papiers superposés, étiquettes,
   tickets, onglets, ruban adhésif, ombres — des objets, pas des boîtes.
5. **Les tampons** : oblitérations, tampons rouges, timbres dentelés — le
   « GRATUIT » de la vidéo, le sceau du recueil, l'encrier.

## Les chantiers, par ordre d'impact

### 1. Le décor vivant
Les vignettes refaites à partir de vraies gravures, chacune avec un
mouvement lent lié à son sujet : le rotorelief tourne, l'oiseau entre dans
la cage (thaumatrope), la montre coule, le papillon respire, la fumée de
la pipe monte. Un léger effet de profondeur sur l'accueil. C'est la
première impression, et elle est sur presque tous les écrans.
*Outils : PhotoCraft (détourage), VectorCraft (vectorisation « Image
Trace »), EffectCraft (animation, export Lottie).*

**Images témoins du 7 novembre — en attente de validation.**
- Le symbole du rotorelief remplacé par un **vrai disque de
  phénakistiscope** : « Cats and Donkey », Vienne, vers 1830 (Jos. Berman ;
  Cooper Hewitt, Smithsonian, domaine public). Deux anneaux de douze
  images : un chat bondit par-dessus un tabouret, un âne en redingote
  tourne la tête. Un douzième de tour par image, dans le sens inverse des
  aiguilles d'une montre (vérifié : à l'endroit, le chat saute en avant),
  10 images par seconde — c'est l'animation d'origine, rien n'est inventé.
- Posé à la place du symbole, 150 px, avec son cartel (« Le
  Phénakistiscope · disque stroboscopique · Vienne, v. 1830 »), sur Lin
  écru et Minuit, en deux traitements : **couleurs d'origine** (un objet
  de collection posé sur la page — le plus convaincant) et **gravure
  monochrome** teintée à l'encre du jour (terne en l'état).
- **Choix de l'auteur (7 novembre) : les couleurs d'origine**, « sauf si
  cela crée un trop gros contraste avec l'ambiance du jour ». Mesuré sur
  les sept ambiances (papier du disque contre fond de page) : clairs 1,04
  à 1,14:1 — aucun excès, couleurs d'origine telles quelles ; sombres 11,5
  (Minuit, Argile) à 15:1 (Encre) — excès. Règle proposée : **sur fond
  sombre, la lumière du disque baisse jusqu'à 6,5:1 au plus** (luminosité
  et saturation, pas d'opacité : le fond ne doit pas transparaître), un
  plafond calculé comme `garantirContraste` calcule un plancher. Essai à
  74 % de luminosité : 6,6 à 8,6:1 — l'Encre doit descendre encore.
  Teinter le disque à la couleur de la page sur les clairs a été essayé et
  écarté : il ternit l'Aube froide. (Un `mix-blend-mode` ne marche pas à
  cet endroit : l'animation d'entrée du symbole isole son contexte.)
- **Décision de l'auteur, 7 novembre : les motifs animés vivent
  UNIQUEMENT sur l'accueil, et y remplaceront à terme TOUS les symboles
  dessinés** — le rotorelief et les dix-sept autres. Le chantier du décor
  vivant est donc une suite : un motif après l'autre, chacun validé sur
  images témoins.
- **Décisions de l'auteur, même soir : SEPT motifs, un par jour de la
  semaine** ; un mouvement **subtil**, qui vit de lui-même et **se modifie
  légèrement au toucher** ; les dix-huit dessins au trait **supprimés**
  (les autres pages n'ont plus de symbole) ; le disque **un peu ralenti**
  (1,6 s le tour au lieu de 1,2). Au toucher, il s'emballe (×3) et
  retrouve son pas en 1,5 s.
- **Les six motifs suivants, proposés** (gravures repérées, à télécharger
  sur accord, images témoins à faire) : le papillon (Hollar, 1646, MET,
  CC0) — ses ailes respirent, au toucher il bat des ailes ; le thaumatrope
  (moineau et cage, planche de 1821, Rijksmuseum) — il se retourne de temps
  en temps, au toucher il tourne et l'oiseau entre dans la cage ; la
  montgolfière (le « Flesselles », Lyon, 1784, Rijksmuseum, CC0) — elle
  flotte, au toucher elle monte un peu ; la lune (*Tabula Selenographica*,
  Homann et Doppelmayr, 1707) — une ombre la parcourt lentement ; le
  poisson (Bloch, *Ichthyologie*, années 1780) — il nage sur place, au
  toucher un coup de queue ; la montre (cadran gravé, v. 1610,
  Rijksmuseum, CC0).
- **Images témoins des motifs suivants — 7 novembre, en attente de
  validation.** Gravures téléchargées (accord de l'auteur), détourées,
  animées dans le vrai accueil, sur Lin écru et Encre profonde :
  - **le papillon** (Hollar, 1646) : ailes qui respirent ; au toucher, deux
    battements. Sur fond sombre, l'eau-forte presque noire se perd — le
    plafond doit y être calculé sur la luminosité réelle du motif, pas sur
    son papier ;
  - **la montgolfière** (« Le Flesselles », 1784) : elle flotte ; au toucher,
    elle monte un peu ;
  - **la carpe** (Bloch, 1785) : elle nage sur place ; au toucher, un coup de
    queue ;
  - **la lune** (Doppelmayr et Homann, 1707) : libration lente et une ombre
    qui passe ; au toucher, l'ombre passe vite. Défaut vu : après le
    toucher, le cycle repart par le côté sombre — en production, l'ombre
    restera un croissant ;
  - **le thaumatrope** (moineau et cage d'un surimono de 1821) : il se
    retourne de temps en temps ; au toucher, il tourbillonne et l'oiseau
    apparaît dans la cage. Le moineau, minuscule dans l'estampe, reste
    flou : chercher un oiseau gravé plus grand avant de produire ;
  - **la montre est écartée** : un cadran d'ornement sans aiguilles (rien à
    animer sans inventer), entouré de figures nues. Septième motif
    proposé à la place : **le cheval au galop de Muybridge** (1878, domaine
    public), une vraie suite d'images comme le disque.
- **Intégré le 7 novembre, sur l'ACCUEIL seulement** (décision de
  l'auteur ; ailleurs, le rotorelief dessiné d'avant, `ailleurs` dans
  `collages.tsx`). Au rang du rotorelief dans `COLLAGES` : les tirages du
  jour ne bougent pas — la graine 7 (Minuit) montrait le rotorelief, elle
  montre le disque. Une seule image (`public/decor/phenakistiscope.webp`,
  39 Ko, fabriquée par `scripts/decor-phenakistiscope.mjs` depuis
  `resources/gravures/`, recentrée sur l'axe réel du disque) qui tourne en
  `steps(12)` par CSS — ni Lottie ni JavaScript. Plafond :
  `plafondLuminosite` (`src/reve/contraste.ts`), `filtreSymbole`
  (`src/reve/Decor.tsx`). Une gravure opaque s'écarte aussi des lignes de
  texte, pas seulement des boutons. Mesures : `decorVivant.test.ts`,
  `e2e/decor-vivant.spec.ts`.
- **Écartés** : les deux disques de Stampfer (« Distorted Man », 1833 ;
  « Dancing Man », v. 1835) et la cage de Boucher — caricatures
  orientalistes de l'époque, qui n'ont pas leur place dans le jeu.
- **Le thaumatrope** oiseau et cage reste à faire : les gravures trouvées
  (cage minuscule, oiseaux de Chodowiecki en basse définition) ne
  suffisent pas. Chercher un oiseau chanteur et une cage vide, seuls, en
  CC0 (planches d'histoire naturelle, catalogues d'objets).
- Le droit : le rotorelief de Duchamp n'est pas du domaine public (mort en
  1968) ; le disque viennois, son ancêtre, l'est.

### 2. Les attentes : des jouets optiques
À la place de la couture : un petit **disque de phénakistiscope** gravé
qui tourne pour les attentes courtes ; une **bande de zootrope** qui
défile pour les longues (l'illustration, la voix qui écrit) ; un
**thaumatrope** pour « le cadavre se reconstitue » (deux moitiés qui
fusionnent). Sous mouvement réduit : le disque immobile. Le vocabulaire
est historique, il se lit tout de suite, et il tourne par nature.
*Outils : PhotoCraft, VectorCraft, EffectCraft.*

### 3. Le dévoilement de fin de partie
Le sommet de chaque partie. Une vraie feuille, filmée en train d'être
dépliée bande par bande ; les vers qui apparaissent comme une encre qui
boit le papier ; un tampon final. Piste technique : une vidéo de papier
blanc posée sur la page en mode « produit » (`mix-blend-mode: multiply`)
— le blanc disparaît, les plis et les ombres restent, sur toutes les
ambiances, sans couche alpha.
*Outils : FilmCraft (rushes), EffectCraft (détourage, masques d'encre),
SoundCraft.*

### 4. La matière de l'interface
Boutons et cartes en papier : un bord, une ombre, une infime inclinaison,
un appui qui enfonce. Étiquettes et onglets. Un **tampon** quand on scelle
une voix. Les vibrations du téléphone (`@capacitor/haptics`, déjà relevé
par l'audit). Des écrans vides illustrés.
*Outils : FigCraft (maquettes, composants, export des variables vers le
CSS).*

### 5. Les sons
De vrais bruits, enregistrés par l'auteur au téléphone : feuille froissée,
pli, papier déchiré, plume qui gratte, tampon, page tournée, boîte qui se
ferme. SoundCraft nettoie, superpose, égalise et masterise une quinzaine
de sons courts. Écoutés et validés avant toute intégration (les sons de
papier synthétiques du 1er octobre avaient été retirés pour cette raison).
*Outil : SoundCraft — il sait façonner un son, pas l'inventer : il lui faut
cette matière.*

### 6. L'ouverture
L'Œil cousu vectorisé depuis `resources/icon.png` (VectorCraft), animé,
dans la continuité de l'écran natif — le chantier déjà décrit, repris avec
la nouvelle méthode.

### 7. La vitrine
Les captures de l'App Store composées dans FigCraft (une maquette, tous
les formats d'un coup) ; la vidéo v18 mise à jour avec les nouvelles
animations, plus tard (FilmCraft).

## La méthode, pour chaque chantier

1. Une planche de références.
2. **Trois ou quatre images témoins**, au format réel, dans le vrai écran,
   montrées à l'auteur.
3. Sa validation — puis la production, l'intégration, la vérification
   (deux ambiances, 320 et 390 points, mouvement réduit).

Matière première : gravures du domaine public **CC0** (Smithsonian Open
Access, Metropolitan Museum, Rijksmuseum, British Library sur Flickr),
plus les prises de vue et de son de l'auteur. **Pas Gallica** : la
réutilisation commerciale y est soumise à licence.

## Ce que l'auteur fournit

- Pour les sons : une dizaine de minutes d'enregistrements au téléphone,
  dans une pièce calme, une liste sera donnée.
- Pour le dévoilement : deux ou trois courtes vidéos d'une feuille pliée en
  accordéon qu'on déplie, sur fond uni, téléphone fixe.
- Les validations, à chaque planche.

## Écarté, ou en suspens

- **Un visage pour les voix** : écarté par l'auteur.
- **La musique** : en suspens.
- **La vidéo de présentation** : elle existe (v18) ; à mettre à jour quand
  l'appli aura changé.
