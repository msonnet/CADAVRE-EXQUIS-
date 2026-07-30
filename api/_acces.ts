import { clientAdmin } from './_supabase.js'

/**
 * Accès aux trois actes payants, côté serveur exclusivement.
 *
 * Le jeu est gratuit et entier. Écrire à plusieurs, dessiner, publier en
 * galerie : rien de tout cela ne m'appelle un serveur facturé. Seuls trois
 * actes le font, et ce sont les seuls comptés ici :
 *
 *   · image_pro      — une illustration grand format (FLUX pro 1.1, ~0,040 $)
 *   · partie_ia      — une partie entière où l'IA écrit  (~0,020 $)
 *   · lecture_dessin — la lecture surréaliste d'un dessin (~0,008 $)
 *
 * Un non-abonné dispose d'une réserve d'essai offerte une fois. Un abonné
 * passe librement, sous les plafonds ci-dessous.
 */

export type ActePayant = 'image_pro' | 'partie_ia' | 'lecture_dessin' | 'avatar'

/**
 * Plafonds journaliers de l'abonné.
 *
 * Ce ne sont pas des règles de jeu — sauf pour les images, où « 2 grands
 * formats par jour » est annoncé au joueur. Ce sont des pare-feu : ils
 * bornent le pire cas à ~2,70 $ par mois face à ~4,58 $ nets encaissés,
 * donc l'abonné le plus vorace reste bénéficiaire. Personne d'ordinaire ne
 * les rencontre.
 */
export const PLAFOND_JOUR: Record<ActePayant, number> = {
  image_pro: 2,
  partie_ia: 30,
  lecture_dessin: 20,
  // La photo de profil n'entame aucune réserve d'essai — elle est seulement
  // plafonnée, pour tout le monde. Personne ne refait son portrait dix fois
  // par jour, et sans identité exigée l'appel était une porte ouverte sur
  // la clé fal.
  avatar: 5,
}

export interface EtatAcces {
  abonne: boolean
  jusqua: string | null
  produit: string | null
  essai: { images: number; parties: number; lectures: number }
}

export interface Verdict {
  autorise: boolean
  motif?: 'essai_epuise' | 'plafond_jour'
  abonne: boolean
  essaiRestant?: number
  plafond?: number
  deja?: boolean
  /** Identifiant de l'écriture au journal — à rendre si la génération rate. */
  event?: number
}

/** Identité derrière un jeton de session Supabase, ou null s'il est invalide. */
export async function utilisateurDuJeton(req: any): Promise<string | null> {
  const brut = req.headers?.authorization ?? req.headers?.Authorization ?? ''
  const jeton = String(brut).replace(/^Bearer\s+/i, '').trim()
  if (!jeton) return null
  const admin = clientAdmin()
  if (!admin) return null
  try {
    const { data, error } = await admin.auth.getUser(jeton)
    if (error || !data?.user) return null
    return data.user.id
  } catch {
    return null
  }
}

/** État courant. Le premier appel crée la ligne et attribue la réserve d'essai. */
export async function etatAcces(userId: string): Promise<EtatAcces | null> {
  const admin = clientAdmin()
  if (!admin) return null
  const { data, error } = await admin.rpc('etat_acces', { p_user: userId })
  if (error || !data) {
    console.error('[acces] état illisible', error?.message)
    return null
  }
  return data as EtatAcces
}

/**
 * Décompte un acte payant. `reference` rend l'appel idempotent : les douze
 * fragments d'une même partie passent par la même référence et ne la
 * paient qu'une fois.
 */
export async function consommer(
  userId: string,
  type: ActePayant,
  reference?: string,
  detail?: unknown,
): Promise<Verdict> {
  const admin = clientAdmin()
  if (!admin) return { autorise: false, abonne: false, motif: 'essai_epuise' }
  const { data, error } = await admin.rpc('consommer_acces', {
    p_user: userId,
    p_type: type,
    p_reference: reference ?? null,
    p_plafond_jour: PLAFOND_JOUR[type],
    p_detail: detail ?? null,
  })
  if (error || !data) {
    console.error('[acces] consommation impossible', error?.message)
    return { autorise: false, abonne: false }
  }
  const d = data as any
  return {
    autorise: !!d.autorise,
    motif: d.motif,
    abonne: !!d.abonne,
    essaiRestant: d.essai_restant,
    plafond: d.plafond,
    deja: !!d.deja,
    event: typeof d.event === 'number' ? d.event : undefined,
  }
}

/**
 * La génération a échoué : on rend exactement ce qui vient d'être décompté.
 * On désigne l'écriture par son identifiant, jamais « la dernière du même
 * type » — deux images lancées de front, l'une réussie l'autre non, et la
 * restitution de la seconde annulerait la première.
 */
export async function rendre(userId: string, event?: number): Promise<void> {
  if (typeof event !== 'number') return
  const admin = clientAdmin()
  if (!admin) return
  const { error } = await admin.rpc('rendre_acces', { p_user: userId, p_event: event })
  if (error) console.error('[acces] restitution impossible', error.message)
}

/**
 * Une partie a-t-elle déjà été réglée ?
 *
 * `/api/claude` est appelé une douzaine de fois par partie. Repasser par la
 * base à chaque fragment ajouterait douze allers-retours pour une réponse
 * qui ne change jamais au cours d'une partie : on retient donc les parties
 * déjà vérifiées en mémoire d'instance. Le pire cas d'une instance froide
 * est une lecture, pas une fuite : la partie doit avoir été réglée pour
 * exister en base.
 */
const partiesVues = new Map<string, number>()
const MEMOIRE_MS = 3 * 60 * 60 * 1000   // au-delà de toute durée de partie

export async function partieReglee(userId: string, partieId: string): Promise<boolean> {
  const cle = `${userId}:${partieId}`
  const vu = partiesVues.get(cle)
  if (vu !== undefined && Date.now() - vu < MEMOIRE_MS) return true

  const admin = clientAdmin()
  if (!admin) return false
  const { data, error } = await admin
    .from('usage_events')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'partie_ia')
    .eq('reference', partieId)
    .limit(1)
  if (error || !data?.length) return false

  if (partiesVues.size > 5000) {
    const limite = Date.now() - MEMOIRE_MS
    for (const [k, t] of partiesVues) if (t < limite) partiesVues.delete(k)
  }
  partiesVues.set(cle, Date.now())
  return true
}
