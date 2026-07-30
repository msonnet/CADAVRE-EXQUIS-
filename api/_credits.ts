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
 * Crédits offerts à chaque mois civil entamé — c'est LE cadran économique du
 * jeu : un crédit offert = un grand format = ~0,04 $ de génération réelle.
 * À 1 000 joueurs actifs, 5 crédits/mois ≈ 200 $/mois de gratuit à couvrir,
 * soit ~4 % de conversion en forfaits pour atteindre l'équilibre. Baisser ce
 * nombre, ou basculer le grand format sur un modèle moins cher, sont les
 * deux seuls leviers pour alléger la facture.
 */
export const ALLOCATION_MENSUELLE = 5

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
 * ÉCHAFAUDAGE PROVISOIRE — à retirer le jour où AdMob est branché.
 *
 * Le modèle définitif n'a qu'une règle par voie :
 *   · grand format → 1 crédit (5 offerts par mois, puis forfait)
 *   · standard     → 1 annonce regardée = 1 image, sans limite
 *
 * Mais tant qu'aucune annonce n'existe, la voie standard n'a aucun frein et
 * chaque image coûte de l'argent réel. Ce plafond quotidien tient la place de
 * l'annonce en attendant ; il n'est PAS une règle de jeu et ne doit pas être
 * présenté comme telle au joueur.
 */
export const PLAFOND_STANDARD_SANS_PUB = 5

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
