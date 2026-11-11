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
- **Remplacé le 8 novembre : un motif par AMBIANCE**, et non plus par jour
  de la semaine — « je veux que le changement ait lieu à chaque changement
  d'ambiance ». Le motif est tiré de la graine de l'ambiance, et chaque
  nouvelle ambiance en amène un autre.
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
- **Retour de l'auteur sur ces témoins** : « le thaumatrope est pas mal mais
  il faut l'améliorer ; il faut que les gravures aient un lien avec le
  surréalisme ». Le papillon et la montgolfière n'en avaient pas. Série
  repensée, proposée — de vraies gravures du XIXᵉ, celles que les
  surréalistes découpaient (Ernst, *La Femme 100 têtes*, *Une semaine de
  bonté*), chacune avec sa référence au cartel : le phénakistiscope
  (ancêtre des Rotoreliefs de Duchamp) ; l'œil-ballon (Redon, 1882,
  précurseur salué par Breton — trouvé, domaine public) ; la rencontre
  fortuite (thaumatrope : machine à coudre et parapluie, Lautréamont, la
  phrase-manifeste du surréalisme) ; la lune et le nuage (*Un chien
  andalou*, 1929) ; le poisson soluble (Breton, 1924 — la carpe de Bloch) ;
  la pomme (Magritte) ; la clef des songes (Magritte, 1930).
- **Série surréaliste, validée par l'auteur ; images témoins faites le
  7 novembre** (gravures téléchargées sur son accord : Redon, LACMA ;
  machine Singer, *Scientific American* 1851 ; parapluie, brevet américain
  de 1882 ; pommes de Brookshaw, Houghton Library ; clef de 1635,
  Rijksmuseum ; le nuage est découpé dans la planche de la lune).
  L'œil-ballon (médaillon ovale, la brume de Redon comprise) flotte et
  s'élève au toucher ; la Rencontre fortuite est un vrai jouet de 1825
  (titre en couronne, cordons à pompons) — machine d'un côté, parapluie de
  l'autre, ils se superposent au toucher ; la lune est traversée par un
  mince nuage (*Un chien andalou*) qui passe vite au toucher ; le poisson
  soluble se dissout au toucher puis se reforme ; la pomme lévite et tourne
  sur elle-même ; la clef se balance et oscille au toucher. **Points
  faibles** : le parapluie est une carcasse de dessin de brevet (une vraie
  gravure de parapluie serait mieux) ; le titre du disque est illisible à
  160 px ; le médaillon de Redon ressort fort sur fond sombre. Le plafond
  se calcule désormais sur la TEINTE MOYENNE du motif, pas sur son papier.
- **Produit le 7 novembre, à la demande de l'auteur (« fais ce que tu penses
  qui est le mieux »)** : les quatre motifs aboutis — le Phénakistiscope
  (lundi), la Lune et le nuage (jeudi), le Poisson soluble (vendredi), la
  Clef des songes (dimanche, au toucher un quart de tour comme dans une
  serrure). **Le bord découpé** unifie la série : une marge de papier
  #f6f0e2, au contour à peine irrégulier, comme une coupure collée — le
  plafond de contraste la lit. Les jours vides (mardi, mercredi, samedi)
  prennent l'un des quatre, en tournant. À retravailler avant de les
  produire : la Rencontre fortuite (un vrai parapluie gravé), l'Œil-ballon
  (découpé, sans sa brume), la Pomme (une réaction qui ait du sens).
  `scripts/decor-motifs.mjs` fabrique tout depuis `resources/gravures/`.
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

**Planche témoin du 8 novembre** — une maquette comparative, aujourd'hui
contre proposé, avec la partition réelle de `rythme.ts` pour un poème de
cinq fragments (dernier mot à 5,8 s). Rien n'est intégré au jeu.
- **Le papier** : la carte grise à liseré rouge devient une feuille posée,
  avec son ombre. Elle arrive en paquet, l'en-tête et dessous les tranches
  des volets, comme à l'écran d'écriture ; chaque volet sort de sous le
  précédent et la feuille s'allonge. Plis marqués au repos, en creux et en
  arête, volontairement faibles : au premier rendu ils faisaient des barres
  empilées, le piège que décrit `Papier.tsx`.
