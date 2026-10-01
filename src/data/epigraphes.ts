/**
 * L'épigraphe de chaque voix, telle que le registre l'imprime sous son nom.
 *
 * ── Ce qui manquait ───────────────────────────────────────────────────────
 *
 * Les quarante-six personas portent la meilleure écriture du dépôt, et le
 * joueur n'en voyait qu'un nom : « Le chimiste écrit… » pendant le tour, un
 * nom en italique dans les coutures. Rien ne disait d'où parle une voix, et
 * rien ne permettait de retrouver celle qu'on avait aimée.
 *
 * ── Ce qu'une épigraphe dit, et ce qu'elle tait ───────────────────────────
 *
 * Une ligne à la troisième personne : un métier, un lieu, un objet — ce
 * qu'imprimerait l'index des contributeurs d'une revue. Elle est écrite à la
 * main, une fois ; ce n'est pas de la génération.
 *
 * Elle ne paraphrase JAMAIS l'enjeu de la voix (`api/_voices.ts`). Le prompt
 * le pose comme caché — « Tu n'en parles pas, mais c'est de là que tu
 * regardes » — et l'imprimer ici expliquerait la voix au lieu de la
 * présenter. `epigraphes.test.ts` le vérifie mot à mot : aucune épigraphe ne
 * partage un mot plein avec l'enjeu de sa voix.
 *
 * Le client n'importe pas `api/` : les épigraphes vivent donc ici, à côté
 * des noms, et un test tient les deux listes d'accord.
 */
