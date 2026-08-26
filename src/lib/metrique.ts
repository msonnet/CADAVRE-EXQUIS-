/**
 * La mesure du souffle : combien de mots un vers fait, et comment les
 * longueurs se suivent.
 *
 * Troisième instrument après `determinants.ts` et `formes.ts`, et il naît de
 * la même façon : d'une mesure faite avant de savoir ce qu'on cherchait.
 *
 * ── Ce que la mesure a dit ────────────────────────────────────────────────
 *
 * Sur quatre cents séances simulées, à toutes les tailles de table :
 *
 *   longueur moyenne          4,0 à 4,8 mots
 *   vers de dix mots ou plus  0 %   — à toutes les tables, sans exception
 *   plus longue série de vers de même longueur   6 à 8
 *
 * Le vers long n'existe pas. Le poème plafonne autour de huit mots et
 * quatre-vingt-dix pour cent des vers tiennent entre trois et sept. Un poème
 * dont chaque vers fait la même taille a un rythme plat, quelle que soit la
 * variété de ses formes — c'est la monotonie qui restait sous les deux
 * autres, et elle ne se voyait pas parce que personne ne la comptait.
 *
 * ── La cause ──────────────────────────────────────────────────────────────
 *
 * La longueur d'un vers est le produit du nombre de cases par la largeur des
 * cases. Le nombre de cases plafonne à cinq (`repartirVoix`), et toutes les
 * cases des gabarits sont étroites : un mot, deux mots. Le type le plus large
 * du moteur, `groupe-nominal-riche` — deux à quatre mots, validé par le
 * serveur depuis toujours — n'était employé par AUCUN gabarit de l'atelier.
 */

/** La largeur attendue d'une case, en mots. Tirée des contraintes serveur. */
const LARGEUR: Record<string, number> = {
  'nom': 1,
  'verbe': 1,
  'verbe-transitif': 1,
  'adjectif': 1,
  'adverbe': 1.6,
  'infinitif': 1,
  'conjonction-coord': 1,
  'conjonction-subord': 1.8,
  'gérondif': 2.5,
  'groupe-nominal': 2,
  'article-adj': 2,
  'groupe-nominal-riche': 3,
  'groupe-verbal': 3.5,
  'libre': 4.5,
  'proposition': 5,
}

export interface CaseMesurable {
  type: string
  mots?: number
  avant?: string
}

/**
 * La longueur qu'un gabarit va rendre, avant de l'avoir rendue.
 *
 * On ne peut pas attendre le texte : le gabarit se choisit d'abord, et c'est
 * au choix qu'il faut décider du souffle. L'estimation suffit — on ne règle
 * pas une métrique au mot près, on l'empêche de se répéter.
 */
export function longueurEstimee(cases: CaseMesurable[]): number {
  let n = 0
  for (const c of cases) {
    n += c.mots ?? LARGEUR[c.type] ?? 2
    if (c.avant) n += c.avant.split(/\s+/).length
  }
  return Math.round(n)
}

/** Trois souffles, et c'est assez pour entendre une alternance. */
export type Classe = 'COURT' | 'MOYEN' | 'LONG'
export const CLASSES: Classe[] = ['COURT', 'MOYEN', 'LONG']

export function classeDeLongueur(mots: number): Classe {
  if (mots <= 3) return 'COURT'
  if (mots <= 7) return 'MOYEN'
  return 'LONG'
}

/** La longueur d'un vers écrit, celle-là comptée pour de bon. */
export function motsDuVers(texte: string): number {
  return (texte.trim().match(/[^\s]+/g) ?? []).filter(m => /[a-zà-ÿ0-9]/i.test(m)).length
}

export interface DiagnosticMetrique {
  total: number
  moyenne: number
  comptes: Record<Classe, number>
  parts: Record<Classe, number>
  plusCourt: number
  plusLong: number
  plusLongueSerie: number
  classes: Classe[]
}

