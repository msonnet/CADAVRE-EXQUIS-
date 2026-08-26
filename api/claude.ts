export const config = { maxDuration: 30 }

import { cors } from './_cors.js'
import { choisirVoixAleatoire, promptSysteme, VOIX } from './_voices.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { utilisateurDuJeton, partieReglee } from './_acces.js'
import { consigneDeterminant, familleOuvrante, FAMILLE, HORS_GN, TETES_LARGES_EN, TETES_LARGES_FR, TYPES_A_DETERMINANT } from './_determinants.js'

type TypeCase =
  | 'nom'
  | 'verbe'
  | 'verbe-transitif'
  | 'adjectif'
  | 'adverbe'
  | 'groupe-nominal'
  | 'groupe-nominal-riche'
  | 'groupe-verbal'
  | 'proposition'
  | 'libre'
  | 'article-adj'
  | 'conjonction-coord'
  | 'conjonction-subord'
  | 'infinitif'
  | 'gérondif'

// Tokens hard-cap par type — marges larges : le français tokenise lourdement,
// un plafond trop serré coupe les mots en plein milieu (« l'asymét »)
const MAX_TOKENS: Record<TypeCase, number> = {
  'nom': 8,
  'verbe': 8,
  'verbe-transitif': 8,
  'adjectif': 8,
  'adverbe': 10,
  'groupe-nominal': 10,
  'groupe-nominal-riche': 14,
  'groupe-verbal': 16,
  'proposition': 24,
  'libre': 24,
  'article-adj': 10,
  'conjonction-coord': 6,
  'conjonction-subord': 12,
  'infinitif': 8,
  'gérondif': 14,
}

// Contraintes de longueur explicites dans le prompt
const CONTRAINTES: Record<TypeCase, string> = {
  'nom': '1 MOT SEUL — jamais d\'article, jamais 2 mots (ex: "cœur", "nuage", "cendre", "os")',
  'verbe': '1 MOT — VERBE CONJUGUÉ à la 3e personne du singulier (tout temps : "dévore", "hantait", "boira", "frôle", "vacilla", "glissera"). ÉPREUVE OBLIGATOIRE avant de répondre : « il <ton mot> » ou « elle <ton mot> » doit se dire en français courant. Si tu n\'as jamais entendu ce mot conjugué, c\'est un NOM — recommence. INTERDIT ABSOLU : adjectifs (sourd, pâle, brisé…), noms (surtout les noms savants en -tion, -ment, -eur, -ance, -isme, -este), participes passés non conjugués, adverbes. Si le mot peut se lire comme un nom ("feuille", "voile", "marche"), choisis-en un autre, sans ambiguïté verbale.',
  'verbe-transitif': '1 MOT — VERBE TRANSITIF DIRECT conjugué à la 3e personne du singulier, qui appelle un complément d\'objet (tout temps : "dévore", "effleurait", "rongera", "soulève"). ÉPREUVE OBLIGATOIRE avant de répondre : « il <ton mot> quelque chose » doit se dire en français courant. Si tu n\'as jamais entendu ce mot conjugué, c\'est un NOM — recommence. INTERDIT ABSOLU : verbes intransitifs (trembler, vaciller, tressaillir…), verbes pronominaux, adjectifs, noms, adverbes. Si le mot peut se lire comme un nom ("feuille", "voile", "marche"), choisis-en un autre, sans ambiguïté verbale.',
  'adjectif': '1 MOT SEUL (adjectif qualificatif — ex : "nocturne", "brisé", "sourd", "profond")',
  'adverbe': '1 SEUL ADVERBE INVARIABLE (en -ment : "doucement", "obliquement") ou une locution adverbiale de 2 mots ("sans bruit", "à rebours"). INTERDIT ABSOLU : adjectifs (pesant, sourd…), noms, verbes.',
  'groupe-nominal': '2 MOTS EXACTEMENT : déterminant + nom — ex : "une ombre", "ce givre", "du sel", "la pluie". JAMAIS d\'adjectif après le nom.',
  'groupe-nominal-riche': '2 à 4 mots — un GROUPE NOMINAL COMPLET commençant TOUJOURS par un déterminant. VARIE la forme d\'une fois à l\'autre : article + nom ("une pluie"), article + adjectif + nom ("une vieille clef"), article + nom + adjectif ("un souffle perdu"), article + nom + complément du nom ("le bruit du vent", "la nuit sans fond"). INTERDIT ABSOLU : verbe conjugué, pronom relatif (qui, que), groupe sans déterminant.',
  'groupe-verbal': '3 à 4 mots — verbe conjugué à la 3e personne du singulier + complément AVEC son article ou sa préposition (ex : "traverse la nuit", "pèse sur le monde"). JAMAIS de complément sans article ("cède terrain" est INTERDIT, "cède du terrain" est correct).',
  'proposition': '4 à 6 mots (phrase courte)',
  'libre': '3 à 6 mots (un vers)',
  'article-adj': '2 MOTS EXACTEMENT : article défini ou indéfini + adjectif qualificatif. Exemples valides : "un sombre", "la vieille", "une pâle", "le lourd", "un creux". INTERDIT : noms, pronoms, expressions figées.',
  'conjonction-coord': "1 MOT SEUL — une conjonction de coordination ou un adverbe de liaison ('mais', 'car', 'or', 'pourtant', 'cependant', 'donc'). JAMAIS de phrase, jamais 2 mots.",
  'conjonction-subord': "1 ou 2 mots — une conjonction de subordination ('quand', 'si', 'comme', 'lorsque', 'dès que', 'tandis que', 'tant que'). JAMAIS une proposition complète.",
  'infinitif': "1 MOT SEUL — un verbe à l'infinitif (ex : 'brûler', 'attendre', 'traverser', 'descendre'). JAMAIS d'article ni de pronom.",
  'gérondif': "2 ou 3 mots — un gérondif : 'en' + participe présent (ex : 'en tombant', 'en glissant', 'en brûlant lentement'). TOUJOURS commencer par 'en'. JAMAIS de sujet.",
}

