import { cors } from './_cors.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { utilisateurDuJeton } from './_acces.js'
import { clientAdmin, urlProjet } from './_supabase.js'
import {
  refusDeSignalement, retirerVers, echoDuRang, SEUIL_RETRAIT,
  MOTS_MAX, CARACTERES_MAX, dernierMot,
} from './_jour.js'
import { choisirVoixAleatoire, promptSysteme } from './_voices.js'

export const config = { maxDuration: 30 }

/**
 * Signaler un vers du poème du jour.
 *
 * ── Pourquoi le signalement descend au vers ───────────────────────────────
 *
 * Celui de la galerie porte sur une publication entière, qui appartient à
 * son auteur. Ici les vers circulent chez des inconnus : un vers déplacé
 * entre dans LE poème du jour, celui de tout le monde, et il y reste tant
 * que personne ne le retire.
 *
 * ── Un vers retiré est REMPLACÉ, jamais effacé ────────────────────────────
 *
 * Un trou casserait les rangs, et l'écho qu'a reçu la main suivante ne
 * voudrait plus rien dire. Le vers devient donc un vers de voix, écrit sur
 * le MÊME écho — la main d'après répondait à ce mot-là, elle continue d'y
 * répondre. Ce qui disparaît, c'est le lien vers la personne.
 *
 * ── Deux signalements, et le premier part par courriel ────────────────────
 *
 * À un seul, n'importe qui ferait tomber chaque vers du poème l'un après
 * l'autre. À deux, il faut deux comptes d'accord. Et le modérateur est
 * prévenu dès le premier : c'est lui le vrai chemin tant que le rendez-vous
 * est petit.
 *
 * ── DEUX canaux, et ils ne font pas la même chose ─────────────────────────
 *
 * Le règlement européen sur les services numériques (DSA, article 16)
 * demande que **toute personne** puisse notifier un contenu ILLICITE, sans
 * condition de compte. Or exiger deux comptes d'accord est précisément ce
 * qui protège le poème du vandalisme. Les deux tiennent ensemble parce
 * qu'ils ne portent pas sur la même chose :
 *
 *   · `motif: 'illicite'` — ouvert à tous, sans identité. Il ne retire
 *     RIEN tout seul : il écrit au modérateur, immédiatement. Un canal
 *     anonyme capable de faire tomber un vers serait une arme, et le texte
 *     demande que la notification PARVIENNE, pas qu'elle exécute.
 *
 *   · tous les autres motifs — un compte, un seul signalement par vers,
 *     retrait automatique au second. C'est le jugement de goût de la
 *     communauté, et il reste tenu par des comptes.
 */
export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return
  if (req.method !== 'POST') { res.status(405).end(); return }

  if (!checkRateLimit(getClientIp(req), 10)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' })
    return
  }

  const versId = String(req.body?.versId ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(versId)) { res.status(400).json({ motif: 'introuvable' }); return }
  const motif = String(req.body?.motif ?? 'autre').slice(0, 24)

  const admin = clientAdmin()
  if (!admin) { res.status(503).json({ motif: 'indisponible' }); return }

  // ── Le canal ouvert : notification de contenu illicite ──
  // Avant l'exigence d'identité, et volontairement : c'est tout son objet.
  if (motif === 'illicite') {
    const { data: signale } = await admin
      .from('jour_vers').select('texte').eq('id', versId).maybeSingle()
    const t = (signale as { texte?: string } | null)?.texte
    if (!t) { res.status(404).json({ motif: 'introuvable' }); return }
    // Le détail libre aide le modérateur à trancher sans ouvrir la base.
    const detail = String(req.body?.detail ?? '').slice(0, 500)
    const parti = await prevenirModerateur(versId, t, detail ? `illicite — ${detail}` : 'illicite')
    // Rien ne garde trace de ce canal en base : un courriel qui n'est pas
    // parti est une notification perdue, et répondre 200 la ferait croire
    // reçue. L'écran renvoie alors vers l'adresse des conditions.
    if (!parti) { res.status(503).json({ motif: 'courriel_indisponible' }); return }
    res.status(200).json({ signale: true, retire: false, canal: 'illicite' })
    return
  }

  const main = await utilisateurDuJeton(req)
  if (!main) { res.status(401).json({ error: 'auth_requise' }); return }

  const { data: vers } = await admin
    .from('jour_vers')
    .select('id,chaine_id,rang,main_id,voix,texte,retire')
    .eq('id', versId)
    .maybeSingle()
  const v = vers as { id: string; chaine_id: string; rang: number; main_id: string | null; voix: boolean; texte: string; retire: boolean } | null

  const { data: deja } = await admin
    .from('jour_signalements').select('id')
    .eq('vers_id', versId).eq('main_id', main).maybeSingle()

  const refus = refusDeSignalement(v, main, !!deja)
  if (refus) { res.status(refus === 'introuvable' ? 404 : 409).json({ motif: refus }); return }
  if (v!.retire) { res.status(200).json({ retire: true }); return }

  const { error } = await admin
    .from('jour_signalements')
    .insert({ vers_id: versId, main_id: main, motif })
  // 23505 : déjà signalé, gagné de vitesse par une autre requête. Ce n'est
  // pas une erreur du joueur, l'intention est satisfaite.
  if (error && error.code !== '23505') {
    console.error('[signaler-vers]', error.message)
    res.status(503).json({ motif: 'indisponible' })
    return
  }

  const { count } = await admin
    .from('jour_signalements')
    .select('id', { count: 'exact', head: true })
    .eq('vers_id', versId)
  const total = count ?? 1

  // Le modérateur est prévenu dès le premier — au mieux, jamais bloquant.
  if (total === 1) void prevenirModerateur(versId, v!.texte, motif)

  if (total < SEUIL_RETRAIT) { res.status(200).json({ signale: true, retire: false }); return }

  const { data: chaine } = await admin
    .from('jour_chaines').select('amorce,langue').eq('id', v!.chaine_id).maybeSingle()
  const c = chaine as { amorce: string; langue: string } | null
  const echo = await echoDuRang(v!.chaine_id, v!.rang, c?.amorce ?? '')
  const voix = choisirVoixAleatoire()
  const remplacement = await versDeVoix(voix, echo, c?.langue ?? 'fr')

  const ok = await retirerVers(versId, remplacement, voix.id)
  res.status(ok ? 200 : 503).json({ signale: true, retire: ok })
}

