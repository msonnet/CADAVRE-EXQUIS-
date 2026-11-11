# Les sons du dépli — d'où ils viennent

De vraies prises de papier, toutes sous licence **CC0** (domaine public,
usage commercial libre, sans mention obligatoire), trouvées sur
OpenGameArt le 11 novembre 2026. Les fichiers d'origine ne sont pas dans le
dépôt ; seuls les extraits travaillés le sont.

| extrait | prise d'origine | auteur | coupe |
|---|---|---|---|
| `carte-ouverture.wav` | `snd_use_map.wav` — « Opening and closing a map sounds », une carte qu'on déplie, « enregistrée en ouvrant et fermant une carte » | Spring Spring | 0,12 → 0,54 s |
| `livre-ouverture.wav` | `book_flip.1.ogg` — « 10 book page flips », des pages tournées | StarNinjas | 0,25 → 0,49 s (le frottement) |

Pages : `https://opengameart.org/content/opening-and-closing-a-map-sounds`,
`https://opengameart.org/content/10-book-page-flips`.

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