const FALLBACKS: Record<TypeCase, string[]> = {
  'nom': ['ombre', 'silence', 'nuit', 'cendre', 'vide', 'pierre', 'brume',
          'froid', 'poussière', 'vent', 'pluie', 'écho', 'flamme', 'seuil',
          'abîme', 'vertige', 'mousse', 'givre', 'encre', 'boue'],
  'verbe': ['glisse', 'brûle', 'tombe', 'tremble', 'demeure', 'se tait', 'disparaît', 'pèse',
            'erre', 'veille', 'frôle', 'hante', 'effleure', 'résiste', 'chavire', 'murmure',
            'vacille', 'sombre', 'rôde', 'dérive'],
  'verbe-transitif': ['dévore', 'effleure', 'avale', 'fissure', 'traverse', 'ronge', 'soulève',
                      'recoud', 'berce', 'creuse', 'apprivoise', 'engloutit', 'caresse', 'déchire',
                      'hante', 'épouse', 'retient', 'efface'],
  'adjectif': ['immobile', 'pâle', 'profond', 'étrange', 'brisé', 'nocturne', 'creux', 'lourd',
               'froid', 'sourd', 'amer', 'voilé', 'opaque', 'lent', 'nu', 'aigre',
               'muet', 'dense', 'sombre', 'fragile'],
  'adverbe': ['doucement', 'lentement', 'en silence', 'sans bruit', 'à jamais', 'encore', 'ailleurs',
              'en vain', 'presque', 'toujours', 'parfois', 'nulle part', 'jadis', 'désormais'],
  'groupe-nominal-riche': [
    "l'ombre portée", 'la nuit sans fond', 'un souffle perdu', 'la cendre froide',
    'le bruit du vent', 'une lumière voilée', 'la terre durcie', 'un regard vide',
    'la pluie fine', 'un mur de brume', 'la main tendue', 'un silence épais',
    'le bord du gouffre', 'une voix creuse', "l'eau noire", 'le corps absent',
    'une ombre familière', 'la porte close', 'un feu mourant', 'une vieille clef',
  ],
  'groupe-nominal': [
    "l'ombre", 'la nuit', 'un souffle', 'la cendre',
    'le bruit', 'une lumière', 'la terre', 'un regard',
    'la pluie', 'un mur', 'la main',
    'le silence', 'le bord', 'une voix', "l'eau",
    'le corps', 'une ombre', 'la porte', 'un feu',
    'le ventre', 'une bouche', 'le ciel', 'un os',
    'la pierre', 'un crâne', 'le sel', 'une racine',
    // Les autres familles : sans elles, une panne de l'API ramène le poème
    // aux douze « le » consécutifs qu'on vient d'en chasser.
    'ce seuil', 'cette faille', 'cet écart', 'ce givre',
    'du sable', 'de la suie', "de l'ambre", 'du fer',
    'mon ombre', 'sa cendre', 'ton silence', 'son gel',
    'chaque fêlure', 'nulle issue', 'aucun seuil', 'toute la nuit',
    'poussière', 'rouille', 'cendre', 'brume',
  ],
  'groupe-verbal': [
    'traverse la nuit', 'brûle en silence', "glisse dans l'ombre", 'tombe sans bruit',
    'demeure immobile', 'efface les traces', 'attend sans espoir', 'pèse sur le monde',
    'hante les couloirs', 'frôle les murs', 'résiste au vent', 'se perd dans le brouillard',
  ],
  'proposition': [
    'Que reste-t-il encore ?', 'Où vont les ombres ?', 'Qui a éteint la lumière ?',
    'Quand reviendra le froid ?', 'Pourquoi ce silence ?', 'Qui veille encore ?',
    'Que cherche-t-on ici ?', 'Où finit la nuit ?', "Qu'y a-t-il derrière ?",
    'Qui se souvient encore ?', "Jusqu'où va le vide ?", "Quand cela s'arrêtera-t-il ?",
  ],
  'libre': [
    'quelque chose demeure', 'la nuit garde tout', 'le silence répond',
    'rien ne disparaît vraiment', 'tout recommence ailleurs', "l'oubli protège",
    "les mots s'effacent", 'le temps hésite', "l'absence a une forme",
  ],
  'article-adj': [
    'un sombre', 'une vieille', 'le froid', 'une pâle', 'un beau', 'la douce',
    'un noir', 'une lente', 'le vieux', 'une étrange', 'un creux', 'la froide',
    'un lourd', 'une brisée', 'le muet', 'une profonde', 'un nu', 'la dense',
  ],
  'conjonction-coord': ['mais', 'car', 'or', 'pourtant', 'cependant', 'donc', 'et'],
  'conjonction-subord': ['quand', 'si', 'comme', 'lorsque', 'dès que', 'tandis que', 'tant que'],
  'infinitif': ['brûler', 'attendre', 'traverser', 'descendre', 'effacer', 'tenir', 'sentir', 'glisser', 'peser', 'fuir'],
  'gérondif': ['en tombant', 'en glissant', 'en brûlant', 'en tremblant', 'en dormant', 'en cherchant', 'en pleurant', 'en pesant'],
}

