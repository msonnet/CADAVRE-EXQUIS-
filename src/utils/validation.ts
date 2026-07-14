// Validation grammaticale legere — heuristiques, pas de NLP lourd
import { langueActuelle } from '../i18n'

// ─── 500 verbes courants (formes conjuguees frequentes) ──────────────────────
const VERBES: Set<string> = new Set([
  // Etre / avoir
  'est','sont','etait','etaient','sera','seront','serait','seraient','soit','soient',
  'a','ont','avait','avaient','aura','auront','aurait','auraient',
  // Aller / venir / faire
  'va','vont','allait','allaient','ira','iront','irait','iraient',
  'vient','viennent','venait','venaient','viendra','viendront',
  'fait','font','faisait','faisaient','fera','feront','ferait','feraient',
  // Voir / savoir / pouvoir / vouloir / devoir
  'voit','voient','voyait','voyaient','verra','verront',
  'sait','savent','savait','savaient','saura','sauront',
  'peut','peuvent','pouvait','pouvaient','pourra','pourront','pourrait','pourraient',
  'veut','veulent','voulait','voulaient','voudra','voudront','voudrait','voudraient',
  'doit','doivent','devait','devaient','devra','devront','devrait','devraient',
  // Verbes du 1er groupe — formes frequentes
  'aime','aiment','aimait','aimaient','aimera','aimeront','aimerait','aimeraient',
  'parle','parlent','parlait','parlaient','parlera','parleront',
  'marche','marchent','marchait','marchaient',
  'mange','mangent','mangeait','mangeaient',
  'pense','pensent','pensait','pensaient',
  'donne','donnent','donnait','donnaient',
  'porte','portent','portait','portaient',
  'trouve','trouvent','trouvait','trouvaient',
  'regarde','regardent','regardait','regardaient',
  'tombe','tombent','tombait','tombaient','tombera','tomberont',
  'brule','brulent','brulait','brulaient',
  'glisse','glissent','glissait','glissaient',
  'pese','pesent','pesait','pesaient',
  'coule','coulent','coulait','coulaient',
  'ouvre','ouvrent','ouvrait','ouvraient',
  'ferme','ferment','fermait','fermaient',
  'traverse','traversent','traversait','traversaient',
  'entre','entrent','entrait','entraient',
  'sort','sortent','sortait','sortaient',
  'monte','montent','montait','montaient',
  'descend','descendent','descendait','descendaient',
  'passe','passent','passait','passaient',
  'reste','restent','restait','restaient',
  'cherche','cherchent','cherchait','cherchaient',
  'touche','touchent','touchait','touchaient',
  'pose','posent','posait','posaient',
  'tire','tirent','tirait','tiraient',
  'jette','jettent','jetait','jetaient',
  'laisse','laissent','laissait','laissaient',
  'prend','prennent','prenait','prenaient','prendra','prendront',
  'tient','tiennent','tenait','tenaient',
  'met','mettent','mettait','mettaient',
  'dit','disent','disait','disaient','dira','diront',
  'crie','crient','criait','criaient',
  'ecoute','ecoutent','ecoutait','ecoutaient',
  'attend','attendent','attendait','attendaient',
  'repond','repondent','repondait','repondaient',
  'comprend','comprennent','comprenait','comprenaient',
  'apprend','apprennent','apprenait','apprenaient',
  'connait','connaissent','connaissait','connaissaient',
  'cache','cachent','cachait','cachaient',
  'suit','suivent','suivait','suivaient',
  'court','courent','courait','couraient',
  'dort','dorment','dormait','dormaient',
  'vit','vivent','vivait','vivaient','vivra','vivront',
  'meurt','meurent','mourait','mouraient',
  'nait','naissent','naissait','naissaient',
  'grandit','grandissent','grandissait','grandissaient',
  'finit','finissent','finissait','finissaient',
  'choisit','choisissent','choisissait','choisissaient',
  'saisit','saisissent','saisissait','saisissaient',
  'souffre','souffrent','souffrait','souffraient',
  'pleure','pleurent','pleurait','pleuraient',
  'rit','rient','riait','riaient',
  'sent','sentent','sentait','sentaient',
  'tourne','tournent','tournait','tournaient',
  'change','changent','changeait','changeaient',
  'brise','brisent','brisait','brisaient',
  'creuse','creusent','creusait','creusaient',
  'boit','boivent','buvait','buvaient','boira','boiront',
  // Conditionnel / futur (pour conditionnelle)
  'serait','seraient','aurait','auraient','irait','iraient',
  'ferait','feraient','viendrait','viendraient',
  'disparaitrait','disparaitraient','comprendrait','comprendraient',
  'tomberait','tomberaient','brulerait','bruleraient',
  'oublierait','oublieraient','traverserait','traverseraient',
  'apparaitrait','apparaitraient','deviendrait','deviendraient',
])

