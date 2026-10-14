// IDs des 46 voix anonymes — doit rester synchronisé avec api/_voices.ts
export const VOICE_IDS = [
  'archiviste', 'botaniste', 'meteorologue', 'enfant', 'marin',
  'chimiste', 'cuisinier', 'detective', 'astronome', 'medecin',
  'musicien', 'archeologue', 'horloger', 'cartographe', 'reveur',
  'telegraphiste', 'ornithologiste', 'somnambule', 'fossoyeur', 'traducteur',
  'jardinier', 'speleologue', 'libraire', 'boucher', 'entomologiste',
  'geologue', 'photographe', 'tisserand', 'cartomancien', 'souffleur de verre',
  'alchimiste', 'funambule', 'apiculteur', 'lexicographe', 'enlumineur',
  'herboriste', 'epistolier', 'greffier', 'convalescent', 'collecteuse',
  'psalmiste', 'notice', 'graveur', 'insomniaque', 'parfumeur',
  'prisonnier',
] as const

/**
 * Le nom sous lequel chaque voix se présente au joueur, article compris.
 *
 * Il ne servait à rien jusqu'ici : le tour de l'IA affichait « La voix
 * parle… », anonyme, et le nom n'apparaissait qu'après la partie, dans les
 * coutures. La différence entre les 46 voix n'avait aucune chance de
 * s'inscrire au moment où elle se produisait.
 *
 * L'article est écrit en dur plutôt que déduit : « L'apiculteur » demande
 * l'élision, « La collecteuse » le féminin, « La notice » n'est pas une
 * personne. Aucune règle ne couvre les trois.
 *
 * ── Le genre, et la parité ────────────────────────────────────────────────
 *
 * Jusqu'au 14 octobre, quarante-quatre noms sur quarante-six étaient
 * masculins — y compris là où le français n'en demandait rien : « Le
 * cartographe », « Le photographe », « Le somnambule ». Une seule voix,
 * la collecteuse, était une femme. Et l'écran de la voix écrivait « elle
 * dépose son fragment » sous « Le cartographe » : « elle » parlait de LA
 * voix, le joueur lisait un homme.
 *
 * Vingt-trois voix sont désormais des femmes, vingt-deux des hommes, et la
 * notice reste un objet. Le partage ne suit pas les clichés de métier dans
 * un sens ni dans l'autre : la bouchère, la graveuse d'épitaphes, la
 * détective, la prisonnière ; le tisserand, le jardinier, le parfumeur. Les
 * noms épicènes à élision (« L'archiviste ») ne montrent pas leur genre :
 * il se lit dans le pronom de l'écran de la voix et dans sa persona
 * (`api/_voices.ts`), qui dit « Tu es une archiviste ».
 *
 * `genre` est le genre grammatical du nom, celui qu'accordent les pronoms.
 * `objet` : la voix n'est pas une personne (« it » en anglais).
 */