const ARTICLES_FR = new Set([
  'un', 'une', 'le', 'la', 'les', 'du', 'des', 'au', 'aux',
  'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
  'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'notre', 'votre', 'leur',
])

// ─── Anglais : la grammaire est le gameplay, elle se traduit intégralement ───

const ARTICLES_EN = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'one', 'some', 'no', 'every', 'each', 'another',
])

const CONTRAINTES_EN: Record<TypeCase, string> = {
  'nom': 'ONE WORD ONLY — never an article, never 2 words (ex: "heart", "cloud", "ash", "bone")',
  'verbe': 'ONE WORD — a CONJUGATED verb, third person singular, any tense ("devours", "haunted", "will drink", "grazes" — one word only, so prefer simple present or past). MANDATORY TEST before answering: "it <your word>" must be sayable in ordinary English. If you have never heard the word conjugated, it is a NOUN — start again. ABSOLUTELY FORBIDDEN: adjectives, nouns, bare infinitives, adverbs. If the word could read as a noun ("waves", "marches"), pick an unambiguous verb.',
  'verbe-transitif': 'ONE WORD — a TRANSITIVE conjugated verb, third person singular, that calls for an object ("devours", "carves", "lifts", "gnaws"). ABSOLUTELY FORBIDDEN: intransitive verbs, adjectives, nouns, adverbs.',
  'adjectif': 'ONE WORD ONLY (a qualifying adjective — ex: "nocturnal", "broken", "hollow", "deep")',
  'adverbe': 'ONE INVARIABLE ADVERB ("softly", "sideways", "forever") or a 2-word adverbial phrase ("without sound", "at dusk"). ABSOLUTELY FORBIDDEN: adjectives, nouns, verbs.',
  'groupe-nominal': 'EXACTLY 2 WORDS: article + SINGULAR noun — ex: "the silence", "a shadow", "the rain", "a knife". The noun MUST be singular (a third-person-singular verb follows). NEVER an adjective after the noun.',
  'groupe-nominal-riche': '2 to 4 words — a COMPLETE NOUN PHRASE that ALWAYS starts with a determiner, with a SINGULAR head noun (a third-person-singular verb may follow). VARY the form: article + noun ("the rain"), article + adjective + noun ("an old key"), article + noun + complement ("the sound of wind", "a wall of fog"). ABSOLUTELY FORBIDDEN: plural head nouns, conjugated verbs, relative pronouns (who, which), phrases without a determiner.',
  'groupe-verbal': '3 to 4 words — a conjugated verb (third person singular) + its complement WITH its article or preposition (ex: "crosses the night", "weighs on the world"). NEVER a bare complement.',
  'proposition': '4 to 6 words (a short question)',
  'libre': '3 to 6 words (one line of verse)',
  'article-adj': 'EXACTLY 2 WORDS: article + qualifying adjective. Valid: "a dark", "the old", "a pale", "the heavy". FORBIDDEN: nouns, pronouns, set phrases.',
  'conjonction-coord': "ONE WORD ONLY — a coordinating conjunction or linking adverb ('but', 'for', 'yet', 'however', 'therefore'). NEVER a sentence, never 2 words.",
  'conjonction-subord': "1 to 3 words — a subordinating conjunction ('when', 'if', 'while', 'as soon as', 'as long as'). NEVER a full clause.",
  'infinitif': "TWO WORDS: 'to' + verb (ex: 'to burn', 'to wait', 'to cross'). NEVER an article or pronoun.",
  'gérondif': "1 or 2 words — a gerund phrase starting with an -ing verb (ex: 'falling', 'slipping away', 'burning slowly'). NEVER a subject.",
}

