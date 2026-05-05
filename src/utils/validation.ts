// Validation grammaticale legere — heuristiques, pas de NLP lourd

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

export type TypeCase = 'nom' | 'verbe' | 'adjectif' | 'adverbe' | 'groupe-nominal' | 'groupe-verbal' | 'proposition' | 'libre'
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

// ─── Validateur principal ─────────────────────────────────────────────────────

export function validerCase(
  texte: string,
  type: TypeCase,
  niveau: NiveauValidation
): ResultatValidation {
  if (niveau === 'desactivee') return { valide: true }
  if (!texte.trim()) return { valide: false, message: 'Ecris quelque chose.' }

  // En mode souple, on valide juste que le champ n'est pas vide
  if (niveau === 'souple') return { valide: true }

  // Mode strict : heuristiques par type
  switch (type) {
    case 'verbe': {
      if (contientVerbe(texte)) return { valide: true }
      // Tolerer les formes non reconnues si mot unique sans article
      if (mots(texte).length === 1 && !contientArticle(texte)) return { valide: true }
      return {
        valide: false,
        message: 'Es-tu sur ? La consigne demande un verbe conjugue.',
      }
    }

    case 'nom': {
      const ms = mots(texte)
      if (contientVerbe(texte) && ms.length > 1) {
        return { valide: false, message: 'Es-tu sur ? La consigne demande un nom, pas une phrase.' }
      }
      return { valide: true }
    }

    case 'adjectif': {
      if (ressembleAdjectif(texte) || contientArticle(texte)) return { valide: true }
      if (contientVerbe(texte)) {
        return { valide: false, message: 'Es-tu sur ? La consigne demande un adjectif.' }
      }
      return { valide: true }
    }

    case 'groupe-nominal': {
      if (contientVerbe(texte) && mots(texte).length > 3) {
        return {
          valide: false,
          message: 'Es-tu sur ? La consigne demande un groupe nominal, pas une phrase complete.',
        }
      }
      return { valide: true }
    }

    case 'proposition': {
      if (texte.includes('?') || contientMotInterrogatif(texte)) return { valide: true }
      return { valide: true }
    }

    case 'libre':
    case 'adverbe':
    case 'groupe-verbal':
    default:
      return { valide: true }
  }
}
