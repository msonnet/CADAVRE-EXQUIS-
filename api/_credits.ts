import { clientAdmin } from './_supabase.js'

/**
 * Comptabilité des crédits d'illustration, côté serveur exclusivement.
 *
 * Le solde ne transite jamais depuis le client : la fonction lit le jeton de
 * session, en déduit l'identité, débite, et ne génère qu'ensuite. Si la
 * génération échoue, le crédit est rendu — le joueur ne paie que ce qu'il a
 * réellement obtenu.
 */

/** Crédits offerts à chaque mois civil entamé. */
export const ALLOCATION_MENSUELLE = 3

/**
 * Coût en crédits, calibré pour qu'aucun chemin ne soit déficitaire :
 * une publicité non personnalisée rapporte ~0,005 $, une image standard
 * (FLUX schnell) coûte ~0,003 $ et une grand format (FLUX pro 1.1) ~0,040 $.
 * Une publicité = 1 crédit → le grand format à 8 crédits est au pire à
 * l'équilibre, et largement bénéficiaire quand il vient d'un forfait.
 */
export const COUT_ILLUSTRATION: Record<string, number> = {
  standard: 1,
  pro: 8,
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

export interface EtatCredits {
  solde: number
  allocationMensuelle: number
}

/** Solde courant, allocation mensuelle appliquée au passage (idempotente). */
export async function etatCredits(userId: string): Promise<EtatCredits | null> {
  const admin = clientAdmin()
  if (!admin) return null
  const { data, error } = await admin.rpc('allouer_credits_mensuels', {
    p_user: userId,
    p_montant: ALLOCATION_MENSUELLE,
  })
  if (error) {
    console.error('[credits] allocation impossible', error.message)
    return null
  }
  return { solde: typeof data === 'number' ? data : 0, allocationMensuelle: ALLOCATION_MENSUELLE }
}

/** Débite. Renvoie le nouveau solde, ou null si les crédits sont insuffisants. */
export async function debiter(userId: string, montant: number, detail?: unknown): Promise<number | null> {
  const admin = clientAdmin()
  if (!admin) return null
  const { data, error } = await admin.rpc('debiter_credit', {
    p_user: userId,
    p_montant: montant,
    p_detail: detail ?? null,
  })
  if (error) {
    console.error('[credits] débit impossible', error.message)
    return null
  }
  return typeof data === 'number' ? data : null
}

/**
 * Crédite. `reference` rend l'opération idempotente : un webhook de magasin
 * rejoué ou un jeton publicitaire renvoyé deux fois ne crédite qu'une fois.
 */
export async function crediter(
  userId: string,
  montant: number,
  type: 'achat' | 'publicite' | 'remboursement',
  reference?: string,
  detail?: unknown,
): Promise<number | null> {
  const admin = clientAdmin()
  if (!admin) return null
  const { data, error } = await admin.rpc('crediter', {
    p_user: userId,
    p_montant: montant,
    p_type: type,
    p_reference: reference ?? null,
    p_detail: detail ?? null,
  })
  if (error) {
    console.error('[credits] crédit impossible', error.message)
    return null
  }
  return typeof data === 'number' ? data : null
}