const FALLBACKS_EN: Record<TypeCase, string[]> = {
  'nom': ['shadow', 'silence', 'night', 'ash', 'void', 'stone', 'mist', 'cold', 'dust', 'wind', 'rain', 'echo', 'flame', 'threshold', 'marrow', 'frost'],
  'verbe': ['slips', 'burns', 'falls', 'trembles', 'remains', 'vanishes', 'weighs', 'drifts', 'haunts', 'grazes', 'resists', 'murmurs', 'wavers', 'sinks', 'prowls'],
  'verbe-transitif': ['devours', 'grazes', 'swallows', 'cracks', 'crosses', 'gnaws', 'lifts', 'mends', 'cradles', 'digs', 'tames', 'engulfs', 'tears', 'erases'],
  'adjectif': ['motionless', 'pale', 'deep', 'strange', 'broken', 'nocturnal', 'hollow', 'heavy', 'cold', 'muffled', 'bitter', 'veiled', 'opaque', 'slow', 'bare', 'mute', 'dense', 'fragile'],
  'adverbe': ['softly', 'slowly', 'in silence', 'without sound', 'forever', 'still', 'elsewhere', 'in vain', 'almost', 'always', 'sometimes', 'nowhere'],
  'groupe-nominal': ['the shadow', 'the night', 'a breath', 'the ash', 'the sound', 'a light', 'the earth', 'a gaze', 'the rain', 'a wall', 'the hand', 'the silence', 'the edge', 'a voice', 'the water', 'the body', 'a door', 'a fire', 'this seam', 'that hollow', 'some soot', 'some amber', 'my shadow', 'its rust', 'your silence', 'each crack', 'no way out', 'dust', 'rust', 'fog'],
  'groupe-nominal-riche': ['the cast shadow', 'a bottomless night', 'a lost breath', 'the cold ash', 'the sound of wind', 'a veiled light', 'the hardened earth', 'an empty gaze', 'the thin rain', 'a wall of fog', 'the open hand', 'a thick silence', "the gulf's edge", 'a hollow voice', 'the black water', 'an old key'],
  'groupe-verbal': ['crosses the night', 'burns in silence', 'slips into shadow', 'falls without sound', 'stays motionless', 'erases the traces', 'waits without hope', 'weighs on the world', 'haunts the hallways', 'grazes the walls'],
  'proposition': ['What remains of us?', 'Where do shadows go?', 'Who put out the light?', 'When will the cold return?', 'Why this silence?', 'Who still keeps watch?', 'Where does the night end?'],
  'libre': ['something remains here', 'the night keeps everything', 'silence answers back', 'nothing truly disappears', 'it all begins elsewhere', 'the words erase themselves', 'time hesitates at the door', 'absence has a shape'],
  'article-adj': ['a dark', 'an old', 'the cold', 'a pale', 'the heavy', 'a slow', 'the black', 'a strange', 'the hollow', 'a broken', 'the mute', 'a deep'],
  'conjonction-coord': ['but', 'yet', 'for', 'however', 'therefore', 'still'],
  'conjonction-subord': ['when', 'if', 'as', 'while', 'as soon as', 'wherever'],
  'infinitif': ['to burn', 'to wait', 'to cross', 'to descend', 'to erase', 'to hold', 'to feel', 'to slip'],
  'gérondif': ['falling', 'slipping', 'burning slowly', 'drifting', 'dissolving'],
}

const ADVERBES_INVARIABLES_EN = new Set(['forever', 'still', 'elsewhere', 'almost', 'always', 'sometimes', 'nowhere', 'sideways', 'twice', 'today', 'tonight', 'yesterday'])
const TETES_LOCUTION_ADV_EN = new Set(['in', 'at', 'with', 'without', 'for', 'by'])
const OUTILS_FIN_EN = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'with', 'without', 'and', 'or', 'to', 'that', 'which', 'who'])


const ADVERBES_INVARIABLES = new Set([
  'encore', 'toujours', 'jamais', 'ailleurs', 'presque', 'parfois', 'souvent', 'déjà',
  'demain', 'hier', 'ici', 'là', 'loin', 'partout', 'jadis', 'désormais', 'soudain',
  'ensemble', 'dedans', 'dehors', 'tard', 'tôt', 'vite', 'mal', 'bien', 'peu', 'trop',
  'ensuite', 'pourtant', 'longtemps', 'autrefois', 'alentour', 'çà',
])
// Premiers mots admis pour une locution adverbiale de 2 mots (« sans bruit », « à rebours », « nulle part »)
const TETES_LOCUTION_ADV = new Set([
  'à', 'au', 'aux', 'en', 'sans', 'sous', 'de', 'par', 'pour', 'vers', 'contre',
  'dans', 'entre', 'sur', 'nulle', 'quelque', 'tout', 'là-bas',
])