- **Le grain** : séparé, parce que `Papier.tsx` pose la règle « une feuille
  se reconnaît à ses plis, pas à son grain ». À l'auteur de trancher.
- **L'encre** : même rythme mot par mot, mais un bord fibreux et un halo
  qui sèche en 0,5 s. Le premier halo (2,4 px) se lisait comme une ombre
  portée ; ramené à 0,9 px.
- **Le mot arrive avec son volet** — l'auteur, le même jour : « le mot met
  trop de temps à apparaître quand le papier se déplie ». Deux variantes
  montrées (écrit pendant le pli, déjà sur le volet) ; **choisie : déjà sur
  le volet**. L'encre fibreuse n'a donc plus d'objet.
- **Intégré le 8 novembre** à la fin de partie : papier, grain, mot déjà sur
  le volet. Voir `docs/journal.md`, « La feuille de papier ».
- **Le tampon « ACHEVÉ » : refusé par l'auteur le 8 novembre**, retiré de
  la planche. La fin reste ce qu'elle est : les actions à 6,1 s. Ne pas
  reproposer de tampon, ni ici ni au chantier 4, sans que l'auteur le
  demande.

### 4. La matière de l'interface
Boutons et cartes en papier : un bord, une ombre, une infime inclinaison,
un appui qui enfonce. Étiquettes et onglets. ~~Un tampon quand on scelle
une voix~~ (le tampon est refusé par l'auteur, 8 novembre). Les vibrations du téléphone (`@capacitor/haptics`, déjà relevé
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

## Le plan « moderne » — validé le 10 novembre

Cinq points, dans l'ordre, chacun sur maquette témoin d'abord (la liste
est dans `CLAUDE.md`).

### Points 1 et 4 : le dépli tiré du doigt, en 3D — maquette du 11 novembre

Rien n'est intégré au jeu. Deux maquettes dans
`scripts/temoins/depli-au-doigt/` : `accordeon.html` (la première),
`paquet.html` (la seconde, **en attente de l'essai de l'auteur**).

**Retour de l'auteur sur la première, 11 novembre** : la feuille tombe
assez vite, mais « le paquet n'est pas assez serré. Rien ne doit être
visible, comme si on jouait au jeu en réel ». Il partage la limite de
l'Atelier.

**La seconde — le paquet fermé** (`paquet.html`) :
- La feuille arrive **fermée** : un paquet de papier dont on ne voit que
  le dos, uni, avec de fins traits sur ses deux bords (l'épaisseur des
  plis). Ni en-tête ni vers.
- On le tire vers soi : le rabat se soulève, se dresse **vers le joueur**,
  passe la verticale et retombe un pli plus bas en découvrant le vers
  qu'il couvrait. Un pli par volet, dans l'ordre ; un geste continu en
  ouvre plusieurs, et on peut revenir en arrière. Le dernier pli porte au
  revers le dernier vers et le pied.
- Lâché, un pli tombe **sous son poids** (une vraie pesanteur) du côté où
  il penche, avec deux petits rebonds : avant la verticale il se referme,
  après il s'ouvre. Lâché juste après la verticale, il touche la table en
  un tiers de seconde. Un toucher déplie tout, pli après pli (moins de
  deux secondes pour cinq vers).
- **L'œil est placé du côté du joueur**, vers le bas de l'écran, comme
  quand on tient le téléphone. Essayé et écarté : l'œil au-dessus de la
  feuille, où le pli dressé n'était plus qu'un trait.
- La limite de l'Atelier disparaît : son paquet arrive fermé comme les
  autres, son rabat est seulement plus grand.

**Retour de l'auteur sur la seconde** : « c'est mieux, travaille la
souplesse et le son d'un vrai pli ». Fait le 11 novembre, dans
`paquet.html` (même adresse de maquette) :
- **La souplesse.** Le rabat n'est plus une planche mais huit lamelles qui
  suivent une courbe, la lumière interpolée de l'une à l'autre (pas de
  marches). Mené au doigt, le bord libre devance ; en chute, il traîne dans
  l'air ; tenu de biais, il s'affaisse. La courbure suit sa cible par un
  ressort amorti (environ 5 vibrations par seconde, vite éteintes). Le pli
  touche la table, son bord claque un instant après et rebondit un peu ; le
  pli lui-même ne rebondit presque plus. Contre la table, sous le doigt, la
  courbe s'efface, sans quoi le papier sauterait d'un pli à l'autre.
- **Le son.** De vraies prises de papier, CC0, d'OpenGameArt (le détail,
  les coupes et le traitement : `scripts/temoins/depli-au-doigt/sons/SOURCES.md`).
  Un froissement quand un pli quitte la table, un claquement quand il se
  pose, plus fort s'il tombe vite, et un second, doux, quand le bord libre
  retombe. Deux jeux à comparer à l'oreille : « carte » (une carte qu'on
  déplie et qu'on referme) et « livre » (une page qu'on tourne). Rien ne
  sonne avant le premier geste. Le bruit filtré du 1er octobre n'est pas
  repris : il avait été retiré parce qu'il sonnait mal.