export const NOMS_VOIX: Record<string, { fr: string; en: string; genre: 'f' | 'm'; objet?: true }> = {
  'archiviste':        { fr: "L'archiviste",          en: 'The archivist',         genre: 'f' },
  'botaniste':         { fr: 'Le botaniste',          en: 'The botanist',          genre: 'm' },
  'meteorologue':      { fr: 'La météorologue',       en: 'The meteorologist',     genre: 'f' },
  'enfant':            { fr: "L'enfant",              en: 'The child',             genre: 'm' },
  'marin':             { fr: 'Le marin',              en: 'The sailor',            genre: 'm' },
  'chimiste':          { fr: 'La chimiste',           en: 'The chemist',           genre: 'f' },
  'cuisinier':         { fr: 'Le cuisinier',          en: 'The cook',              genre: 'm' },
  'detective':         { fr: 'La détective',          en: 'The detective',         genre: 'f' },
  'astronome':         { fr: "L'astronome",           en: 'The astronomer',        genre: 'm' },
  'medecin':           { fr: 'La médecin',            en: 'The doctor',            genre: 'f' },
  'musicien':          { fr: 'La musicienne',         en: 'The musician',          genre: 'f' },
  'archeologue':       { fr: "L'archéologue",         en: 'The archaeologist',     genre: 'm' },
  'horloger':          { fr: "L'horloger",            en: 'The clockmaker',        genre: 'm' },
  'cartographe':       { fr: 'La cartographe',        en: 'The cartographer',      genre: 'f' },
  'reveur':            { fr: 'Le rêveur',             en: 'The dreamer',           genre: 'm' },
  'telegraphiste':     { fr: 'La télégraphiste',      en: 'The telegraphist',      genre: 'f' },
  'ornithologiste':    { fr: "L'ornithologiste",      en: 'The ornithologist',     genre: 'm' },
  'somnambule':        { fr: 'La somnambule',         en: 'The sleepwalker',       genre: 'f' },
  'fossoyeur':         { fr: 'Le fossoyeur',          en: 'The gravedigger',       genre: 'm' },
  'traducteur':        { fr: 'La traductrice',        en: 'The translator',        genre: 'f' },
  'jardinier':         { fr: 'Le jardinier',          en: 'The gardener',          genre: 'm' },
  'speleologue':       { fr: 'La spéléologue',        en: 'The caver',             genre: 'f' },
  'libraire':          { fr: 'Le libraire',           en: 'The bookseller',        genre: 'm' },
  'boucher':           { fr: 'La bouchère',           en: 'The butcher',           genre: 'f' },
  'entomologiste':     { fr: "L'entomologiste",       en: 'The entomologist',      genre: 'f' },
  'geologue':          { fr: 'Le géologue',           en: 'The geologist',         genre: 'm' },
  'photographe':       { fr: 'La photographe',        en: 'The photographer',      genre: 'f' },
  'tisserand':         { fr: 'Le tisserand',          en: 'The weaver',            genre: 'm' },
  'cartomancien':      { fr: 'Le cartomancien',       en: 'The card reader',       genre: 'm' },
  'souffleur de verre':{ fr: 'Le souffleur de verre', en: 'The glassblower',       genre: 'm' },
  'alchimiste':        { fr: "L'alchimiste",          en: 'The alchemist',         genre: 'f' },
  'funambule':         { fr: 'La funambule',          en: 'The tightrope walker',  genre: 'f' },
  'apiculteur':        { fr: "L'apiculteur",          en: 'The beekeeper',         genre: 'm' },
  'lexicographe':      { fr: 'La lexicographe',       en: 'The lexicographer',     genre: 'f' },
  'enlumineur':        { fr: "L'enlumineur",          en: 'The illuminator',       genre: 'm' },
  'herboriste':        { fr: "L'herboriste",          en: 'The herbalist',         genre: 'f' },
  'epistolier':        { fr: "L'épistolière",         en: 'The letter-writer',     genre: 'f' },
  'greffier':          { fr: 'Le greffier',           en: 'The court clerk',       genre: 'm' },
  'convalescent':      { fr: 'La convalescente',      en: 'The convalescent',      genre: 'f' },
  'collecteuse':       { fr: 'La collecteuse',        en: 'The collector',         genre: 'f' },
  'psalmiste':         { fr: 'Le psalmiste',          en: 'The psalmist',          genre: 'm' },
  'notice':            { fr: 'La notice',             en: 'The manual',            genre: 'f', objet: true },
  'graveur':           { fr: 'La graveuse',           en: 'The engraver',          genre: 'f' },
  'insomniaque':       { fr: "L'insomniaque",         en: 'The insomniac',         genre: 'm' },
  'parfumeur':         { fr: 'Le parfumeur',          en: 'The perfumer',          genre: 'm' },
  'prisonnier':        { fr: 'La prisonnière',        en: 'The prisoner',          genre: 'f' },
}

/**
 * Les noms français d'avant la parité. Des poèmes du recueil les gardent
 * écrits en toutes lettres (l'Atelier garde le NOM affiché) : sans eux, le
 * registre perdrait leurs voix. Lus seulement pour retrouver l'identifiant ;
 * l'affichage rend toujours le nom d'aujourd'hui (`nomAffiche`).
 */
