/**
 * La réserve de chaque voix — ce qu'elle dit quand le réseau ne répond pas.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * Hors ligne, en cas de doublon ou d'échec de l'appel, le fragment venait
 * d'une réserve unique et commune : « l'ombre », « chavire », « vacille »,
 * « la nuit garde tout ». Mot pour mot le stock que `api/_voices.ts` désigne
 * comme ce qui EFFACE les voix — « des verbes que n'importe qui aurait
 * posés ». Et l'écran affichait pendant ce temps « Le cartographe écrit… ».
 * Une partie dans le train, là où la PWA doit tenir, était une partie
 * entièrement générique sous quarante-six noms différents.
 *
 * ── Ce que c'est ──────────────────────────────────────────────────────────
 *
 * Trois fragments par famille et par voix, tirés à la main du lexique, des
 * gestes et du dehors que `_voices.ts` donne déjà à chacune. Trois et non
 * six : quarante-six voix, cinq familles, deux langues — il fallait que ce
 * soit relisible d'un bout à l'autre, et ce l'est.
 *
 * Les familles sont exactement celles que les grilles du cadavre écrit
 * demandent, et rien d'autre :
 *
 *   · `gn`    — FR : article + nom (« la sente »).
 *               EN : le nom NU (« ford ») — la grille anglaise sépare
 *               l'article-adjectif du nom.
 *   · `gnr`   — un groupe nominal étoffé, sujet ou complément.
 *   · `verbe` — conjugué à la troisième personne du présent.
 *   · `adj`   — FR : l'adjectif seul, au masculin singulier ; l'accord se
 *               fait à la couture, comme pour un fragment écrit par une main.
 *               EN : article + adjectif (« an unsurveyed »), la case
 *               anglaise les veut ensemble.
 *   · `vers`  — un vers entier, de trois à sept mots.
 *
 * Le stock commun reste derrière, pour les familles qu'aucune grille ne
 * demande et pour la voix qui aurait épuisé les siennes dans une partie.
 * L'étiquette le dit alors : RÉSERVE, sans nom.
 *
 * Aucune importation : se mesure seul, et se précache avec la page de jeu.
 */

export interface ReserveVoix {
  gn: string[]
  gnr: string[]
  verbe: string[]
  adj: string[]
  vers: string[]
}

type R = ReserveVoix
const r = (gn: string[], gnr: string[], verbe: string[], adj: string[], vers: string[]): R =>
  ({ gn, gnr, verbe, adj, vers })