// Valide et normalise la sortie du modèle selon le type attendu.
// Retourne '' si invalide (déclenchera le fallback).
export function normaliserSortie(texte: string, type: TypeCase, langue: 'fr' | 'en' = 'fr', determinant?: unknown): string {
  const t = texte.trim()
  const mots = t.split(/\s+/)
  const ARTICLES = langue === 'en' ? ARTICLES_EN : ARTICLES_FR
  // Article + tout ce qui peut tenir la tête d'un groupe nominal : quantifieur,
  // négatif, « ledit », partitif féminin. Sans ce second cercle, six des douze
  // stratégies de déterminant étaient rejetées à la sortie et repartaient en
  // réserve — la variété demandée n'arrivait jamais jusqu'au poème.
  // `ARTICLES` reste seul juge de la case article-adj, qui exige un vrai article.
  const DETERMINANTS = new Set([...ARTICLES, ...(langue === 'en' ? TETES_LARGES_EN : TETES_LARGES_FR)])
  const strategie = typeof determinant === 'string' ? determinant : undefined
  // L'élision (l'ombre, d'encre) n'existe qu'en français
  const elision = (w: string) => langue === 'fr' && /^[lLdD][''\u2019]\S+/.test(w)

  switch (type) {
    case 'article-adj': {
      if (mots.length !== 2) return ''
      if (!ARTICLES.has(mots[0].toLowerCase())) return ''
      return t
    }
    case 'nom': {
      // Cas "l'ombre" ou "d'encre" — élision sans espace → strip l' / d'
      if (mots.length === 1) return langue === 'fr' ? t.replace(/^[lLdD][''’]/, '') : t
      // Cas "le silence" / "the silence" — article séparé → strip l'article
      if (DETERMINANTS.has(mots[0].toLowerCase())) return mots.slice(1).join(' ')
      if (mots.length > 2) return mots[0]
      return t
    }
    case 'adjectif': {
      // Prendre uniquement le premier mot si le modèle a écrit une phrase
      if (mots.length > 2) return mots[0]
      return t
    }
    case 'verbe':
    case 'verbe-transitif': {
      if (mots.length > 3) return mots.slice(0, 2).join(' ')
      return t
    }
    case 'adverbe': {
      // Un adjectif glissé dans la case adverbe (« pesants ») casse l'accord du
      // vers cousu et la correction le protège ensuite comme un adverbe : on
      // n'accepte qu'un -ment, un invariable connu ou une locution adverbiale.
      if (mots.length === 1) {
        const w = mots[0].toLowerCase()
        if (langue === 'en') return /ly$/.test(w) || ADVERBES_INVARIABLES_EN.has(w) ? t : ''
        return /ment$/.test(w) || ADVERBES_INVARIABLES.has(w) ? t : ''
      }
      if (mots.length === 2 && (langue === 'en' ? TETES_LOCUTION_ADV_EN : TETES_LOCUTION_ADV).has(mots[0].toLowerCase())) return t
      return ''
    }
    case 'groupe-nominal-riche': {
      // Déterminant obligatoire (syntaxe du vers cousu), 4 mots max, et
      // jamais de coupe qui laisserait un mot-outil pendu en fin de groupe.
      const propre = t.replace(/[.,;:!?…]+$/g, '')
      let gm = propre.split(/\s+/)
      const commenceBien = DETERMINANTS.has(gm[0]?.toLowerCase()) || elision(gm[0] ?? '')
      if (!commenceBien) return ''
      if (gm.length > 4) gm = gm.slice(0, 4)
      const OUTILS_FIN = langue === 'en' ? OUTILS_FIN_EN : new Set(['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
        'sans', 'sous', 'sur', 'dans', 'en', 'à', 'et', 'ou', 'qui', 'que', "d'", "l'"])
      while (gm.length > 1 && OUTILS_FIN.has(gm[gm.length - 1].toLowerCase())) gm.pop()
      if (gm.length === 1 && !elision(gm[0])) return ''
      return gm.join(' ')
    }
    case 'groupe-nominal': {
      // Le nom nu est demandé : c'est la seule stratégie qui interdit le
      // déterminant. Si le modèle en a mis un quand même, on le retire — sinon
      // la voix qui n'use jamais d'article (le télégraphiste, le psalmiste) ne
      // parlerait pas dans sa langue.
      if (strategie === 'zero') {
        // Un nom nu n'a pas de tête à vérifier : il se vérifie par sa taille.
        // Sans cette borne, une phrase entière du modèle passerait telle quelle
        // — « L'instruction contient » est sorti comme ça une fois.
        const sansDet = DETERMINANTS.has(mots[0].toLowerCase()) ? mots.slice(1) : mots
        if (sansDet.length !== 1) return ''
        const nu = langue === 'fr' ? sansDet[0].replace(/^[lLdD]['’]/, '') : sansDet[0]
        // Le modèle capitalise volontiers un nom qu'il rend seul (« Parasite »).
        // Les vers de l'atelier n'ont pas de majuscule : celle-ci se verrait.
        return nu.charAt(0).toLowerCase() + nu.slice(1)
      }
      // Le partitif féminin fait trois mots — « de la suie ». La coupe à deux
      // le mutilait en « de la », un déterminant sans son nom.
      const tetePartitive = langue === 'fr' && mots[0]?.toLowerCase() === 'de'
      const limite = tetePartitive ? 3 : 2
      const gn = mots.length > limite ? mots.slice(0, limite).join(' ') : t
      const gm = gn.split(/\s+/)
      if (gm.length === 1) return elision(gm[0]) ? gn : ''
      // Un GN sans déterminant (« racines », « chair opposée ») casse la syntaxe
      // du vers cousu : on rejette → réserve, où le déterminant est garanti.
      if (!DETERMINANTS.has(gm[0].toLowerCase())) return ''
      // …et un groupe qui se termine sur son déterminant n'est pas un groupe.
      if (DETERMINANTS.has(gm[gm.length - 1].toLowerCase())) return ''
      return gn
    }
    case 'conjonction-coord': {
      // Strip anything past the first word — the model sometimes adds context
      return mots[0]
    }
    case 'conjonction-subord': {
      // FR : « dès que », « tandis que » (2 mots). EN : locutions à 3 mots
      // (« as soon as », « as long as ») — la coupe à 2 les mutilait.
      const max = langue === 'en' ? 3 : 2
      let cs = mots.length > max ? mots.slice(0, max).join(' ') : t
      if (langue === 'en') {
        const REPARATIONS: Record<string, string> = {
          'as long': 'as long as', 'as soon': 'as soon as', 'even': 'even if',
        }
        cs = REPARATIONS[cs.toLowerCase()] ?? cs
      }
      return cs
    }
    case 'infinitif': {
      if (langue === 'en') {
        // L'infinitif anglais du vers cousu porte son « to » — nu, il se lirait
        // comme un impératif une fois cousu au complément.
        if (mots[0].toLowerCase() === 'to' && mots.length >= 2) return mots.slice(0, 2).join(' ')
        return `to ${mots[0]}`
      }
      // Single verb at infinitive — trim any extras the model appended
      if (mots.length > 1) return mots[0]
      return t
    }
    case 'proposition': {
      // Le nettoyage générique coupe la ponctuation finale : une question la
      // retrouve ici — « ? » collé en anglais, espacé à la française en français.
      const sans = t.replace(/[\s?!.…]+$/g, '')
      if (!sans) return ''
      return langue === 'en' ? `${sans}?` : `${sans} ?`
    }
    case 'gérondif': {
      // FR : doit commencer par « en » ; EN : par un verbe en -ing
      if (langue === 'en') { if (!/ing$/.test(mots[0].toLowerCase())) return '' }
      else if (mots[0].toLowerCase() !== 'en') return ''
      if (mots.length > 3) return mots.slice(0, 3).join(' ')
      return t
    }
    default:
      return t
  }
}

function pickFallback(type: TypeCase, eviter: string[] = [], langue: 'fr' | 'en' = 'fr', determinant?: unknown): string {
  const table = langue === 'en' ? FALLBACKS_EN : FALLBACKS
  let arr = table[type] ?? table['libre']
  // La stratégie de déterminant vaut aussi pour la réserve : sinon la panne
  // rend exactement la monotonie que la stratégie sert à défaire.
  const famille = typeof determinant === 'string' ? FAMILLE[determinant] : undefined
  if (famille && TYPES_A_DETERMINANT.has(type)) {
    const conformes = arr.filter(m => familleOuvrante(m) === famille)
    if (conformes.length) arr = conformes
  }
  // Prefer fallback words that haven't already been used in the game
  const used = new Set(eviter.map(m => m.toLowerCase()))
  const dispo = arr.filter(m => !used.has(m.toLowerCase()))
  const pool = dispo.length ? dispo : arr
  return pool[Math.floor(Math.random() * pool.length)]
}

const TYPES_VALIDES: Set<string> = new Set([
  'nom', 'verbe', 'verbe-transitif', 'adjectif', 'adverbe',
  'groupe-nominal', 'groupe-nominal-riche', 'groupe-verbal',
  'proposition', 'libre', 'article-adj',
  'conjonction-coord', 'conjonction-subord', 'infinitif', 'gérondif',
])

export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 60)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' })
    return
  }

  const { consigne, type, voiceId, contexte, eviter, mots, partieId, determinant, langue: langueBrute } = req.body ?? {}
  const langue: 'fr' | 'en' = langueBrute === 'en' ? 'en' : 'fr'

  // ── Accès ───────────────────────────────────────────────────────────────
  // La partie a été réglée une fois pour toutes à son ouverture, sur
  // /api/acces. Ici on ne fait que vérifier qu'elle l'a bien été : un poème
  // ne doit jamais s'interrompre en cours de route.
  const userId = await utilisateurDuJeton(req)
  if (!userId) { res.status(401).json({ error: 'auth_requise' }); return }
  if (typeof partieId !== 'string' || !(await partieReglee(userId, partieId))) {
    res.status(402).json({ error: 'partie_non_reglee' })
    return
  }

  if (typeof consigne !== 'string' || typeof type !== 'string' || !consigne || !type) {
    res.status(400).json({ error: 'Champs manquants : consigne et type requis.' })
    return
  }
  if (!TYPES_VALIDES.has(type)) {
    res.status(400).json({ error: 'type invalide' })
    return
  }
  if (consigne.length > 200 || (typeof contexte === 'string' && contexte.length > 500)) {
    res.status(400).json({ error: 'champs trop longs' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    res.status(200).json({ texte: pickFallback(type as TypeCase, [], langue, determinant), source: 'fallback' })
    return
  }

  const voix = voiceId
    ? (VOIX.find(v => v.id === voiceId) ?? choisirVoixAleatoire())
    : choisirVoixAleatoire()
  // Mode atelier : nombre de mots imposé dynamiquement (1 à 8) — prime sur la contrainte du type
  const motsCible = Number.isInteger(mots) && mots >= 1 && mots <= 8 ? (mots as number) : null
  const maxTokens = motsCible
    ? Math.min(motsCible * 4 + 8, 44)
    : (MAX_TOKENS[type as TypeCase] ?? 14)
  // Vers entier ('libre') : la voix écrit seule tout le vers — il doit être
  // grammatical et garder ses articles. « N mots exactement, pas une phrase
  // complète » produisait des télégrammes (« câble vibre chair absente froide »).
  const contrainte = motsCible
    ? (type === 'libre'
      ? `environ ${motsCible} mots — un vers COMPLET et grammatical : un sujet avec son article et un verbe conjugué, ou une image nominale complète. JAMAIS de style télégraphique : chaque nom garde son article. Sans ponctuation finale.`
      : `${motsCible} MOT${motsCible > 1 ? 'S' : ''} EXACTEMENT — un fragment de vers, pas une phrase complète, sans ponctuation`)
    : ((langue === 'en' ? CONTRAINTES_EN : CONTRAINTES)[type as TypeCase] ?? '2 à 4 mots')

  // ── La stratégie de déterminant ────────────────────────────────────────
  // Douze vers consécutifs ouvraient sur « le » ou « la » dans un atelier de
  // trente vers. La cause était ici : la contrainte est la même pour les 46
  // voix, et le déterminant n'était donc pas un choix. Le client tire
  // maintenant une stratégie dans l'idiolecte de la voix qui parle ; le
  // serveur la met en mots, et lui seul — une clé ne peut rien injecter.
  // Le nom nu est le seul cas où la stratégie ne s'AJOUTE pas à la contrainte :
  // elle la remplace. « 2 mots exactement : déterminant + nom » suivi de « ce
  // groupe n'a aucun déterminant » est une contradiction, et le modèle
  // répondait ce que fait un modèle devant une contradiction — il la
  // commentait (« L'instruction contient… »).
  const nomNu = determinant === 'zero' && type === 'groupe-nominal'
  // Un groupe nominal RICHE porte un adjectif ou un complément : sa contrainte
  // exige un déterminant, le nom nu s'y contredirait aussi. On l'ignore.
  const strategieRecevable = !(determinant === 'zero' && type === 'groupe-nominal-riche')
  const consigneDet = strategieRecevable
    && (TYPES_A_DETERMINANT.has(type) || (type === 'libre' && determinant === HORS_GN))
    ? consigneDeterminant(determinant, langue)
    : ''
  const contrainteComplete = nomNu
    ? (langue === 'en'
      ? 'ONE WORD ONLY: a bare singular noun, NO article at all — ex: "dust", "rust", "ash", "fog".'
      : "1 MOT SEUL : un nom au singulier, SANS aucun article — ex : « poussière », « rouille », « cendre », « brume ».")
    : (consigneDet ? `${contrainte} ${consigneDet}` : contrainte)

  // Strip the « — ex : … » part so examples never influence the AI (they're only for human players)
  const consigneIA = consigne.replace(/\s*[—–-]\s*ex\s*:.*$/i, '').trim()

  const echoLine = contexte
    ? (langue === 'en'
      ? `\nYou hear an echo: "${contexte}". Bounce off it or ignore it — stay in your own world.`
      : `\nTu entends en écho : "${contexte}". Libre à toi d'y rebondir ou de l'ignorer — reste dans ton propre monde.`)
    : ''

  // Anti-répétition : liste des mots déjà employés dans la partie, à ne jamais réutiliser.
  // Le vocabulaire reste libre — on interdit seulement les doublons exacts déjà sortis.
  const motsEviter = Array.isArray(eviter)
    ? [...new Set(eviter.filter((m: unknown): m is string => typeof m === 'string' && m.trim().length > 0)
        .map((m: string) => m.trim().toLowerCase()))].slice(0, 60)
    : []
  const eviterLine = motsEviter.length
    ? (langue === 'en'
      ? `\nABSOLUTELY FORBIDDEN to reuse these already-used words, or any word sharing their stem (find something else): ${motsEviter.join(', ')}.`
      // « un macérat » puis « macère » : deux mots différents, un seul radical.
      // La liste ne portait que sur les formes exactes.
      : `\nINTERDICTION ABSOLUE de réutiliser ces mots déjà employés, ni aucun mot de la même famille — même radical, autre terminaison (trouve autre chose) : ${motsEviter.join(', ')}.`)
    : ''

  // L'empreinte de la voix, à toutes les tailles de fragment.
  //
  // Elle n'était donnée qu'aux vers entiers, et le résultat se mesurait : sur
  // un vers, les six voix testées étaient toutes reconnaissables ; sur un
  // groupe nominal de deux mots, quatre sur douze seulement. Le boucher
  // rendait « la nacre », l'horloger « le souffle » — des mots que n'importe
  // qui aurait pu poser. Or les fragments courts sont l'immense majorité du
  // jeu : c'est là que la distinction entre les 46 voix se gagne ou se perd.
  const personaLine = type === 'libre'
    ? (langue === 'en'
      ? "\nThis full line must carry your signature: one concrete thing from your own world. Don't try to surprise — set down what you have in front of you, in your own terms. What sets you apart is exactness."
      : "\nCe vers entier doit porter ton empreinte : une chose concrète, prise dans ton univers propre. Ne cherche pas à surprendre — note ce que tu as devant toi, dans les termes qui sont les tiens. C'est ton exactitude qui te distingue.")
    : (langue === 'en'
      ? "\nEven this short, the fragment must be yours: take the word from the world you work in — what you handle, weigh, watch, fear. The word only you would put here, not a vague one that would suit anybody."
      : "\nMême aussi court, le fragment doit être le tien : prends le mot dans le monde où tu travailles — ce que tu manipules, pèses, observes, redoutes. Le mot que toi seul mettrais là, pas un mot vague qui irait à n'importe qui.")

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25_000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        // Vers entiers ('libre') : Opus 4.8 — c'est là que la qualité poétique se joue.
        // Fragments d'1 à 4 mots : Sonnet 4.6 suffit, plus rapide.
        model: type === 'libre' ? 'claude-opus-4-8' : 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        stop_sequences: ['.', '!', '?'],
        system: langue === 'en'
          ? promptSysteme(voix, type) + "\n\nIMPORTANT : cette partie se joue en ANGLAIS. Tu écris ton fragment en anglais, dans ta manière propre — ton lexique se traduit, il ne se remplace pas."
          : promptSysteme(voix, type),
        messages: [
          {
            role: 'user',
            content: langue === 'en'
              ? `Write ONLY the requested fragment, no final punctuation, no explanation.\nType: ${consigneIA}.\nAbsolute constraint: ${contrainteComplete}.\nStay true to your way of seeing. Avoid the most expected word and clichés.${echoLine}${eviterLine}${personaLine}\nAnswer with the fragment alone.`
              : `Écris UNIQUEMENT le fragment demandé, sans ponctuation finale, sans explication.\nType : ${consigneIA}.\nContrainte absolue : ${contrainteComplete}.\nReste fidèle à ta manière de voir. Évite le mot le plus attendu et les clichés.${echoLine}${eviterLine}${personaLine}\nRéponds avec le fragment seul.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}`)
    }

    const data = await response.json()
    const brut = (data.content?.[0]?.text ?? '').trim()
    let propre = brut
      .replace(/\*+([^*]*)\*+/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\d{1,2}\s+\w+\s+\d{4}/g, '')
      .replace(/[.!?;,]+$/, '')
      .trim()

    // Plafond de tokens atteint → le dernier mot est probablement tronqué (« l'asymét ») : on le retire
    if (data.stop_reason === 'max_tokens') {
      propre = propre.replace(/\s*\S+$/, '').trim()
    }

    // Detect meta-responses where the AI explains its task instead of generating poetic content
    const isMetaResponse =
      /^je vais\b/i.test(propre) ||
      /^voici\b/i.test(propre) ||
      /^d['']accord\b/i.test(propre) ||
      /^bien s[uû]r\b/i.test(propre) ||
      /^pour\s+(répondre|compléter|créer|générer)\b/i.test(propre) ||
      /^(la |le |l['’])?(consigne|instruction|contrainte|demande|réponse)\b/i.test(propre) ||
      /^(the |this )?(instruction|constraint|request|prompt)\b/i.test(propre) ||
      /\bétapes?\b/i.test(propre) ||
      /^(here is|here's|sure|of course|i will|i'll|to (answer|complete|create|generate))\b/i.test(propre) ||
      propre.endsWith(':')

    let texte = isMetaResponse ? '' : normaliserSortie(propre, type as TypeCase, langue, determinant)
    // Si un nombre de mots est imposé, tronquer doucement les débordements.
    // Pour un vers entier ('libre'), couper en plein vers recréerait le
    // télégramme : on tolère le dépassement, garde-fou à 9 mots seulement.
    if (texte && motsCible) {
      const m = texte.split(/\s+/)
      const plafond = type === 'libre' ? Math.max(motsCible + 3, 9) : motsCible + 1
      if (m.length > plafond) texte = m.slice(0, type === 'libre' ? plafond : motsCible).join(' ')
    }
    res.status(200).json({
      texte: texte || pickFallback(type as TypeCase, motsEviter, langue, determinant),
      source: texte ? 'ia' : 'fallback',
      voixNom: voix.id,
    })
  } catch (err) {
    console.error('Erreur Claude API:', err)
    res.status(200).json({ texte: pickFallback(type as TypeCase, motsEviter, langue, determinant), source: 'fallback' })
  } finally {
    clearTimeout(timer)
  }
}
