import { cors } from './_cors.js'
import { checkRateLimit, getClientIp } from './_rateLimit.js'
import { utilisateurDuJeton } from './_acces.js'
import { clientAdmin } from './_supabase.js'
import { etatDuJour, poserVers, langueValide } from './_jour.js'

/**
 * Le poème du jour — l'écho, et le vers qu'on y ajoute.
 *
 * GET  → { jour, amorce, echo, rang, mains, monVers, scelle }
 * POST { texte } → { rang }
 *
 * ── Ce que cette route ne renvoie JAMAIS ──────────────────────────────────
 *
 * Le texte des autres. Tant que la chaîne n'est pas scellée, une main reçoit
 * un MOT — l'écho — et son propre vers. Interroger la route à chaque
 * nouveau vers ne rendrait donc qu'une suite de derniers mots, ce que le jeu
 * donne déjà. Le poème, lui, se lit à minuit, par la galerie, une fois la
 * chaîne close et les droits rouverts.
 *
 * ── Pourquoi une identité est exigée pour écrire ──────────────────────────
 *
 * Une main, un vers, un jour. Sans identité, la règle n'existe pas : une
 * seule personne écrirait tout le poème et cesserait d'être aveugle. On
 * ouvre donc une identité anonyme au premier vers, comme pour les actes
 * payants — un porte-clés attaché à l'appareil, sans e-mail ni mot de passe.
 *
 * La LECTURE, elle, n'exige rien : on peut venir voir l'amorce du jour sans
 * rien ouvrir.
 */
export default async function handler(req: any, res: any): Promise<void> {
  if (cors(req, res)) return
  if (req.method !== 'GET' && req.method !== 'POST') { res.status(405).end(); return }

  if (!checkRateLimit(getClientIp(req), 40)) {
    res.status(429).json({ error: 'Trop de requêtes. Attendez une minute.' })
    return
  }

  const langue = langueValide(req.method === 'GET' ? req.query?.langue : req.body?.langue)
  // Le jeton est facultatif en lecture : voir l'amorce n'engage personne.
  const mainId = await utilisateurDuJeton(req)

  if (req.method === 'GET') {
    const etat = await etatDuJour(langue, mainId)
    if (!etat) { res.status(503).json({ error: 'indisponible' }); return }
    res.status(200).json(etat)
    return
  }

  if (!mainId) { res.status(401).json({ error: 'auth_requise' }); return }

  const verdict = await poserVers(langue, mainId, await pseudoDe(mainId), req.body?.texte ?? '')
  if (!verdict.ok) {
    // 409 pour « tu as déjà écrit » et « c'est scellé » : ce ne sont pas des
    // erreurs du joueur mais des états du rendez-vous, et le client les
    // affiche autrement qu'un refus de saisie.
    const etat = verdict.motif === 'deja-ecrit' || verdict.motif === 'scelle' ? 409
      : verdict.motif === 'indisponible' ? 503 : 400
    res.status(etat).json({ motif: verdict.motif })
    return
  }

  res.status(200).json({ rang: verdict.rang })
}

/** Le pseudo, recopié au moment du vers — pour que les coutures tiennent
 *  même si le profil change de nom ou disparaît plus tard. */
async function pseudoDe(mainId: string): Promise<string | null> {
  const admin = clientAdmin()
  if (!admin) return null
  const { data } = await admin.from('profiles').select('pseudo').eq('id', mainId).maybeSingle()
  return (data as { pseudo?: string } | null)?.pseudo ?? null
}