export const RESERVE_FR: Record<string, ReserveVoix> = {
  'archiviste': r(
    ['la cote', 'le vélin', 'un feuillet'],
    ['la mention marginale', 'un feuillet manquant', "la tache d'humidité"],
    ['collationne', 'transcrit', 'recoud'],
    ['lacunaire', 'coté', 'jauni'],
    ['à première vue rien ne manque', 'la même cote revient trois fois', 'le registre garde un blanc'],
  ),
  'botaniste': r(
    ['le limbe', 'la stipule', 'une nervure'],
    ['le pétiole duveteux', 'un limbe desséché', 'la corolle pressée'],
    ['presse', 'étiquette', 'prélève'],
    ['pétiolé', 'duveteux', 'lancéolé'],
    ['douze millimètres de limbe fané', 'la planche est mal étiquetée', 'une sève sèche sous la loupe'],
  ),
  'meteorologue': r(
    ['la rosée', 'le grain', 'une accalmie'],
    ['la gelée blanche', 'un plafond bas', 'la brume de rayonnement'],
    ['annonce', 'se dépose', 'gagne'],
    ['venteux', 'couvert', 'brumeux'],
    ['on aura du beau temps demain', 'le vent vire au nord', 'une accalmie en fin de journée'],
  ),
  'enfant': r(
    ['le placard', 'un genou', 'la couverture'],
    ['la marche du dessous', 'le monsieur du placard', 'un trou dans la couverture'],
    ['pousse', 'cache', 'tient fort'],
    ['mouillé', 'tout rouge', 'pas content'],
    ['et le chien est dans le placard', 'le doudou a froid et puis', 'quelqu’un tient la porte fort'],
  ),
  'marin': r(
    ['la houle', 'le cap', 'une écoute'],
    ['la mer creuse', 'un grain qui monte', 'le quart de minuit'],
    ['borde', 'sonde', 'embarque'],
    ['gîté', 'amarré', 'salé'],
    ['quatre heures, la houle forcit', 'on tient le cap sans rien voir', 'deux ris pris avant la nuit'],
  ),
  'chimiste': r(
    ['le précipité', 'un résidu', 'la pesée'],
    ['la solution mère', 'un dépôt blanchâtre', 'le trouble persistant'],
    ['décante', 'filtre', 'dissout'],
    ['trouble', 'saturé', 'à peine acide'],
    ['un peu de résidu au fond', 'le précipité vire au bleu', 'trop de chaleur dégagée'],
  ),
  'cuisinier': r(
    ['la saumure', 'une croûte', 'la lie'],
    ['le gras qui rend', 'une réduction au vin', 'le nappage tiède'],
    ['déglace', 'nappe', 'saisit'],
    ['saisi', 'nappé', 'réduit'],
    ['laisse prendre, ne touche à rien', 'déglace et monte au beurre', 'dresse avant que ça retombe'],
  ),
  'detective': r(
    ['le relevé', 'une filature', 'le témoin'],
    ['la fenêtre allumée', 'un véhicule gris', 'la sortie de vingt et une heures'],
    ['file', 'recoupe', 'consigne'],
    ['stationné', 'relevé', 'daté'],
    ['21 h 04, la lumière s’éteint', 'le sujet sort sans son manteau', 'rien à signaler jusqu’à minuit'],
  ),
  'astronome': r(
    ['la magnitude', 'une occultation', 'le limbe'],
    ['la nuit sans lune', 'un éclat variable', 'le fond de ciel'],
    ['culmine', 'scintille', 'pointe'],
    ['variable', 'occulté', 'culminant'],
    ['magnitude quatre, puis plus rien', 'à 2 h 10 l’étoile s’occulte', 'trente ans sans le noter'],
  ),
  'medecin': r(
    ['le pouls', 'un œdème', 'la pâleur'],
    ['la fièvre du soir', 'une douleur qui migre', 'le rétablissement lent'],
    ['ausculte', 'palpe', 'prescrit'],
    ['fébrile', 'œdémateux', 'livide'],
    ['chez le sujet le pouls ralentit', 'la fièvre revient vers le soir', 'rien d’inquiétant, à revoir'],
  ),
  'musicien': r(
    ['la tenue', 'une sourdine', 'la reprise'],
    ['la résonance qui s’éteint', 'un silence mesuré', 'la tierce tenue'],
    ['accorde', 'reprend', 'ralentit'],
    ['sourdiné', 'tenu', 'ralenti'],
    ['quatre temps puis la main lâche', 'la reprise sans la sourdine', 'un silence de deux mesures'],
  ),
  'archeologue': r(
    ['la couche', 'un tesson', 'le remblai'],
    ['la terre rapportée', 'un outil cassé', 'la sépulture sans nom'],
    ['dégage', 'tamise', 'date'],
    ['stratifié', 'remanié', 'enfoui'],
    ['un, la couche ; deux, le tesson', 'la route passera demain ici', 'sous le remblai une sépulture'],
  ),
  'horloger': r(
    ["l'échappement", 'le balancier', 'un rubis'],
    ['la roue de rencontre', 'un spiral faussé', 'le barillet remonté'],
    ['remonte', 'huile', 'règle'],
    ['grippé', 'remonté', 'faussé'],
    ['comme une ancre sur sa roue', 'la montre retarde de trois minutes', 'personne ne viendra la rechercher'],
  ),
  'cartographe': r(
    ['la sente', 'le gué', 'une borne'],
    ['le méandre envasé', 'la lisière du hameau', 'une terre non levée'],
    ['longe', 'contourne', 'jalonne'],
    ['borné', 'non levé', 'jalonné'],
    ['la carte s’arrête avant le gué', 'trois lieues de sente à lever', 'au relais la lettre n’est pas venue'],
  ),
  'reveur': r(
    ["l'escalier", 'un visage', 'la chambre'],
    ["la maison qui n'existe pas", 'un visage remplacé', 'la pièce en trop'],
    ['se dédouble', 'revient', 'remonte'],
    ['dédoublé', 'connu', 'inachevé'],
    ['la chambre avait une porte de plus', 'quelqu’un m’attendait sans visage', 'je refais le trajet à l’envers'],
  ),
  'telegraphiste': r(
    ['le fil', 'un accusé', 'la ligne'],
    ['la ligne coupée', 'un mot compté', "l'attente de réponse"],
    ['transmet', 'relaie', 'abrège'],
    ['urgent', 'coupé', 'abrégé'],
    ['urgent stop rien ne revient', 'la ligne grésille depuis minuit', 'arrivé stop pas de réponse'],
  ),
  'ornithologiste': r(
    ['la rémige', 'un cri', 'la couvée'],
    ['le vol battu', "un cri d'alarme", "la posture d'attente"],
    ['guette', 'bague', 'couve'],
    ['bagué', 'migrateur', 'perché'],
    ['un vol battu au ras du marais', 'le cri d’alarme puis plus rien', 'cinq heures d’affût pour une aile'],
  ),
  'somnambule': r(
    ['le drap', 'une fenêtre', 'le couloir'],
    ['la main dans le mur', "un escalier de l'eau", 'la porte dans le lit'],
    ['tâte', 'traverse', 'ouvre'],
    ['endormi', 'entrouvert', 'mouillé'],
    ['je descends l’escalier de l’eau', 'la fenêtre est au sol ce soir', 'quelqu’un me rappelle au lit'],
  ),
  'fossoyeur': r(
    ['la fosse', 'une concession', 'le terrain'],
    ['la place suivante', 'une pierre sans date', "l'humidité du sol"],
    ['creuse', 'comble', 'tasse'],
    ['comblé', 'tassé', 'humide'],
    ['un mètre quatre-vingts, pas plus', 'la place suivante est déjà prise', 'midi sonne sur la brouette'],
  ),
  'traducteur': r(
    ['la glose', 'une racine', 'la variante'],
    ['le mot sans équivalent', 'un sens perdu', 'la note du copiste'],
    ['rend', 'transpose', 'glose'],
    ['approché', 'intraduisible', 'fautif'],
    ['ce mot n’existe pas chez nous', 'entre deux termes je reste', 'le copiste a raturé la marge'],
  ),
  'jardinier': r(
    ['le semis', 'une greffe', 'la taille'],
    ['le gel tardif', 'un plant qui tient', 'la terre lourde'],
    ['repique', 'paille', 'greffe'],
    ['paillé', 'repiqué', 'monté en graine'],
    ['le gel a pris les semis', 'la saison est en avance', 'il faudra reprendre au printemps'],
  ),
  'speleologue': r(
    ["l'étroiture", 'un siphon', 'la voûte'],
    ['la goutte qui tombe', "un courant d'air", 'le noir complet'],
    ['rampe', 'franchit', 'éclaire'],
    ['étroit', 'noyé', 'suintant'],
    ['après le siphon une salle', 'on écoute la pierre répondre', 'le jour nous aveugle à la sortie'],
  ),
  'libraire': r(
    ["l'exemplaire", 'un ex-libris', 'la reliure'],
    ['la provenance inconnue', 'un cahier détaché', 'la page de garde'],
    ['époussette', 'range', 'décrit'],
    ['relié', 'épuisé', 'dépareillé'],
    ['manque la page de titre', 'le chat dort sur la caisse', 'un exemplaire sans provenance'],
  ),
  'boucher': r(
    ['le jarret', 'un nerf', 'la coupe'],
    ['le froid de la chambre', 'une coupe franche', "l'os à moelle"],
    ['désosse', 'pare', 'tranche'],
    ['persillé', 'paré', 'rassis'],
    ['à contrefil, sinon ça résiste', 'six heures, la chambre froide', 'le tablier sèche sur la porte'],
  ),
  'entomologiste': r(
    ["l'élytre", 'une larve', 'la chitine'],
    ['la mue abandonnée', 'une antenne repliée', 'la ponte du soir'],
    ['épingle', 'stridule', 'observe'],
    ['chitineux', 'épinglé', 'nymphal'],
    ['l’élytre s’ouvre sans un bruit', 'sous l’épingle il remue encore', 'la larve attend depuis l’été'],
  ),
  'geologue': r(
    ['la strate', 'un pendage', 'la faille'],
    ['la fracture fraîche', 'un schiste plissé', 'la discordance angulaire'],
    ['affleure', 'plisse', 'érode'],
    ['plissé', 'schisteux', 'fracturé'],
    ['la strate plonge vers le nord', 'un caillou daté d’avant nous', 'la faille passe sous la tente'],
  ),
  'photographe': r(
    ['le cadre', 'un tirage', 'le grain'],
    ['le contre-jour', 'un flou de bougé', 'la lumière rasante'],
    ['cadre', 'expose', 'développe'],
    ['surexposé', 'flou', 'granuleux'],
    ['à droite il y avait quelqu’un', 'la lumière rasait le mur', 'je me souviens du cadre'],
  ),
  'tisserand': r(
    ['la trame', 'un croisement', 'la chaîne'],
    ['le fil rompu', 'un vide entre deux fils', "l'envers du drap"],
    ['ourdit', 'noue', 'croise'],
    ['serré', 'tendu', 'rompu'],
    ['un fil rompu dans la trame', 'l’envers dit tout du travail', 'le métier bat depuis l’aube'],
  ),
  'cartomancien': r(
    ['la tour', 'une échelle', 'le chien'],
    ["la carte à l'envers", 'une barque vide', 'la femme de dos'],
    ['retourne', 'étale', 'coupe'],
    ['renversé', 'effacé', 'retourné'],
    ['la tour, puis la barque vide', 'une main coupée sur le tapis', 'le nombre est effacé, encore'],
  ),
  'souffleur de verre': r(
    ['le col', 'une bulle', "l'épaisseur"],
    ['la bulle prise', 'une fêlure amorcée', 'la tension interne'],
    ['cueille', 'étire', 'recuit'],
    ['soufflé', 'recuit', 'marbré'],
    ['trois heures, le four respire', 'une bulle prise dans le col', 'on voit la rue au travers'],
  ),
  'alchimiste': r(
    ['le soufre', 'une chaux', 'le mercure'],
    ["l'œuvre au noir", 'un vase clos', 'la durée du feu'],
    ['calcine', 'sublime', 'distille'],
    ['calciné', 'sublimé', 'scellé'],
    ['quarante jours de feu égal', 'le soufre se fige dans le vase', 'une chandelle de moins ce soir'],
  ),
  'funambule': r(
    ['le câble', 'un balancier', 'le pas'],
    ['le vide dessous', 'une corde qui chante', 'le vent de travers'],
    ['traverse', 'bascule', 'se rattrape'],
    ['tendu', 'suspendu', 'oblique'],
    ['un pas, puis le vent', 'à mi-parcours je respire', 'la corde chante sous le pied'],
  ),
  'apiculteur': r(
    ["l'essaim", 'une reine', 'la cire'],
    ['la cellule operculée', "un couvain d'hiver", 'le bourdonnement de la hausse'],
    ['enfume', 'butine', 'nourrit'],
    ['operculé', 'enfumé', 'mielleux'],
    ['le premier soleil de février', 'l’essaim est parti sans prévenir', 'une piqûre au poignet, rien'],
  ),
  'lexicographe': r(
    ["l'acception", 'un renvoi', 'la définition'],
    ['le mot qui manque', 'une entrée voisine', "l'exemple forgé"],
    ['définit', 'atteste', 'restreint'],
    ['vieilli', 'rare', 'attesté'],
    ['voir aussi : absence', 'ce sens n’est pas attesté', 'un mot manque entre deux entrées'],
  ),
  'enlumineur': r(
    ['la lettrine', 'un vermillon', 'la vigne'],
    ["le fond d'azur", 'une bête à deux têtes', 'le feuillage qui dévore'],
    ['dore', 'orne', 'enlumine'],
    ['doré', 'historié', 'azuré'],
    ['l’or se pose avant la cloche', 'une bête mange la marge', 'le vermillon gèle dans le godet'],
  ),
  'herboriste': r(
    ['la racine', 'un simple', 'la décoction'],
    ["la cueillette d'avant l'aube", 'une dose de trois pincées', "l'amertume de la racine"],
    ['cueille', 'infuse', 'dose'],
    ['séché', 'infusé', 'macéré'],
    ['trois pincées à la lune montante', 'cueilli avant que l’aube parle', 'la racine apaise et purge'],
  ),
  'epistolier': r(
    ['votre absence', 'une lettre', 'la date'],
    ["l'adresse jamais écrite", 'une lettre déchirée', 'le vouvoiement gardé'],
    ['relit', 'plie', 'déchire'],
    ['inachevé', 'déchiré', 'plié'],
    ['je ne vous l’enverrai pas', 'ce que je n’ai pas dit', 'dimanche, encore, je vous écris'],
  ),
  'greffier': r(
    ['la minute', 'un comparant', 'la mention'],
    ['la case laissée vide', 'une pièce jointe', 'le délai expiré'],
    ['consigne', 'acte', 'vise'],
    ['susdit', 'annexé', 'clos'],
    ['dont acte, et rien de plus', 'ledit comparant se tait', 'la case est laissée vide'],
  ),
  'convalescent': r(
    ['le drap', 'une soif', 'le plafond'],
    ['la chaleur qui monte', "un verre d'eau tiède", "l'heure sans fin"],
    ['transpire', 'se relève', 'compte'],
    ['moite', 'fiévreux', 'las'],
    ['quatre heures, elle va venir', 'le plafond a une tache de plus', 'j’ai soif depuis ce matin'],
  ),
  'collecteuse': r(
    ['la comptine', 'un dicton', 'la formule'],
    ['le sel jeté', 'une variante du village', 'le refrain sans queue ni tête'],
    ['recueille', 'récite', 'conjure'],
    ['répété', 'conjuré', 'transmis'],
    ['trois fois le sel, sinon rien', 'on le dit pour que ça passe', 'au village voisin on dit autrement'],
  ),
  'psalmiste': r(
    ['la face', 'un rempart', 'la main levée'],
    ['le nombre des jours', 'une voix qui appelle', "l'ombre de l'aile"],
    ['invoque', 'scande', 'implore'],
    ['levé', 'prosterné', 'compté'],
    ['compte mes jours sur tes doigts', 'sous l’aile je me tiens', 'relève-moi à la première heure'],
  ),
  'notice': r(
    ['le levier', 'un voyant', "l'orifice"],
    ['la position basse', 'une pièce non fournie', 'le déclic attendu'],
    ['introduit', 'abaisse', 'maintient'],
    ['non fourni', 'abaissé', 'verrouillé'],
    ['ne pas forcer le mécanisme', 'attendre le déclic avant usage', 'remettre le levier en position basse'],
  ),
  'graveur': r(
    ['le trait', 'un ciseau', 'la lettre'],
    ["l'année manquante", 'une lettre ébréchée', 'la place restante'],
    ['burine', 'entame', 'ponce'],
    ['ébréché', 'gravé', 'poncé'],
    ['le nom est court, tant mieux', 'il manque la place pour l’année', 'la veuve marchande les lettres'],
  ),
  'insomniaque': r(
    ['le radiateur', 'une phrase', "l'heure"],
    ['le jour qui ne vient pas', 'une phrase qui revient', "l'heure affichée"],
    ['ressasse', 'rallume', 'attend'],
    ['éveillé', 'allumé', 'tiède'],
    ['trois heures douze, encore', 'j’aurais dû le dire autrement', 'le voisin rentre, puis la rue'],
  ),
  'parfumeur': r(
    ['le sillage', 'un accord', "l'ambre"],
    ['la note de tête', 'une odeur de peau', 'la sortie de flacon'],
    ['macère', 'fixe', "s'évapore"],
    ['ambré', 'éventé', 'boisé'],
    ['le vétiver tient jusqu’au soir', 'sur la bandelette, ma mère', 'l’accord vire après une heure'],
  ),
  'prisonnier': r(
    ['la lucarne', 'un trait', "l'écuelle"],
    ['le carré de ciel', 'un pas dans le couloir', 'la barre ajoutée'],
    ['grave', 'compte', 'guette'],
    ['barré', 'compté', 'grillagé'],
    ['un trait de plus sur le mur', 'le carré de ciel a bougé', 'le gardien siffle, puis rien'],
  ),
}