/** Un vers de remplacement, écrit sur le même écho que celui qu'il remplace. */
async function versDeVoix(voix: any, echo: string, langue: string): Promise<string | null> {
  const cle = process.env.ANTHROPIC_API_KEY
  if (!cle) return null
  const consigne = langue === 'en'
    ? `Write ONE line of surrealist free verse, 3 to 8 words, no final full stop. The previous line ended on the word "${echo}" — that is all you know of the poem. Answer with the line alone.`
    : `Écris UN vers de poésie surréaliste, 3 à 8 mots, sans point final. Le vers précédent finissait sur le mot « ${echo} » — c'est tout ce que tu sais du poème. Réponds par le seul vers.`
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cle, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 60,
        system: promptSysteme(voix),
        messages: [{ role: 'user', content: consigne }],
      }),
    })
    if (!r.ok) return null
    const data = await r.json()
    const ligne = String(data?.content?.[0]?.text ?? '').split('\n').map(s => s.trim()).filter(Boolean)[0] ?? ''
    const propre = ligne.replace(/^[«»"'\s]+|[«»"'\s.,;:!?]+$/g, '').trim()
    if (!propre || propre.length > CARACTERES_MAX) return null
    if (propre.split(/\s+/).filter(Boolean).length > MOTS_MAX) return null
    return propre
  } catch { return null }
}

/**
 * Courriel au modérateur. Rend `true` s'il est réellement parti.
 *
 * Le retour compte pour le canal « illicite » et pour lui seul : rien
 * d'autre ne garde trace de cette notification-là. `jour_signalements`
 * exige un `main_id NOT NULL` et la migration est en production, donc on ne
 * peut pas y écrire sans identité. Si le courriel ne part pas, la
 * notification n'existe nulle part — et le dire est la seule réponse
 * honnête : l'écran renvoie alors vers l'adresse de contact des conditions,
 * qui est le second chemin exigé de toute façon.
 *
 * Pour les autres motifs il reste au meilleur effort : le signalement est
 * inscrit en base, le courriel n'est qu'une commodité.
 */
async function prevenirModerateur(versId: string, texte: string, motif: string): Promise<boolean> {
  const cle = (process.env.RESEND_API_KEY ?? '').trim()
  const dest = (process.env.REPORT_EMAIL ?? '').trim()
  if (!cle || !dest) return false
  const ref = (() => {
    try { return new URL(urlProjet() ?? '').hostname.split('.')[0] } catch { return '' }
  })()
  const lien = ref ? `https://supabase.com/dashboard/project/${ref}/editor` : ''
  const illicite = motif.startsWith('illicite')
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Cadavre Exquis <onboarding@resend.dev>',
        to: [dest],
        subject: illicite
          ? `CONTENU ILLICITE signalé — poème du jour`
          : `Vers signalé — poème du jour`,
        text: [
          illicite
            ? `Un vers du poème du jour est signalé comme ILLICITE (DSA art. 16).`
            : `Un vers du poème du jour a été signalé.`,
          ``,
          `Vers : « ${texte} »`,
          `Motif : ${motif}`,
          `Identifiant : ${versId}`,
          ``,
          illicite
            // Ce canal ne retire rien : il faut le dire, sinon le modérateur
            // croit qu'une mécanique s'en occupe et n'agit pas.
            ? `Ce signalement N'A DÉCLENCHÉ AUCUN RETRAIT : le canal ouvert ne\nretire jamais de lui-même. Il attend une décision humaine.`
            : `Il sera retiré automatiquement à ${SEUIL_RETRAIT} signalements —\nremplacé par un vers de voix, jamais effacé.`,
          lien ? `\n${lien}` : '',
        ].join('\n'),
      }),
    })
    return r.ok
  } catch {
    return false
  }
}