// ─── Articles et determinants ─────────────────────────────────────────────────
const ARTICLES = new Set([
  'le','la','les','l','un','une','des','du','de','d',
  'ce','cet','cette','ces','mon','ma','mes','ton','ta','tes',
  'son','sa','ses','notre','votre','leur','nos','vos','leurs',
  'quel','quelle','quels','quelles',
])

// ─── Adjectifs courants ───────────────────────────────────────────────────────
const ADJECTIFS_COURANTS = new Set([
  'grand','grande','grands','grandes','petit','petite','petits','petites',
  'vieux','vieille','vieilles','jeune','jeunes','nouveau','nouvelle','nouveaux','nouvelles',
  'beau','belle','beaux','belles','bon','bonne','bons','bonnes',
  'mauvais','mauvaise','mauvaises','long','longue','longs','longues',
  'haut','haute','hauts','hautes','bas','basse','basses',
  'noir','noire','noirs','noires','blanc','blanche','blancs','blanches',
  'rouge','rouges','bleu','bleue','bleus','bleues','vert','verte','verts','vertes',
  'froid','froide','froids','froides','chaud','chaude','chauds','chaudes',
  'dur','dure','durs','dures','doux','douce','douces',
  'fort','forte','forts','fortes','faible','faibles',
  'lent','lente','lents','lentes','rapide','rapides',
  'ancien','ancienne','anciens','anciennes',
  'vide','vides','plein','pleine','pleins','pleines',
  'mort','morte','morts','mortes','vivant','vivante','vivants','vivantes',
  'seul','seule','seuls','seules','dernier','derniere','derniers','dernieres',
  'premier','premiere','premiers','premieres',
  'secret','secrete','secrets','secretes','silencieux','silencieuse',
  'nocturne','nocturnes','etrange','etranges','pale','pales',
  'profond','profonde','profonds','profondes','creux','creuse',
  'brise','brisee','brises','brisees','perdu','perdue','perdus','perdues',
  'ouvert','ouverte','ouverts','ouvertes','ferme','fermee','fermes','fermees',
  'sale','sales','propre','propres','nu','nue','nus','nues',
  'lourd','lourde','lourds','lourdes','leger','legere','legers','legeres',
  'exquis','exquise','exquises','cruel','cruelle','cruels','cruelles',
  'douloureux','douloureuse','rouille','rouilee',
  'immobile','immobiles','tremblant','tremblante','tremblants','tremblantes',
])

// ─── Mots interrogatifs ───────────────────────────────────────────────────────
const MOTS_INTERROGATIFS = new Set([
  'ou','quand','comment','pourquoi','qui','que','quoi','combien',
  'quel','quelle','quels','quelles','lequel','laquelle','lesquels','lesquelles',
])

export type TypeCase = 'nom' | 'verbe' | 'verbe-transitif' | 'adjectif' | 'adverbe' | 'groupe-nominal' | 'groupe-nominal-riche' | 'groupe-verbal' | 'proposition' | 'libre' | 'article-adj' | 'conjonction-coord' | 'conjonction-subord' | 'infinitif' | 'gérondif'
export type NiveauValidation = 'stricte' | 'souple' | 'desactivee'

export interface ResultatValidation {
  valide: boolean
  message?: string   // affiche seulement si pas valide
}