/** Mesure le souffle d'un poème écrit. */
export function diagnosticMetrique(vers: string[]): DiagnosticMetrique {
  const longueurs = vers.map(motsDuVers)
  const classes = longueurs.map(classeDeLongueur)
  const comptes: Record<Classe, number> = { COURT: 0, MOYEN: 0, LONG: 0 }
  for (const c of classes) comptes[c]++

  const total = longueurs.length || 1
  const parts = { ...comptes }
  for (const c of CLASSES) parts[c] = +(comptes[c] / total).toFixed(3)

  let serie = 0, max = 0, prec: Classe | null = null
  for (const c of classes) {
    if (c === prec) serie++
    else { serie = 1; prec = c }
    if (serie > max) max = serie
  }

  return {
    total: longueurs.length,
    moyenne: +(longueurs.reduce((a, b) => a + b, 0) / total).toFixed(2),
    comptes,
    parts,
    plusCourt: longueurs.length ? Math.min(...longueurs) : 0,
    plusLong: longueurs.length ? Math.max(...longueurs) : 0,
    plusLongueSerie: max,
    classes,
  }
}

/** Combien de vers d'affilée un même souffle peut tenir. */
const SERIE_MAX: Record<Classe, number> = { COURT: 2, MOYEN: 3, LONG: 2 }

/**
 * Au bout de combien de vers sans souffle long il faut en réclamer un.
 *
 * Le seuil se retire au hasard dans un intervalle, comme celui de la garde
 * d'ouverture : fixe, il remplacerait une régularité par une autre — la leçon
 * a déjà été payée deux fois dans ce projet.
 */
const BORNE_SANS_LONG: [number, number] = [4, 8]

/**
 * La garde métrique. Même forme que GardeOuverture et GardeFormes : elle
 * répond à « quels souffles sont encore recevables au prochain vers ? ».
 */
export class GardeMetrique {
  private histoire: Classe[] = []
  private seuil: number
  private readonly rng: () => number

  constructor(opts: { histoire?: Classe[]; rng?: () => number } = {}) {
    this.rng = opts.rng ?? Math.random
    this.seuil = this.tirerSeuil()
    if (opts.histoire) this.histoire = [...opts.histoire]
  }

  private tirerSeuil(): number {
    const [a, b] = BORNE_SANS_LONG
    return a + Math.floor(this.rng() * (b - a + 1))
  }

  /**
   * Les souffles recevables au prochain vers.
   *
   * `peutEtreLong` dit si le vers a de quoi respirer long — c'est une affaire
   * de nombre de mains, pas de volonté. Sans ce garde-fou, la garde réclamait
   * un vers long sur des vers qui n'en avaient pas les moyens : elle les
   * refusait tous, le tirage rendait n'importe quoi, et la protection des
   * séries tombait par la même occasion.
   */
  permises(peutEtreLong = true): Set<Classe> {
    const ok = new Set<Classe>(CLASSES)
    if (!peutEtreLong) ok.delete('LONG')
    for (const c of ok) {
      const max = SERIE_MAX[c]
      if (this.histoire.length >= max && this.histoire.slice(-max).every(x => x === c)) ok.delete(c)
    }
    // Le vers long ne vient jamais tout seul : il faut aller le chercher.
    // Sans cette réclamation, la mesure donnait zéro pour cent de vers de dix
    // mots ou plus, à toutes les tailles de table.
    if (peutEtreLong && this.exigeLong()) return new Set<Classe>(['LONG'])
    if (!ok.size) ok.add('MOYEN')
    return ok
  }

  /**
   * Un vers à ce nombre de mains peut-il faire huit mots ?
   *
   * Une voix seule le peut : elle écrit le vers entier, on lui en demande
   * simplement plus. Trois mains et plus le peuvent en cases larges. DEUX
   * mains ne le peuvent pas — deux cases, même larges, plafonnent à sept.
   */
  static peutEtreLong(nVoix: number): boolean {
    return nVoix !== 2
  }

  /** Le prochain vers doit-il impérativement respirer long ? */
  exigeLong(): boolean {
    if (this.histoire.length < this.seuil) return false
    return this.histoire.slice(-this.seuil).every(c => c !== 'LONG')
  }

  enregistrer(c: Classe): void {
    this.histoire.push(c)
    if (c === 'LONG') this.seuil = this.tirerSeuil()
  }
}