- Un toucher déplie tout en deux secondes environ (cinq vers), chaque pli
  avec son froissement et son claquement.
- **Non entendu par moi** : les sons ont été choisis et coupés sur la forme
  de leur onde, pas à l'oreille. L'auteur juge.

**Retour de l'auteur, même jour** : « trop rapide, bruit trop fort et
oublie le claquement ». Fait :
- **Plus lent** : la pesanteur passe de 110 à 40 et l'air freine davantage.
  Un pli lâché juste après la verticale touche la table en 0,57 s au lieu
  de 0,3 ; le papier vibre plus lentement (3 fois par seconde au lieu de
  5) ; le doigt parcourt 1,25 fois la course du papier ; un toucher déplie
  cinq vers en 3,5 s environ.
- **Plus bas** : environ −8 dB.
- **Plus de claquement**, ni au contact du pli ni au bord libre ; le bord se
  pose sans rebondir. Seul reste le froissement quand un pli s'ouvre. Les
  deux extraits « pose » sont retirés (`sons/SOURCES.md`).
- **Corrigé au passage, et c'était ancien** : un pli lancé depuis la table
  y était compté comme « touchant la table » dès la première image du
  calcul, et s'arrêtait net. L'esquisse ne bougeait pas, et parfois un pli
  de l'enchaînement repartait en retard avec un claquement de trop. Un
  contact ne compte plus que si le pli va vers la table.

**L'auteur, même jour** : « est-ce qu'il y a d'autres sons de papier
déplié, peut-être moins grossiers que celui-ci ? » Trois prises CC0 plus
fines, choisies sur la mesure (peu de craquements, pas de grave, un fond
propre), mises au même niveau moyen que l'ancienne pour qu'on compare la
matière et non le volume : **Page** (une page tournée, Kenney), **Feuille**
(une feuille qu'on manie, enregistrée au téléphone), **Glissé** (une carte
à jouer qu'on fait glisser, Kenney, coupée avant son claquement sec).
« Avant » garde la carte routière pour comparer ; « Livre » est retiré,
de la même famille. Page est le son par défaut, en attendant le choix de
l'auteur. Détail : `sons/SOURCES.md`.

**L'auteur choisit « Feuille »** et demande si on peut retoucher le son.
Les autres prises sont retirées. Trois variantes de la feuille à comparer,
une seule retouche chacune, au même niveau : **Douce** (craquements
rabotés, aigu dur adouci, entrée plus lente), **Courte** (la première
moitié, 0,28 s), **Légère** (trois demi-tons plus haut, même durée : un
papier plus fin). La feuille telle quelle reste le son par défaut.

**Validé par l'auteur, 11 novembre : la maquette `paquet.html`, avec le
son « Courte »** (`sons/feuille-courte-ouverture.wav`). Le chantier passe
au point suivant ; l'intégration au jeu reste à faire (fin de partie, puis
salon et poème du jour).

La première — l'accordéon (`accordeon.html`) :