export const RESERVE_EN: Record<string, ReserveVoix> = {
  'archiviste': r(
    ['shelfmark', 'vellum', 'folio'],
    ['the marginal note', 'a missing leaf', 'the damp stain'],
    ['collates', 'transcribes', 'catalogues'],
    ['a catalogued', 'the foxed', 'an undated'],
    ['at first glance nothing is missing', 'the same shelfmark three times', 'the register keeps a blank'],
  ),
  'botaniste': r(
    ['stipule', 'petiole', 'calyx'],
    ['the downy stalk', 'a pressed corolla', 'the dried leaf blade'],
    ['presses', 'labels', 'samples'],
    ['a downy', 'the lanceolate', 'a pressed'],
    ['twelve millimetres of faded leaf', 'the sheet was labelled wrong', 'dry sap under the lens'],
  ),
  'meteorologue': r(
    ['dew', 'squall', 'lull'],
    ['the white frost', 'a low ceiling', 'the radiation fog'],
    ['forecasts', 'veers', 'settles'],
    ['an overcast', 'the gusty', 'a misty'],
    ['fair weather expected tomorrow', 'the wind veers to the north', 'a lull toward evening'],
  ),
  'enfant': r(
    ['cupboard', 'knee', 'blanket'],
    ['the bottom stair', 'the man in the cupboard', 'a hole in the blanket'],
    ['pushes', 'hides', 'holds on'],
    ['a wet', 'a tiny', 'a grumpy'],
    ['and the dog is in the cupboard', 'teddy is cold and then', 'somebody is holding the door'],
  ),
  'marin': r(
    ['swell', 'heading', 'sheet'],
    ['the hollow sea', 'a squall coming up', 'the midnight watch'],
    ['sounds', 'reefs', 'trims'],
    ['a heeling', 'the salt-stiff', 'a moored'],
    ['four o’clock, the swell builds', 'holding the heading, seeing nothing', 'two reefs taken before dark'],
  ),
  'chimiste': r(
    ['precipitate', 'residue', 'filtrate'],
    ['the stock solution', 'a whitish deposit', 'the lasting cloudiness'],
    ['decants', 'filters', 'dissolves'],
    ['a cloudy', 'the saturated', 'a faintly acid'],
    ['a little residue at the bottom', 'the precipitate turns blue', 'too much heat given off'],
  ),
  'cuisinier': r(
    ['brine', 'crust', 'glaze'],
    ['the rendered fat', 'a wine reduction', 'the warm glaze'],
    ['deglazes', 'sears', 'plates'],
    ['a seared', 'the reduced', 'a glazed'],
    ['let it set, touch nothing', 'deglaze and mount with butter', 'plate it before it falls'],
  ),
  'detective': r(
    ['stakeout', 'witness', 'timestamp'],
    ['the lit window', 'a grey vehicle', 'the nine-oh-four exit'],
    ['tails', 'logs', 'cross-checks'],
    ['a parked', 'the logged', 'an unmarked'],
    ['9:04, the light goes out', 'subject leaves without his coat', 'nothing to report till midnight'],
  ),
  'astronome': r(
    ['magnitude', 'occultation', 'limb'],
    ['the moonless night', 'a variable glow', 'the sky background'],
    ['culminates', 'twinkles', 'tracks'],
    ['a variable', 'the occulted', 'a faint'],
    ['magnitude four, then nothing', 'at 2:10 the star goes out', 'thirty years without logging it'],
  ),
  'medecin': r(
    ['pulse', 'swelling', 'pallor'],
    ['the evening fever', 'a wandering pain', 'the slow recovery'],
    ['auscultates', 'palpates', 'prescribes'],
    ['a feverish', 'the swollen', 'a livid'],
    ['in the subject the pulse slows', 'the fever returns toward evening', 'nothing alarming, see again'],
  ),
  'musicien': r(
    ['mute', 'reprise', 'sustain'],
    ['the dying resonance', 'a measured rest', 'the held third'],
    ['tunes', 'sustains', 'resumes'],
    ['a muted', 'the sustained', 'a slowed'],
    ['four beats, then the hand lets go', 'the reprise without the mute', 'a rest of two bars'],
  ),
  'archeologue': r(
    ['layer', 'potsherd', 'backfill'],
    ['the imported soil', 'a cracked tool', 'the nameless burial'],
    ['sieves', 'uncovers', 'dates'],
    ['a layered', 'the disturbed', 'a buried'],
    ['one, the layer; two, the sherd', 'the road comes through tomorrow', 'beneath the backfill, a burial'],
  ),
  'horloger': r(
    ['escapement', 'balance', 'jewel'],
    ['the crown wheel', 'a bent hairspring', 'the wound barrel'],
    ['winds', 'oils', 'regulates'],
    ['a seized', 'the wound', 'a bent'],
    ['like an anchor on its wheel', 'the watch runs three minutes slow', 'no one will come to collect it'],
  ),
  'cartographe': r(
    ['ford', 'footpath', 'waymark'],
    ['the silted meander', 'a hamlet’s edge', 'the unsurveyed land'],
    ['skirts', 'surveys', 'charts'],
    ['an unsurveyed', 'the staked', 'a bounded'],
    ['the map stops short of the ford', 'three leagues of path to survey', 'no letter at the coaching inn'],
  ),
  'reveur': r(
    ['staircase', 'face', 'bedroom'],
    ['the house that isn’t there', 'a replaced face', 'the room too many'],
    ['doubles', 'returns', 'climbs'],
    ['a doubled', 'the familiar', 'an unfinished'],
    ['the room had one more door', 'someone waited with no face', 'I make the trip backwards'],
  ),
  'telegraphiste': r(
    ['wire', 'receipt', 'line'],
    ['the cut line', 'a counted word', 'the wait for reply'],
    ['transmits', 'relays', 'abbreviates'],
    ['an urgent', 'the cut', 'a garbled'],
    ['urgent stop nothing comes back', 'the line has crackled since midnight', 'arrived stop no reply'],
  ),
  'ornithologiste': r(
    ['flight feather', 'clutch', 'alarm call'],
    ['the flapping flight', 'a ringed wing', 'the waiting posture'],
    ['rings', 'perches', 'broods'],
    ['a ringed', 'the migrant', 'a perched'],
    ['a flapping flight low over the marsh', 'the alarm call, then nothing', 'five hours in the hide for one wing'],
  ),
  'somnambule': r(
    ['sheet', 'corridor', 'window'],
    ['the hand in the wall', 'a staircase of water', 'the door inside the bed'],
    ['gropes', 'crosses', 'opens'],
    ['a sleeping', 'the half-open', 'a barefoot'],
    ['I walk down the stairs of water', 'the window is on the floor tonight', 'someone calls me back to bed'],
  ),
  'fossoyeur': r(
    ['grave', 'plot', 'spadework'],
    ['the next plot', 'a stone with no date', 'the damp of the soil'],
    ['digs', 'fills', 'tamps'],
    ['a filled', 'the tamped', 'a damp'],
    ['six feet, no more', 'the next plot is already taken', 'noon rings over the wheelbarrow'],
  ),
  'traducteur': r(
    ['gloss', 'root', 'variant'],
    ['the word with no equivalent', 'a lost meaning', 'the copyist’s note'],
    ['renders', 'glosses', 'transposes'],
    ['an approximate', 'the untranslatable', 'a faulty'],
    ['this word does not exist here', 'between two terms I stay', 'the copyist scratched the margin'],
  ),
  'jardinier': r(
    ['seedling', 'graft', 'mulch'],
    ['the late frost', 'a plant that takes', 'the heavy soil'],
    ['prunes', 'mulches', 'grafts'],
    ['a mulched', 'the pricked-out', 'a bolted'],
    ['the frost took the seedlings', 'the season is running early', 'we’ll start again in spring'],
  ),
  'speleologue': r(
    ['squeeze', 'sump', 'vault'],
    ['the falling drop', 'a draught of air', 'the total dark'],
    ['crawls', 'dives', 'lights'],
    ['a narrow', 'the flooded', 'a seeping'],
    ['past the sump, a chamber', 'we listen to the stone answer', 'daylight blinds us coming out'],
  ),
  'libraire': r(
    ['endpaper', 'bookplate', 'binding'],
    ['the unknown provenance', 'a loose gathering', 'the spare copy'],
    ['dusts', 'shelves', 'describes'],
    ['a bound', 'the out-of-print', 'an odd'],
    ['title page wanting', 'the cat sleeps on the till', 'a copy with no provenance'],
  ),
  'boucher': r(
    ['shank', 'sinew', 'marbling'],
    ['the cold of the chamber', 'a clean cut', 'the marrow bone'],
    ['bones', 'trims', 'carves'],
    ['a marbled', 'the trimmed', 'a hung'],
    ['against the grain, or it fights back', 'six o’clock, the cold room', 'the apron drying on the door'],
  ),
  'entomologiste': r(
    ['elytron', 'larva', 'chitin'],
    ['the cast skin', 'a folded antenna', 'the evening laying'],
    ['pins', 'stridulates', 'observes'],
    ['a chitinous', 'the pinned', 'a pupal'],
    ['the wing case opens without a sound', 'under the pin it still moves', 'the larva has waited since summer'],
  ),
  'geologue': r(
    ['stratum', 'dip', 'fault'],
    ['the fresh fracture', 'a folded schist', 'the angular unconformity'],
    ['outcrops', 'folds', 'erodes'],
    ['a folded', 'the schistose', 'a fractured'],
    ['the stratum dips to the north', 'a pebble older than us', 'the fault runs under the tent'],
  ),
  'photographe': r(
    ['frame', 'print', 'grain'],
    ['the backlight', 'a motion blur', 'the raking light'],
    ['frames', 'exposes', 'develops'],
    ['an overexposed', 'the blurred', 'a grainy'],
    ['there was someone on the right', 'the light grazed the wall', 'I remember the frame'],
  ),
  'tisserand': r(
    ['weft', 'warp', 'selvage'],
    ['the snapped thread', 'a gap between two threads', 'the wrong side of the cloth'],
    ['warps', 'knots', 'weaves'],
    ['a tight', 'the taut', 'a frayed'],
    ['a snapped thread in the weft', 'the wrong side tells the work', 'the loom has beaten since dawn'],
  ),
  'cartomancien': r(
    ['tower', 'ladder', 'hound'],
    ['the card upside down', 'an empty boat', 'the woman seen from behind'],
    ['turns over', 'spreads', 'cuts'],
    ['a reversed', 'the effaced', 'an upturned'],
    ['the tower, then the empty boat', 'a severed hand on the cloth', 'the number is erased, again'],
  ),
  'souffleur de verre': r(
    ['neck', 'bubble', 'gather'],
    ['the trapped bubble', 'a starting crack', 'the inner tension'],
    ['gathers', 'draws out', 'anneals'],
    ['a blown', 'the annealed', 'a marbled'],
    ['three o’clock, the furnace breathes', 'a bubble caught in the neck', 'you can see the street through it'],
  ),
  'alchimiste': r(
    ['sulphur', 'quicksilver', 'quicklime'],
    ['the work in black', 'a sealed vessel', 'the length of the fire'],
    ['calcines', 'sublimes', 'distils'],
    ['a calcined', 'the sublimed', 'a sealed'],
    ['forty days of even fire', 'the sulphur sets in the vessel', 'one candle fewer tonight'],
  ),
  'funambule': r(
    ['cable', 'pole', 'step'],
    ['the drop below', 'a singing rope', 'the crosswind'],
    ['crosses', 'tilts', 'steadies'],
    ['a taut', 'the swaying', 'a suspended'],
    ['one step, then the wind', 'halfway across I breathe', 'the rope sings under my foot'],
  ),
  'apiculteur': r(
    ['swarm', 'queen', 'wax'],
    ['the capped cell', 'a winter brood', 'the hum of the super'],
    ['smokes', 'forages', 'feeds'],
    ['a capped', 'the smoked', 'a honeyed'],
    ['the first sun of February', 'the swarm left without warning', 'a sting on the wrist, nothing'],
  ),
  'lexicographe': r(
    ['sense', 'cross-reference', 'headword'],
    ['the missing word', 'a neighbouring entry', 'the made-up example'],
    ['defines', 'attests', 'restricts'],
    ['an archaic', 'the rare', 'an attested'],
    ['see also: absence', 'this sense is not attested', 'a word missing between two entries'],
  ),
  'enlumineur': r(
    ['initial', 'vermilion', 'vine'],
    ['the azure ground', 'a two-headed beast', 'the devouring foliage'],
    ['gilds', 'adorns', 'illuminates'],
    ['a gilded', 'the historiated', 'an azure'],
    ['the gold goes on before the bell', 'a beast eats the margin', 'the vermilion freezes in its pot'],
  ),
  'herboriste': r(
    ['taproot', 'simple', 'decoction'],
    ['the gathering before dawn', 'a dose of three pinches', 'the bitterness of the root'],
    ['picks', 'steeps', 'doses'],
    ['a dried', 'the steeped', 'a macerated'],
    ['three pinches at the waxing moon', 'picked before the dawn speaks', 'the root soothes and purges'],
  ),
  'epistolier': r(
    ['absence', 'letter', 'date'],
    ['the address never written', 'a torn letter', 'the formal you kept'],
    ['rereads', 'folds', 'tears up'],
    ['an unsent', 'the torn', 'a folded'],
    ['I shall not send you this', 'what I did not say', 'Sunday, again, I write to you'],
  ),
  'greffier': r(
    ['minute', 'deponent', 'annex'],
    ['the box left blank', 'an attached exhibit', 'the expired deadline'],
    ['records', 'enters', 'countersigns'],
    ['the aforesaid', 'an annexed', 'a closed'],
    ['so recorded, and nothing more', 'the said deponent stays silent', 'the box is left blank'],
  ),
  'convalescent': r(
    ['bedsheet', 'thirst', 'ceiling'],
    ['the rising heat', 'a glass of tepid water', 'the endless hour'],
    ['sweats', 'gets up', 'counts'],
    ['a clammy', 'the feverish', 'a weary'],
    ['four o’clock, she’ll be coming', 'the ceiling has one more stain', 'I’ve been thirsty since morning'],
  ),
  'collecteuse': r(
    ['rhyme', 'saying', 'charm'],
    ['the thrown salt', 'a village variant', 'the nonsense refrain'],
    ['collects', 'recites', 'wards off'],
    ['a repeated', 'the warded', 'a handed-down'],
    ['salt three times, or nothing', 'you say it so it passes', 'next village they say it otherwise'],
  ),
  'psalmiste': r(
    ['face', 'rampart', 'raised hand'],
    ['the number of days', 'a calling voice', 'the shadow of the wing'],
    ['invokes', 'chants', 'implores'],
    ['a raised', 'the prostrate', 'a numbered'],
    ['count my days on your fingers', 'beneath the wing I stand', 'raise me at the first hour'],
  ),
  'notice': r(
    ['lever', 'indicator', 'opening'],
    ['the low position', 'a part not supplied', 'the expected click'],
    ['inserts', 'lowers', 'holds'],
    ['an unsupplied', 'the lowered', 'a locked'],
    ['do not force the mechanism', 'wait for the click before use', 'return the lever to low position'],
  ),
  'graveur': r(
    ['chisel', 'stroke', 'lettering'],
    ['the missing year', 'a chipped letter', 'the space remaining'],
    ['chisels', 'incises', 'sands'],
    ['a chipped', 'the engraved', 'a sanded'],
    ['the name is short, so much the better', 'no room left for the year', 'the widow haggles over letters'],
  ),
  'insomniaque': r(
    ['radiator', 'sentence', 'hour'],
    ['the day that won’t come', 'a sentence that comes back', 'the glowing clock'],
    ['broods', 'switches on', 'waits'],
    ['a wakeful', 'the lit', 'a lukewarm'],
    ['three-twelve, and still awake', 'I should have said it otherwise', 'the neighbour comes home, then the street'],
  ),
  'parfumeur': r(
    ['sillage', 'amber', 'vetiver'],
    ['the top note', 'a scent of skin', 'the first spray'],
    ['macerates', 'fixes', 'evaporates'],
    ['an amber', 'the faded', 'a woody'],
    ['the vetiver lasts till evening', 'on the blotter, my mother', 'the accord turns after an hour'],
  ),
  'prisonnier': r(
    ['skylight', 'tally', 'bowl'],
    ['the square of sky', 'a step in the corridor', 'the added bar'],
    ['scratches', 'counts', 'listens'],
    ['a barred', 'the counted', 'a latticed'],
    ['one more mark on the wall', 'the square of sky has moved', 'the guard whistles, then nothing'],
  ),
}
