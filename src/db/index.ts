import Dexie, { type Table } from 'dexie'
import type { Poeme, DessinCadavre, BandeDessin } from '../types'

/** Bandes d'une partie dessinée en cours — trop lourdes pour sessionStorage
 *  (quelques PNG plein écran suffisaient à dépasser le quota, et l'écriture
 *  finale, la seule qui décide de la révélation, n'était pas protégée). */
export interface BandesDessin {
  id: string            // toujours 'courant' : une seule partie dessinée à la fois
  bandes: BandeDessin[]
  paper: string
  ts: number
}

/**
 * Un vers gardé, et d'où il vient.
 *
 * Le moteur produisait dix-huit vers gardables par séance et il n'existait
 * aucun moyen de les garder : on les relisait dans une capture d'écran, puis
 * ils disparaissaient avec la séance suivante. Un recueil n'est pas vingt
 * poèmes générés — c'est trois cents vers récoltés puis assemblés à la main.
 *
 * La provenance est conservée entière : sans elle, un carnet de trois cents
 * vers devient un tas. On veut pouvoir revenir au poème, et savoir combien de
 * mains ont écrit la ligne — sur une table de quarante-six, ça se dit.
 */
export interface VersRecolte {
  id: string
  texte: string
  /** Sa place dans le carnet. C'est le médium qui l'ordonne, pas la date. */
  ordre: number
  dateRecolte: number
  poemeId?: string
  poemeTitre?: string | null
  datePoeme?: number
  /** « toi », ou les noms des voix — tel que les coutures l'annoncent. */
  signature?: string
  nbVoix?: number
}

class CadavreExquisDB extends Dexie {
  poemes!: Table<Poeme>
  dessins!: Table<DessinCadavre>
  bandesDessin!: Table<BandesDessin>
  recolte!: Table<VersRecolte>

  constructor() {
    super('cadavre-exquis')
    this.version(1).stores({
      poemes: 'id, dateCreation, dateModification',
    })
    this.version(2).stores({
      poemes: 'id, dateCreation, dateModification',
      dessins: 'id, dateCreation, dateModification',
    })
    this.version(3).stores({
      poemes: 'id, dateCreation, dateModification',
      dessins: 'id, dateCreation, dateModification',
      bandesDessin: 'id',
    })
    this.version(4).stores({
      poemes: 'id, dateCreation, dateModification',
      dessins: 'id, dateCreation, dateModification',
      bandesDessin: 'id',
      // `texte` est indexé : c'est par lui qu'on sait si un vers est déjà au
      // carnet, et la question se pose une fois par ligne à chaque affichage
      // des coutures.
      recolte: 'id, ordre, dateRecolte, texte',
    })
  }
}

export const db = new CadavreExquisDB()

const CLE_BANDES = 'courant'

/** Écrit les bandes de la partie dessinée en cours. Lève si l'écriture échoue :
 *  l'appelant doit le savoir avant d'effacer quoi que ce soit. */
export async function sauvegarderBandesDessin(bandes: BandeDessin[], paper: string): Promise<void> {
  await db.bandesDessin.put({ id: CLE_BANDES, bandes, paper, ts: Date.now() })
}

export async function chargerBandesDessin(): Promise<BandesDessin | undefined> {
  return db.bandesDessin.get(CLE_BANDES)
}

export async function effacerBandesDessin(): Promise<void> {
  await db.bandesDessin.delete(CLE_BANDES)
}

export async function sauvegarderPoeme(poeme: Poeme): Promise<void> {
  await db.poemes.put(poeme)
}

export async function chargerPoemes(): Promise<Poeme[]> {
  return db.poemes.orderBy('dateCreation').reverse().toArray()
}

export async function chargerPoeme(id: string): Promise<Poeme | undefined> {
  return db.poemes.get(id)
}

export async function supprimerPoeme(id: string): Promise<void> {
  await db.poemes.delete(id)
}

export async function mettreAJourTitre(id: string, titre: string | null): Promise<void> {
  // null (et non '') : les affichages testent `titre ?? extrait` — une chaîne
  // vide passerait le ?? et rendrait une ligne blanche dans la bibliothèque.
  await db.poemes.update(id, { titre: titre || null, dateModification: Date.now() })
}

export async function sauvegarderIllustration(id: string, illustration: import('../types').Illustration): Promise<void> {
  await db.poemes.update(id, { illustration, dateModification: Date.now() })
}

export async function sauvegarderDessin(dessin: DessinCadavre): Promise<void> {
  await db.dessins.put(dessin)
}

export async function chargerDessins(): Promise<DessinCadavre[]> {
  return db.dessins.orderBy('dateCreation').reverse().toArray()
}

export async function chargerDessin(id: string): Promise<DessinCadavre | undefined> {
  return db.dessins.get(id)
}

export async function supprimerDessin(id: string): Promise<void> {
  await db.dessins.delete(id)
}

export async function mettreAJourTitreDessin(id: string, titre: string): Promise<void> {
  await db.dessins.update(id, { titre, dateModification: Date.now() })
}

// ── La récolte ───────────────────────────────────────────────────────────

/** Les vers gardés, dans l'ordre du carnet. */
export async function chargerRecolte(): Promise<VersRecolte[]> {
  const tout = await db.recolte.toArray()
  return tout.sort((a, b) => a.ordre - b.ordre)
}

/**
 * Garde un vers. Le même texte deux fois ne se garde qu'une : on rend
 * l'entrée existante plutôt que d'en créer une jumelle.
 */
export async function recolter(v: Omit<VersRecolte, 'id' | 'ordre' | 'dateRecolte'>): Promise<VersRecolte> {
  const texte = v.texte.trim()
  const deja = await db.recolte.where('texte').equals(texte).first()
  if (deja) return deja
  const dernier = await db.recolte.orderBy('ordre').last()
  const entree: VersRecolte = {
    ...v,
    texte,
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ordre: (dernier?.ordre ?? 0) + 1,
    dateRecolte: Date.now(),
  }
  await db.recolte.put(entree)
  return entree
}

/** Retire un vers du carnet. */
export async function retirerDeLaRecolte(id: string): Promise<void> {
  await db.recolte.delete(id)
}

/** Ce vers est-il déjà gardé ? Rend son identifiant, ou undefined. */
export async function idDansLaRecolte(texte: string): Promise<string | undefined> {
  const v = await db.recolte.where('texte').equals(texte.trim()).first()
  return v?.id
}

/**
 * Monte ou descend un vers d'un cran.
 *
 * On échange les rangs des deux voisins plutôt que de renuméroter tout le
 * carnet : sur trois cents vers, réécrire la table à chaque flèche serait
 * lent et surtout risqué — une écriture interrompue laisserait le carnet
 * dans un ordre incohérent.
 */
export async function deplacerDansLaRecolte(id: string, sens: -1 | 1): Promise<void> {
  const tout = await chargerRecolte()
  const i = tout.findIndex(v => v.id === id)
  const j = i + sens
  if (i === -1 || j < 0 || j >= tout.length) return
  const a = tout[i], b = tout[j]
  await db.transaction('rw', db.recolte, async () => {
    await db.recolte.update(a.id, { ordre: b.ordre })
    await db.recolte.update(b.id, { ordre: a.ordre })
  })
}

/** Vide le carnet. Sans retour. */
export async function viderLaRecolte(): Promise<void> {
  await db.recolte.clear()
}
