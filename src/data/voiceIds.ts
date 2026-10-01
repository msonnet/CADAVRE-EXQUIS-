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
 */
export const NOMS_VOIX: Record<string, { fr: string; en: string }> = {
  'archiviste':        { fr: "L'archiviste",          en: 'The archivist' },
  'botaniste':         { fr: 'Le botaniste',          en: 'The botanist' },
  'meteorologue':      { fr: 'Le météorologue',       en: 'The meteorologist' },
  'enfant':            { fr: "L'enfant",              en: 'The child' },
  'marin':             { fr: 'Le marin',              en: 'The sailor' },
  'chimiste':          { fr: 'Le chimiste',           en: 'The chemist' },
  'cuisinier':         { fr: 'Le cuisinier',          en: 'The cook' },
  'detective':         { fr: 'Le détective',          en: 'The detective' },
  'astronome':         { fr: "L'astronome",           en: 'The astronomer' },
  'medecin':           { fr: 'Le médecin',            en: 'The doctor' },
  'musicien':          { fr: 'Le musicien',           en: 'The musician' },
  'archeologue':       { fr: "L'archéologue",         en: 'The archaeologist' },
  'horloger':          { fr: "L'horloger",            en: 'The clockmaker' },
  'cartographe':       { fr: 'Le cartographe',        en: 'The cartographer' },
  'reveur':            { fr: 'Le rêveur',             en: 'The dreamer' },
  'telegraphiste':     { fr: 'Le télégraphiste',      en: 'The telegraphist' },
  'ornithologiste':    { fr: "L'ornithologiste",      en: 'The ornithologist' },
  'somnambule':        { fr: 'Le somnambule',         en: 'The sleepwalker' },
  'fossoyeur':         { fr: 'Le fossoyeur',          en: 'The gravedigger' },
  'traducteur':        { fr: 'Le traducteur',         en: 'The translator' },
  'jardinier':         { fr: 'Le jardinier',          en: 'The gardener' },
  'speleologue':       { fr: 'Le spéléologue',        en: 'The caver' },
  'libraire':          { fr: 'Le libraire',           en: 'The bookseller' },
  'boucher':           { fr: 'Le boucher',            en: 'The butcher' },
  'entomologiste':     { fr: "L'entomologiste",       en: 'The entomologist' },
  'geologue':          { fr: 'Le géologue',           en: 'The geologist' },
  'photographe':       { fr: 'Le photographe',        en: 'The photographer' },
  'tisserand':         { fr: 'Le tisserand',          en: 'The weaver' },
  'cartomancien':      { fr: 'Le cartomancien',       en: 'The card reader' },
  'souffleur de verre':{ fr: 'Le souffleur de verre', en: 'The glassblower' },
  'alchimiste':        { fr: "L'alchimiste",          en: 'The alchemist' },
  'funambule':         { fr: 'Le funambule',          en: 'The tightrope walker' },
  'apiculteur':        { fr: "L'apiculteur",          en: 'The beekeeper' },
  'lexicographe':      { fr: 'Le lexicographe',       en: 'The lexicographer' },
  'enlumineur':        { fr: "L'enlumineur",          en: 'The illuminator' },
  'herboriste':        { fr: "L'herboriste",          en: 'The herbalist' },
  'epistolier':        { fr: "L'épistolier",          en: 'The letter-writer' },
  'greffier':          { fr: 'Le greffier',           en: 'The court clerk' },
  'convalescent':      { fr: 'Le convalescent',       en: 'The convalescent' },
  'collecteuse':       { fr: 'La collecteuse',        en: 'The collector' },
  'psalmiste':         { fr: 'Le psalmiste',          en: 'The psalmist' },
  'notice':            { fr: 'La notice',             en: 'The manual' },
  'graveur':           { fr: 'Le graveur',            en: 'The engraver' },
  'insomniaque':       { fr: "L'insomniaque",         en: 'The insomniac' },
  'parfumeur':         { fr: 'Le parfumeur',          en: 'The perfumer' },
  'prisonnier':        { fr: 'Le prisonnier',         en: 'The prisoner' },
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