function normaliser(mot: string): string {
  return mot.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function mots(texte: string): string[] {
  return texte.trim().split(/\s+/).filter(Boolean)
}

function premiermot(texte: string): string {
  return mots(texte)[0]?.toLowerCase() ?? ''
}

function contientVerbe(texte: string): boolean {
  return mots(texte).some(m => VERBES.has(normaliser(m)))
}

function contientArticle(texte: string): boolean {
  return mots(texte).some(m => ARTICLES.has(m.toLowerCase()))
}

function contientMotInterrogatif(texte: string): boolean {
  return mots(texte).some(m => MOTS_INTERROGATIFS.has(normaliser(m)))
}

function ressembleAdjectif(texte: string): boolean {
  const ms = mots(texte)
  return ms.some(m => ADJECTIFS_COURANTS.has(normaliser(m)))
    || (ms.length === 1 && !contientVerbe(texte) && !contientArticle(texte))
}

// ─── Ressources anglaises ─────────────────────────────────────────────────────
// Même philosophie que le français : des heuristiques franches, pas de NLP.
// L'anglais n'a ni genre ni accord — la validation porte sur la catégorie.

const ARTICLES_EN = new Set([
  'the','a','an','this','that','these','those','some','any','no','every','each',
  'my','your','his','her','its','our','their','one',
])

// Formes verbales fréquentes (présent 3e pers., prétérits irréguliers, modaux)
const VERBES_EN = new Set([
  'is','are','was','were','has','have','had','does','did','do',
  'will','would','can','could','may','might','must','shall','should',
  'goes','went','comes','came','falls','fell','burns','burned','burnt',
  'glides','glided','trembles','trembled','devours','devoured','crosses','crossed',
  'weighs','weighed','holds','held','keeps','kept','sleeps','slept',
  'dreams','dreamt','dreamed','breathes','breathed','drinks','drank',
  'eats','ate','sings','sang','cries','cried','whispers','whispered',
  'waits','waited','watches','watched','opens','opened','closes','closed',
  'breaks','broke','carries','carried','becomes','became','remains','remained',
  'rises','rose','sinks','sank','swallows','swallowed','knows','knew',
  'sees','saw','hears','heard','feels','felt','takes','took','gives','gave',
  'makes','made','says','said','tells','told','finds','found','loses','lost',
  'leaves','left','turns','turned','runs','ran','walks','walked','flies','flew',
  'dies','died','lives','lived','grows','grew','begins','began','ends','ended',
  'forgets','forgot','remembers','remembered','counts','counted','erases','erased',
  'lifts','lifted','gnaws','gnawed','wavers','wavered','prowls','prowled',
  'consents','consented','recoils','recoiled','capsizes','capsized',
  'mends','mended','cradles','cradled','hollows','hollowed','tames','tamed',
  'engulfs','engulfed','grazes','grazed','cracks','cracked','slips','slipped',
  'melts','melted','shivers','shivered','bleeds','bled','waits','stands','stood',
])

const MOTS_INTERROGATIFS_EN = new Set([
  'who','what','where','when','why','how','which','whose','whom',
])

const CONJ_COORD_EN = new Set([
  'but','and','or','so','yet','for','nor','however','though','still','thus',
])

const CONJ_SUBORD_EN = new Set([
  'when','if','while','as','although','because','before','after','until',
  'since','unless','whereas','once','whenever','though','lest',
])

// Locutions adverbiales : tête de groupe prépositionnel court
const TETES_LOCUTION_ADV_EN = new Set([
  'without','in','at','by','for','on','under','beyond','against','through',
])

const ADVERBES_INVARIABLES_EN = new Set([
  'forever','elsewhere','backwards','sideways','gently','softly','slowly',
  'silently','quietly','again','away','beneath','everywhere','nowhere',
  'always','never','almost','already','still','twice',
])

function motsEN(texte: string): string[] {
  return texte.trim().split(/\s+/).filter(Boolean)
}

function normEN(mot: string): string {
  return mot.toLowerCase().replace(/[.,;:!?…»«"“”'']+$/g, '').replace(/^[«"“”'']+/g, '')
}

function contientVerbeEN(texte: string): boolean {
  return motsEN(texte).some(m => VERBES_EN.has(normEN(m)))
}

function contientArticleEN(texte: string): boolean {
  return motsEN(texte).some(m => ARTICLES_EN.has(normEN(m)))
}

function ressembleAdverbeEN(texte: string): boolean {
  const ms = motsEN(texte).map(normEN)
  if (ms.length === 1) {
    return ms[0].endsWith('ly') || ADVERBES_INVARIABLES_EN.has(ms[0])
  }
  // Locution courte : « without a sound », « in silence », « at dusk »
  return ms.length <= 3 && TETES_LOCUTION_ADV_EN.has(ms[0])
}

// Validation stricte anglaise — miroir du système français, catégorie par catégorie.
function validerCaseEN(texte: string, type: TypeCase): ResultatValidation {
  const ms = motsEN(texte)
  const n = ms.length

  switch (type) {
    case 'verbe':
    case 'verbe-transitif': {
      if (contientVerbeEN(texte)) return { valide: true }
      // Tolérance : mot unique sans article (forme non répertoriée)
      if (n === 1 && !contientArticleEN(texte)) return { valide: true }
      return { valide: false, message: 'Are you sure? The prompt asks for a conjugated verb.' }
    }

    case 'nom': {
      if (contientVerbeEN(texte) && n > 2) {
        return { valide: false, message: 'Are you sure? The prompt asks for a noun, not a sentence.' }
      }
      return { valide: true }
    }

    case 'adjectif': {
      if (contientVerbeEN(texte)) {
        return { valide: false, message: 'Are you sure? The prompt asks for an adjective.' }
      }
      if (n > 3) {
        return { valide: false, message: 'One or two words at most for this fragment.' }
      }
      return { valide: true }
    }

    case 'groupe-nominal':
    case 'groupe-nominal-riche': {
      if (contientVerbeEN(texte) && n > 3) {
        return { valide: false, message: 'Are you sure? The prompt asks for a noun phrase, not a full sentence.' }
      }
      return { valide: true }
    }

    case 'proposition': {
      if (!texte.includes('?') && !MOTS_INTERROGATIFS_EN.has(normEN(ms[0] ?? ''))) {
        return { valide: false, message: 'The prompt asks for a question — end with a “?”.' }
      }
      return { valide: true }
    }

    case 'article-adj': {
      if (n === 2 && contientArticleEN(texte)) return { valide: true }
      if (n === 1 && contientArticleEN(texte)) {
        return { valide: false, message: "Write the article AND the adjective (e.g. 'a dark', 'the old')." }
      }
      return { valide: true }
    }

    case 'gérondif': {
      // Gérondif anglais : forme en -ing en tête (« falling », « burning slowly »)
      if (n >= 1 && normEN(ms[0]).endsWith('ing')) return { valide: true }
      return { valide: false, message: "The prompt asks for an -ing form (e.g. 'falling', 'burning slowly')." }
    }

    case 'adverbe': {
      if (ressembleAdverbeEN(texte)) return { valide: true }
      if (contientVerbeEN(texte) && n > 2) {
        return { valide: false, message: "The prompt asks for an adverb or adverbial phrase (e.g. 'gently', 'without a sound', 'forever')." }
      }
      return { valide: true }
    }

    case 'groupe-verbal': {
      if (!contientVerbeEN(texte) && n > 2) {
        return { valide: false, message: "A verb phrase needs a conjugated verb (e.g. 'crosses the night', 'burns in silence')." }
      }
      return { valide: true }
    }

    case 'conjonction-coord': {
      if (n > 2) {
        return { valide: false, message: "The prompt asks for a conjunction, a single word (e.g. 'but', 'yet', 'however')." }
      }
      if (contientVerbeEN(texte)) {
        return { valide: false, message: 'The prompt asks for a conjunction, not a full sentence.' }
      }
      if (n === 1 && CONJ_COORD_EN.has(normEN(ms[0]))) return { valide: true }
      return { valide: true }
    }

    case 'conjonction-subord': {
      if (n > 3) {
        return { valide: false, message: "The prompt asks for a subordinating conjunction (e.g. 'when', 'while', 'as soon as')." }
      }
      if (contientVerbeEN(texte) && n > 2) {
        return { valide: false, message: 'The prompt asks for a conjunction, not a full clause.' }
      }
      if (n === 1 && CONJ_SUBORD_EN.has(normEN(ms[0]))) return { valide: true }
      return { valide: true }
    }

    case 'infinitif': {
      // Infinitif anglais : « to burn » — ou verbe nu toléré
      if (n === 2 && normEN(ms[0]) === 'to') return { valide: true }
      if (n === 1 && !contientArticleEN(texte)) return { valide: true }
      if (contientArticleEN(texte)) {
        return { valide: false, message: 'An infinitive is a bare verb, no article (e.g. «to burn», «to wait»).' }
      }
      return { valide: false, message: "The prompt asks for an infinitive: one verb (e.g. 'to burn', 'to wait')." }
    }

    case 'libre':
    default:
      return { valide: true }
  }
}

// ─── Validateur principal ─────────────────────────────────────────────────────

export function validerCase(
  texte: string,
  type: TypeCase,
  niveau: NiveauValidation
): ResultatValidation {
  // Anglais : validation par catégorie — pas d'accords ni de genre, mais les
  // mêmes garde-fous de forme que le français (verbe présent, longueurs, têtes).
  if (langueActuelle() === 'en') {
    if (niveau === 'desactivee') return { valide: true }
    if (!texte.trim()) return { valide: false, message: 'Write something first.' }
    if (niveau === 'souple') return { valide: true }
    return validerCaseEN(texte, type)
  }
  if (niveau === 'desactivee') return { valide: true }
  if (!texte.trim()) return { valide: false, message: 'Écris quelque chose.' }

  // En mode souple, on valide juste que le champ n'est pas vide
  if (niveau === 'souple') return { valide: true }

  // Mode strict : heuristiques par type
  switch (type) {
    case 'verbe':
    case 'verbe-transitif': {
      if (contientVerbe(texte)) return { valide: true }
      // Tolerer les formes non reconnues si mot unique sans article
      if (mots(texte).length === 1 && !contientArticle(texte)) return { valide: true }
      return {
        valide: false,
        message: 'Es-tu sûr ? La consigne demande un verbe conjugué.',
      }
    }

    case 'nom': {
      // L'écran affiche « AVEC ARTICLE · OU SANS » et des exemples comme
      // « la pluie » : l'article est donc accepté, même en mode strict.
      const ms = mots(texte)
      if (contientVerbe(texte) && ms.length > 2) {
        return { valide: false, message: 'Es-tu sûr ? La consigne demande un nom, pas une phrase.' }
      }
      return { valide: true }
    }

    case 'adjectif': {
      if (ressembleAdjectif(texte) || contientArticle(texte)) return { valide: true }
      if (contientVerbe(texte)) {
        return { valide: false, message: 'Es-tu sûr ? La consigne demande un adjectif.' }
      }
      return { valide: true }
    }

    case 'groupe-nominal':
    case 'groupe-nominal-riche': {
      if (contientVerbe(texte) && mots(texte).length > 3) {
        return {
          valide: false,
          message: 'Es-tu sûr ? La consigne demande un groupe nominal, pas une phrase complète.',
        }
      }
      return { valide: true }
    }

    case 'proposition': {
      if (texte.includes('?') || contientMotInterrogatif(texte)) return { valide: true }
      return { valide: true }
    }

    case 'article-adj': {
      const ms = mots(texte)
      if (ms.length === 2 && contientArticle(texte)) return { valide: true }
      if (ms.length === 1 && contientArticle(texte)) return { valide: false, message: "Écris l'article ET l'adjectif (ex : 'un sombre', 'le vieux')." }
      return { valide: true }
    }

    case 'gérondif': {
      const ms = mots(texte)
      // Doit commencer par "en" (gérondif = "en + participe présent")
      if (ms.length >= 2 && normaliser(ms[0]) === 'en') return { valide: true }
      if (ms.length === 1 && !contientArticle(texte)) return { valide: true }
      return { valide: false, message: "Un gérondif commence par « en » (ex : 'en tombant', 'en brûlant')." }
    }

    case 'adverbe': {
      if (contientVerbe(texte) && mots(texte).length > 2) {
        return { valide: false, message: "La consigne demande un adverbe ou une locution adverbiale (ex : 'doucement', 'sans bruit', 'à jamais')." }
      }
      return { valide: true }
    }

    case 'groupe-verbal': {
      if (!contientVerbe(texte) && mots(texte).length > 2) {
        return { valide: false, message: "Un groupe verbal doit contenir un verbe conjugué (ex : 'traverse la nuit', 'brûle en silence')." }
      }
      return { valide: true }
    }

    case 'conjonction-coord': {
      const ms = mots(texte)
      if (ms.length > 2) {
        return { valide: false, message: "La consigne demande une conjonction, un mot seul (ex : 'mais', 'car', 'or', 'pourtant')." }
      }
      if (contientVerbe(texte)) {
        return { valide: false, message: "La consigne demande une conjonction, pas une phrase complète." }
      }
      return { valide: true }
    }

    case 'conjonction-subord': {
      const ms = mots(texte)
      if (ms.length > 3) {
        return { valide: false, message: "La consigne demande une conjonction de subordination (ex : 'quand', 'lorsque', 'dès que')." }
      }
      if (contientVerbe(texte) && ms.length > 2) {
        return { valide: false, message: "La consigne demande une conjonction, pas une proposition complète." }
      }
      return { valide: true }
    }

    case 'infinitif': {
      const ms = mots(texte)
      if (ms.length > 2) {
        return { valide: false, message: "La consigne demande un infinitif : un seul verbe (ex : 'brûler', 'attendre', 'traverser')." }
      }
      if (contientArticle(texte)) {
        return { valide: false, message: "Un infinitif est un verbe seul, sans article." }
      }
      return { valide: true }
    }

    case 'libre':
    default:
      return { valide: true }
  }
}