const NOMS_ANCIENS: Record<string, string> = {
  'meteorologue': 'Le météorologue', 'chimiste': 'Le chimiste', 'detective': 'Le détective',
  'medecin': 'Le médecin', 'musicien': 'Le musicien', 'cartographe': 'Le cartographe',
  'telegraphiste': 'Le télégraphiste', 'somnambule': 'Le somnambule', 'traducteur': 'Le traducteur',
  'speleologue': 'Le spéléologue', 'boucher': 'Le boucher', 'photographe': 'Le photographe',
  'funambule': 'Le funambule', 'lexicographe': 'Le lexicographe', 'epistolier': "L'épistolier",
  'convalescent': 'Le convalescent', 'graveur': 'Le graveur', 'prisonnier': 'Le prisonnier',
}

/**
 * Les pronoms qui renvoient à la voix, accordés à son NOM et non au mot
 * « voix ». Une voix inconnue est « la voix » : elle, it.
 */
export function pronomsDeVoix(id: string | undefined, langue: 'fr' | 'en'): { sujet: string; objet: string; possessif: string } {
  const n = id ? NOMS_VOIX[id] : undefined
  if (langue === 'fr') {
    return n?.genre === 'm'
      ? { sujet: 'il', objet: 'le', possessif: 'son' }
      : { sujet: 'elle', objet: 'la', possessif: 'son' }
  }
  if (!n || n.objet) return { sujet: 'it', objet: 'it', possessif: 'its' }
  return n.genre === 'f'
    ? { sujet: 'she', objet: 'her', possessif: 'her' }
    : { sujet: 'he', objet: 'him', possessif: 'his' }
}

/** Le nom de la voix dans la langue courante, ou « La voix » si l'id est inconnu. */
export function nomDeVoix(id: string | undefined, langue: 'fr' | 'en'): string {
  const n = id ? NOMS_VOIX[id] : undefined
  if (!n) return langue === 'en' ? 'The voice' : 'La voix'
  return langue === 'en' ? n.en : n.fr
}

/**
 * Retrouve l'identifiant d'une voix depuis ce que le recueil a gardé d'elle.
 *
 * Le recueil n'écrit pas la voix d'une seule façon. Le cadavre écrit, le
 * salon et le poème du jour gardent l'identifiant que le serveur renvoie
 * (« meteorologue ») ; l'Atelier garde le NOM affiché à la fin de la séance,
 * dans la langue du moment (« Le météorologue », « The meteorologist »), et
 * parfois plusieurs noms joints par « · ». Le registre des voix doit
 * reconnaître la même voix sous ces trois écritures, sinon une voix
 * rencontrée à l'Atelier et au cadavre écrit y aurait deux fiches.
 *
 * La casse et l'apostrophe typographique sont ignorées : des poèmes anciens
 * gardent « le fossoyeur » en minuscules. Un nom inconnu rend `null` — on
 * ne devine pas.
 */
const cle = (s: string) => s.toLocaleLowerCase('fr').replace(/[’ʼ]/g, "'").trim()
const PAR_NOM: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const id of VOICE_IDS) {
    m.set(cle(id), id)
    m.set(cle(NOMS_VOIX[id].fr), id)
    m.set(cle(NOMS_VOIX[id].en), id)
  }
  for (const [id, nom] of Object.entries(NOMS_ANCIENS)) m.set(cle(nom), id)
  return m
})()

export function idDeVoix(nom: string | undefined | null): string | null {
  if (!nom) return null
  return PAR_NOM.get(cle(nom)) ?? null
}

/** Les voix nommées par un `voixNom` de case — un seul nom, ou plusieurs joints par « · ». */
export function nomsDeVoix(voixNom: string | undefined | null): string[] {
  if (!voixNom) return []
  return voixNom.split(' · ').map(s => s.trim()).filter(Boolean)
}