export const EPIGRAPHES: Record<string, { fr: string; en: string }> = {
  'archiviste':        { fr: 'Comble des blancs dans de vieux catalogues, sous une verrière.', en: 'Fills the blanks of old catalogues, under a glass roof.' },
  'botaniste':         { fr: "Décrit des feuilles pour un herbier, une loupe rayée à la main.", en: 'Describes leaves for a herbarium, a scratched lens in hand.' },
  'meteorologue':      { fr: 'Tient des bulletins pour une radio rurale.', en: 'Writes the forecasts for a country radio station.' },
  'enfant':            { fr: 'Sept ans, les yeux fermés dans le noir.', en: 'Seven years old, eyes shut in the dark.' },
  'marin':             { fr: 'Trente ans de journal de bord, des cartes usées.', en: 'Thirty years of logbooks, worn charts.' },
  'chimiste':          { fr: "Rédige des comptes rendus d'expérience, en blouse trop grande.", en: 'Writes up experiments, in a coat too large.' },
  'cuisinier':         { fr: 'Chef étoilé, dicte ses recettes entre deux services.', en: 'A starred chef, dictating recipes between two sittings.' },
  'detective':         { fr: 'Rédige des rapports de filature dans une voiture qui sent le tabac.', en: 'Writes surveillance reports in a car that smells of tobacco.' },
  'astronome':         { fr: 'Quarante ans de carnets de nuit, une lampe rouge.', en: 'Forty years of night notebooks, a red lamp.' },
  'medecin':           { fr: 'Médecin de campagne, une sacoche sur le siège passager.', en: 'A country doctor, a bag on the passenger seat.' },
  'musicien':          { fr: "Traduit ses compositions en mots, la fenêtre ouverte l'été.", en: 'Turns compositions into words, the window open in summer.' },
  'archeologue':       { fr: 'Tient un carnet de fouilles, de la poussière dans les cheveux.', en: 'Keeps a dig notebook, dust in the hair.' },
  'horloger':          { fr: 'Maître horloger, un atelier au-dessus de la rue.', en: 'A master clockmaker, a workshop above the street.' },
  'cartographe':       { fr: 'Cartographe du XVIIIᵉ siècle, décrit les chemins à la chandelle.', en: 'An eighteenth-century cartographer, describing roads by candlelight.' },
  'reveur':            { fr: "Note ses rêves à tâtons, avant d'ouvrir les yeux.", en: 'Writes down dreams by touch, before opening the eyes.' },
  'telegraphiste':     { fr: 'Ancien télégraphiste, compte les mots.', en: 'A former telegraphist, counting words.' },
  'ornithologiste':    { fr: "Tient un registre d'oiseaux dans un affût humide.", en: 'Keeps a register of birds from a damp hide.' },
  'somnambule':        { fr: "Parle en marchant la nuit ; d'autres transcrivent.", en: 'Talks while walking at night; others take it down.' },
  'fossoyeur':         { fr: "Tient le registre des fosses d'un cimetière communal.", en: 'Keeps the register of graves in a town cemetery.' },
  'traducteur':        { fr: 'Traduit un idiome ancien sous une lampe basse.', en: 'Translates an ancient tongue under a low lamp.' },
  'jardinier':         { fr: 'Cinquante ans de carnets de jardin, un banc sous le tilleul.', en: 'Fifty years of garden notebooks, a bench under the lime tree.' },
  'speleologue':       { fr: 'Décrit des grottes à la lampe frontale.', en: 'Describes caves by headlamp.' },
  'libraire':          { fr: 'Range des livres anonymes dans une boutique qui ne chauffe pas.', en: 'Shelves anonymous books in an unheated shop.' },
  'boucher':           { fr: 'Maître boucher, parle bas près de la chambre froide.', en: 'A master butcher, speaking low by the cold room.' },
  'entomologiste':     { fr: 'Épingle des insectes dans des boîtes à cigares.', en: 'Pins insects in cigar boxes.' },
  'geologue':          { fr: 'Décrit des roches, un marteau au ceinturon.', en: 'Describes rocks, a hammer at the belt.' },
  'photographe':       { fr: 'Photographe devenu aveugle, raconte ses anciens tirages.', en: 'A photographer gone blind, recounting old prints.' },
  'tisserand':         { fr: 'Décrit ses toiles par lettre, depuis un atelier au nord.', en: 'Describes cloth by letter, from a north-facing workshop.' },
  'cartomancien':      { fr: 'Lit un jeu ancien sur une table cirée.', en: 'Reads an old deck on a waxed table.' },
  'souffleur de verre':{ fr: 'Souffle le verre pour un collectionneur aveugle.', en: 'Blows glass for a blind collector.' },
  'alchimiste':        { fr: 'Tient le journal du fourneau, dans une cave.', en: 'Keeps the furnace journal, in a cellar.' },
  'funambule':         { fr: 'Après chaque traversée, note le vent et la foule.', en: 'After every crossing, notes the wind and the crowd.' },
  'apiculteur':        { fr: "Tient le journal de ses abeilles, au fond d'un verger.", en: 'Keeps a journal of bees, at the end of an orchard.' },
  'lexicographe':      { fr: 'Rédige des fiches pour un dictionnaire de mots nécessaires.', en: 'Writes index cards for a dictionary of necessary words.' },
  'enlumineur':        { fr: 'Peint des enluminures dans un scriptorium froid.', en: 'Paints illuminations in a cold scriptorium.' },
  'herboriste':        { fr: "Recueille des simples avant l'aube.", en: 'Gathers simples before dawn.' },
  'epistolier':        { fr: 'Écrit une lettre chaque soir et garde le tiroir fermé.', en: 'Writes a letter every evening and keeps the drawer shut.' },
  'greffier':          { fr: 'Rédige des procès-verbaux, la manche lustrée.', en: 'Writes court records, sleeves worn shiny.' },
  'convalescent':      { fr: 'Note dans un cahier ce que traverse un corps en fièvre.', en: 'Notes in an exercise book what passes through a feverish body.' },
  'collecteuse':       { fr: 'Recueille des comptines de village en village.', en: 'Gathers rhymes from village to village.' },
  'psalmiste':         { fr: 'Transcrit des litanies à la première heure.', en: 'Transcribes litanies at the first hour.' },
  'notice':            { fr: "Modes d'emploi pour des machines à la fonction obscure.", en: 'Instructions for machines of obscure purpose.' },
  'graveur':           { fr: 'Grave des épitaphes dans un atelier contre le cimetière.', en: 'Carves epitaphs in a workshop by the cemetery.' },
  'insomniaque':       { fr: 'Note, la nuit, les phrases qui tournent au plafond.', en: 'At night, writes down the sentences circling the ceiling.' },
  'parfumeur':         { fr: 'Compose des accords de parfum dans un laboratoire sans fenêtre.', en: 'Composes accords of perfume in a windowless laboratory.' },
  'prisonnier':        { fr: "Grave des mots sur le mur d'une cellule.", en: 'Carves words on a cell wall.' },
}
