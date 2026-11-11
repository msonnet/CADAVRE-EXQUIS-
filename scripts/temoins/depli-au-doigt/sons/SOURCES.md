# Les sons du dépli — d'où ils viennent

De vraies prises de papier, toutes sous licence **CC0** (domaine public,
usage commercial libre, sans mention obligatoire), trouvées sur
OpenGameArt le 11 novembre 2026. Les fichiers d'origine ne sont pas dans le
dépôt ; seuls les extraits travaillés le sont.

| extrait | prise d'origine | auteur | coupe |
|---|---|---|---|
| `carte-ouverture.wav` | `snd_use_map.wav` — « Opening and closing a map sounds », une carte qu'on déplie, « enregistrée en ouvrant et fermant une carte » | Spring Spring | 0,12 → 0,54 s |
| `page-ouverture.wav` | `bookFlip2.ogg` — « 50 RPG sound effects » (Kenney), une page tournée | Kenney | 0,045 → 0,33 s (le frottement, sans le petit choc final) |
| `feuille-ouverture.wav` | `paper_01…04` → `paper_03.ogg` — « 100 CC0 SFX », enregistrés au téléphone | rubberduck | 0,03 → 0,46 s |
| `glisse-ouverture.wav` | `card-slide-7.ogg` — « 54 casino sound effects » (Kenney), une carte à jouer qu'on glisse | Kenney | 0,175 → 0,31 s (le glissé, avant le claquement sec) |

Pages : `https://opengameart.org/content/opening-and-closing-a-map-sounds`,
`https://opengameart.org/content/50-rpg-sound-effects`,
`https://opengameart.org/content/100-cc0-sfx`,
`https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips`.

**11 novembre, après-midi** : l'auteur trouve le froissement de la carte
routière « grossier ». Trois prises plus fines, choisies sur la mesure
(peu de craquements, pas de grave, un fond propre), au même niveau moyen
que l'ancienne pour que la comparaison porte sur la matière et non sur le
volume. Elles étaient enregistrées bas : remontées de 12 à 17 dB, leur
souffle de fond reste quelque 40 dB sous le papier. Écartées sur la
mesure : les pages du pack « 80 CC0 RPG SFX » et l'ouverture d'un paquet
de cartes, plus craquantes. Le frottement « livre » (`book_flip.1.ogg`,
StarNinjas, 0,25 → 0,49 s) est retiré : de la même famille que la carte.

Le travail, le même pour les quatre (ffmpeg) : coupe, passe-haut à 110 Hz
(le grave qu'un haut-parleur de téléphone ne rend pas), fondus de 4 à 12 ms
à l'entrée et de 50 à 120 ms à la sortie, niveau ramené à −24 dB de moyenne
pour les froissements et −22 dB pour les claquements (crête à −1 dB au
plus) ; mono, 44,1 kHz, 16 bits.

**Retirés le 11 novembre, à la demande de l'auteur (« oublie le
claquement »)** : les deux claquements, `carte-pose.wav` (la carte qu'on
referme, `snd_close_map.wav` 0,755 → 0,93 s) et `livre-pose.wav`
(`book_flip.1.ogg` 0,505 → 0,66 s). Ils restent dans l'histoire du dépôt.

Écartées : les « Various paper sound effects » de Luckius (CC0 aussi), qui
portent un souffle de fond constant.