- **La feuille arrive pliée en accordéon**, comme une bande de cadavre
  exquis repliée main après main : l'en-tête et le premier vers à plat
  (la lettrine se voit d'emblée), le reste en plis en toit — un faîte qui
  monte vers l'œil, une vallée posée sur la table. Les marques au repos
  de la fin de partie (creux, arête, en alternance) sont exactement ces
  plis-là.
- **On tire le bas de la feuille** : le bord reste sous le doigt, les plis
  s'ouvrent dans l'ordre du poème, chacun un peu avant que le précédent
  soit à plat. Tirée au-delà, la feuille entière glisse un peu et revient.
- **Lâchée**, elle tombe à plat sur un ressort, ses plis se soulèvent à
  peine et elle se pose ; tirée de moins de 40 % et lâchée doucement, elle
  se replie. Un geste vif décide seul. **Un simple toucher l'ouvre** (la
  règle : un appui pose le poème). Les actions n'apparaissent qu'une fois
  la feuille posée.
- **La lumière** est celle du kit, en haut à gauche : le pli qui monte
  s'éclaire, celui qui redescend s'éteint, l'arête du faîte accroche un
  filet de lumière (l'épaisseur du papier), un faîte haut jette son ombre
  en bas à droite. La lumière passe sous l'encre, l'ombre dessus.
- **Sans `preserve-3d`** : une perspective commune, et chaque morceau de
  papier peint à son tour. Pas de tri en profondeur, donc pas de
  scintillement sur Safari ; l'œil est placé au-dessus de la feuille, si
  bien qu'aucun pli ne tourne le dos à l'écran.
- **Si personne n'y touche**, la feuille esquisse le geste deux fois
  (1,1 s puis 5,2 s). Rien sous « réduire les animations ».
- **Limite connue** : les longs volets de l'Atelier arrivent moins serrés
  (un faîte est plafonné à 90 px, sans quoi il monterait trop vers l'œil).
- Les réglages (angle du paquet, ressort, seuil, perspective) sont en tête
  du script, `R`, pour être ajustés après l'essai.

### Point 2 : la vibration — en attente de l'application installée

Une page web ne fait plus vibrer un iPhone : l'astuce de l'interrupteur de
Safari (`<input type="checkbox" switch>`) marchait d'iOS 17.4 à 26.4 ;
WebKit l'a réservée aux vrais gestes en janvier 2025 (bogue 285120), puis
Apple l'a fermée avec iOS 26.5. Un pli qui tombe seul ne peut donc pas
vibrer dans une maquette. Décision de l'auteur, 11 novembre : passer au
point 3, et faire la vibration à la première installation de
l'application sur son iPhone (jamais faite : à guider pas à pas).
Aujourd'hui `src/utils/haptics.ts` n'appelle que `navigator.vibrate`
(Android seulement).

### Point 3 : les écrans qui s'enchaînent — maquette du 11 novembre

**En attente de l'essai de l'auteur.** Rien n'est intégré au jeu.
Maquette : `scripts/temoins/recueil-feuille/maquette.html`.

Relevé avant (l'écran réel, photographié le 11 novembre) : le Recueil est
une liste de lignes (le premier vers, une ligne de détails, ⟡ COUTURES),
et toucher une ligne fait un fondu de page (`PageTransition`, 0,45 s, la
page s'efface puis l'autre apparaît). La page du poème montre le texte nu,
sans feuille.

Proposé :
- **La ligne touchée devient un feuillet de papier** : le papier apparaît
  sous le texte, elle se soulève un peu (une ombre), le reste du recueil
  s'efface autour d'elle.
- **Le feuillet glisse à sa place** sur la page du poème en prenant la
  largeur de la feuille ; son texte passe de la ligne du recueil à la tête
  de la feuille (CADAVRE EXQUIS · date, la lettrine). L'en-tête du feuillet
  arrive en même temps.
- **Les plis s'ouvrent dessous**, un tous les 90 ms (le dépli d'avant, en
  plus vif : c'est un poème qu'on connaît déjà), avec le froissement court
  au premier pli. Puis les actions.
- **La page du poème montre le poème sur sa feuille**, comme la fin de
  partie, et non plus en texte nu ; le pied porte la date, le compte et
  l'heure.
- **« ← MES POÈMES » refait le chemin à l'envers**, plus vite (0,9 s).
  Un appui pendant le mouvement le termine. Environ 1,4 s à l'aller.
- Une planche témoin se fait avec `outils/planche.mjs` (`?t=` fige un
  instant).

**Retour de l'auteur, même jour** : « ça va trop vite, le son est agaçant.
La feuille doit déjà être dépliée. » Fait : le feuillet grandit jusqu'à la
feuille ENTIÈRE, déjà dépliée (plus de plis qui s'ouvrent) ; plus aucun
son à cet endroit ; le voyage dure 0,75 s au lieu de 0,38 (1,45 s en
tout, le retour un peu plus d'une seconde). Le texte de la ligne s'efface
pendant que celui de la feuille apparaît.

**L'auteur, même jour : « c'est mieux. Chantier suivant. »** Retenu ;
reste à l'intégrer au jeu.

### Point 4 : la révélation du dessin en 3D — maquette du 11 novembre

**En attente de l'essai de l'auteur.** Rien n'est intégré au jeu.
Maquette : `scripts/temoins/dessin-3d/maquette.html` (le dessin témoin à
trois mains du kit : `outils/rendre-dessin.mjs` le fabrique dans
`assets/`, non suivi ; `autonome.mjs` le recopie dans la page publiée).

Relevé avant (`RevealDessin.tsx`) : le dessin entier se découvre de haut
en bas derrière une ligne de balayage colorée qui s'arrête aux coutures ;
puis il remonte et se resserre, la lecture prend la place libérée.

Proposé — le geste du dépli validé, appliqué au dessin :
- **Le dessin arrive plié**, un paquet dont on ne voit que le dos du papier
  du studio, clair sur toutes les ambiances.
- **On le tire vers soi** : chaque pli se dresse et retombe sous son poids
  en découvrant la bande d'une main, la tête puis le corps ; le dernier
  pli porte au revers les jambes. Un toucher déplie tout (1,7 s).
- **Les réglages du dépli validé** : même pesanteur, même souplesse, le
  froissement court, aucun claquement. Deux différences, parce qu'une
  bande de dessin est six fois plus haute qu'un vers : le doigt parcourt
  150 px par pli (et non la hauteur de la bande), et l'œil est un peu plus
  loin (1 300 px, à 450 px sous le haut du dessin) — à 1 000 et 650, le
  premier rabat dressé sortait par le haut de l'écran. Les lamelles se
  recouvrent de 2 px : à cette taille, 0,8 px laissait des stries.
- **Puis comme aujourd'hui** : le dessin remonte et se resserre (60 % de
  la hauteur), « — LA LECTURE SE FAIT — », la lecture, « TOUCHER POUR
  CONTINUER ». Le dessin reste entier à l'écran, jamais coupé.

**Retour de l'auteur, même jour** : « définitivement le son ne me convient
pas. On retire le son pour le dessin déplié mais aussi pour le texte. »
Et l'animation du dessin : « pas mal, trop rapide ». Fait :
- **Plus aucun son au dépli**, ni pour le poème ni pour le dessin. Les
  extraits de papier (CC0) sont retirés du dépôt ; ils restent dans son
  histoire (`scripts/temoins/depli-au-doigt/sons/`, commit c061a48).
- **Le dessin, plus lent, par une règle** : une grande feuille tombe plus
  lentement qu'une petite, comme un pendule plus long. Le mouvement validé
  du poème est joué au ralenti d'un facteur (hauteur du rabat / 60 px)^0,35,
  environ 1,6 pour une bande de dessin : un toucher le déplie en 2,6 s au
  lieu de 1,7. Le poème garde sa vitesse validée.
- **Corrigé** : de fines stries claires traversaient le rabat pendant qu'il
  se courbe. Les lamelles étaient peintes de la plus lointaine à la plus
  proche de l'œil, si bien que le recouvrement de l'une dépassait au-dessus
  de l'autre à chaque pliure. Elles sont peintes dans l'ordre de la
  feuille, de la charnière au bord : chaque recouvrement passe dessous.
  Même correction au dépli du poème.

## Écarté, ou en suspens

- **Un visage pour les voix** : écarté par l'auteur.
- **La musique** : en suspens.
- **La vidéo de présentation** : elle existe (v18) ; à mettre à jour quand
  l'appli aura changé.
