import { clientAdmin } from './_supabase.js'

/**
 * Comptabilité des crédits d'illustration, côté serveur exclusivement.
 *
 * Le solde ne transite jamais depuis le client : la fonction lit le jeton de
 * session, en déduit l'identité, débite, et ne génère qu'ensuite. Si la
 * génération échoue, le crédit est rendu — le joueur ne paie que ce qu'il a
 * réellement obtenu.
 */

/**
 * Crédits offerts à chaque mois civil entamé — c'est LE cadran économique
 * du jeu : chaque crédit offert coûte ~0,04 $ de génération. À 1 000 joueurs
 * actifs, 2 crédits/mois = ~80 $/mois de gratuit à couvrir.
 */
export const ALLOCATION_MENSUELLE = 2

/**
 * Le crédit EST le grand format — une seule chose, aucun calcul mental :
 *   · payer   → grand format (FLUX pro 1.1, ~0,040 $), sans annonce
 *   · gratuit → standard (FLUX schnell, ~0,003 $), une annonce à chaque fois
 *
 * La version standard ne consomme donc aucun crédit : elle se paie en
 * attention. Une annonce non personnalisée rapporte ~0,005 $ pour ~0,003 $
 * de génération — la voie gratuite s'autofinance.
 */
export const COUT_ILLUSTRATION: Record<string, number> = {
  standard: 0,
  pro: 1,
}

/**
 * Générations standard offertes par jour et par identité, tant que la régie
 * publicitaire n'est pas branchée. Sans ce plafond, la voie gratuite serait
 * illimitée et non financée — c'est exactement la fuite qui coule un
 * modèle freemium.
 */
export const PLAFOND_STANDARD_QUOTIDIEN = 5

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

/**
 * Nombre de générations standard consommées aujourd'hui par cette identité.
 * S'appuie sur le journal : aucune table supplémentaire.
 */
export async function standardAujourdhui(userId: string): Promise<number> {
  const admin = clientAdmin()
  if (!admin) return 0
  const debut = new Date(); debut.setUTCHours(0, 0, 0, 0)
  const { count, error } = await admin
    .from('credit_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'generation_standard')
    .gte('created_at', debut.toISOString())
  if (error) return 0
  return count ?? 0
}

/** Journalise une génération standard (coût nul, mais elle compte pour le plafond). */
export async function noterStandard(userId: string, detail?: unknown): Promise<void> {
  const admin = clientAdmin()
  if (!admin) return
  await admin.from('credit_events').insert({
    user_id: userId, type: 'generation_standard', montant: 0, detail: detail ?? null,
  })
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
