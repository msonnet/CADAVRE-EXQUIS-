import { promptSysteme } from './_voices.js'
import { normaliserSortie, choisirProposition } from './claude.js'
import { CARACTERES_MAX, MOTS_MAX } from './_jour.js'

/**
 * Un vers entier écrit par une voix, sur le seul écho — le poème du jour.
 *
 * ── Ce qu'il y avait ──────────────────────────────────────────────────────
 *
 * Deux copies d'une même fonction, dans `cleanup.ts` et `signaler-vers.ts`,
 * avec une consigne générique — « Écris UN vers de poésie surréaliste, 3 à 8
 * mots » — sur Sonnet, une seule réponse, prise telle quelle. Exactement ce
 * que l'Atelier a dû abandonner : reformuler n'a JAMAIS marché dans ce
 * projet, « surréaliste » tout court rend le vers qu'on attend. Le poème du
 * jour, que tout le monde lit, était écrit par la voix la moins travaillée
 * du jeu.
 *
 * ── Ce qu'il y a ──────────────────────────────────────────────────────────
 *
 * La MÊME demande que le vers entier de l'Atelier (`type: 'libre'` dans
 * `claude.ts`) : le modèle des vers entiers, la persona avec son cadran
 * métier/dehors, l'empreinte (« une chose concrète, prise dans ton univers
 * propre »), TROIS propositions et le choix de la meilleure par
 * `choisirProposition`. Deux tirages par appel, parce qu'une consigne fixe
 * produit une monotonie :
 *
 * - la LONGUEUR, entre 3 et 8 mots — sinon toutes les voix rendent six mots ;
 * - le CADRAN, métier ou dehors, à 45 % — l'ordre de grandeur que l'Atelier
 *   mesure (« une dizaine de mots savants sur vingt-deux vers »).
 *
 * `claude.ts` n'est pas modifié : le moteur de l'Atelier est gelé. On
 * importe seulement ses deux fonctions de sortie, pour que les deux chemins
 * nettoient et choisissent de la même façon.
 *
 * L'aveuglement tient toujours : la voix ne reçoit que l'écho, comme une
 * main. Aucune liste de mots à éviter — elle trahirait le poème.
 */

export const MODELE_VERS = 'claude-opus-4-8'
export const N_PROPOSITIONS = 3
export const PART_METIER = 0.45

/** Ce qu'on garde de la réponse : une ligne, sans guillemets ni point final. */
export function nettoyerVersDeVoix(brut: string): string | null {
  const ligne = String(brut ?? '').split('\n').map(s => s.trim()).filter(Boolean)[0] ?? ''
  const propre = ligne.replace(/^[«»"'\s]+|[«»"'\s.,;:!?]+$/g, '').trim()
  if (!propre) return null
  if (propre.length > CARACTERES_MAX) return null
  if (propre.split(/\s+/).filter(Boolean).length > MOTS_MAX) return null
  return propre
}

/** Une ligne de proposition : puce, numéro, gras, guillemets retirés. */
function nettoyerLigne(brut: string): string {
  return brut
    .replace(/^\s*[-–—•*]\s*/, '')
    .replace(/^\s*\d+\s*[.)]\s*/, '')
    .replace(/\*+([^*]*)\*+/g, '$1')
    .replace(/^["«»'\s]+|["«»'\s]+$/g, '')
    .replace(/[.!?;,:]+$/, '')
    .trim()
}

/** Le modèle commente sa tâche au lieu de l'exécuter. */
const estMeta = (t: string) =>
  /^(voici|je vais|bien s[uû]r|d['’]accord|here is|here's|sure|of course|i will|i'll)\b/i.test(t) || t.endsWith(':')

/** La demande, telle que l'Atelier la fait pour un vers entier. */
export function demandeDeVers(o: { echo: string; langue: 'fr' | 'en'; mots: number }): string {
  const { echo, langue, mots } = o
  return langue === 'en'
    ? `Write ${N_PROPOSITIONS} DIFFERENT proposals for one line of a poem, one per line, nothing else — no numbering, no final punctuation, no explanation.
Absolute constraint: about ${mots} words — a COMPLETE, grammatical line: a subject with its article and a conjugated verb, or a complete noun image. NEVER telegraphic: every noun keeps its article.
Stay true to your way of seeing. Avoid the most expected word and clichés.
You hear an echo: "${echo}". It is the last word of the line before yours — all you know of the poem. Bounce off it or ignore it — stay in your own world.
This full line must carry your signature: one concrete thing from your own world. Don't try to surprise — set down what you have in front of you, in your own terms. What sets you apart is exactness.
Answer with the ${N_PROPOSITIONS} lines alone.`
    : `Écris ${N_PROPOSITIONS} propositions DIFFÉRENTES pour un vers de poème, une par ligne, rien d'autre — pas de numérotation, pas de ponctuation finale, pas d'explication.
Contrainte absolue : environ ${mots} mots — un vers COMPLET et grammatical : un sujet avec son article et un verbe conjugué, ou une image nominale complète. JAMAIS de style télégraphique : chaque nom garde son article.
Reste fidèle à ta manière de voir. Évite le mot le plus attendu et les clichés.
Tu entends en écho : « ${echo} ». C'est le dernier mot du vers d'avant le tien — tout ce que tu sais du poème. Libre à toi d'y rebondir ou de l'ignorer — reste dans ton propre monde.
Ce vers entier doit porter ton empreinte : une chose concrète, prise dans ton univers propre. Ne cherche pas à surprendre — note ce que tu as devant toi, dans les termes qui sont les tiens. C'est ton exactitude qui te distingue.
Réponds avec les ${N_PROPOSITIONS} lignes seules.`
}

/** La meilleure proposition qui tient dans les bornes du vers humain. */
export function retenirVers(texteBrut: string, langue: 'fr' | 'en', tronque = false): string | null {
  const lignes = String(texteBrut ?? '').split('\n')
  if (tronque && lignes.length > 1) lignes.pop()
  const candidats = lignes
    .map(nettoyerLigne)
    .filter(t => t && !estMeta(t))
    .slice(0, N_PROPOSITIONS)
    .map(t => normaliserSortie(t, 'libre', langue))
    .map(t => nettoyerVersDeVoix(t))
    .filter((t): t is string => !!t)
  const choisi = choisirProposition(candidats, false)
  return choisi || null
}

type Tirage = () => number

export async function ecrireVersDeVoix(
  voix: any,
  echo: string,
  langueBrute: string,
  hasard: Tirage = Math.random,
): Promise<string | null> {
  const cle = process.env.ANTHROPIC_API_KEY
  if (!cle) return null
  const langue: 'fr' | 'en' = langueBrute === 'en' ? 'en' : 'fr'
  const mots = 3 + Math.floor(hasard() * 6)
  const metier = hasard() < PART_METIER

  const ctrl = new AbortController()
  const minuteur = setTimeout(() => ctrl.abort(), 25_000)
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': cle,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELE_VERS,
        max_tokens: Math.min(mots * 4 + 8, 44) * N_PROPOSITIONS + 12,
        system: langue === 'en'
          ? promptSysteme(voix, 'libre', metier) + "\n\nIMPORTANT : cette partie se joue en ANGLAIS. Tu écris ton fragment en anglais, dans ta manière propre — ton lexique se traduit, il ne se remplace pas."
          : promptSysteme(voix, 'libre', metier),
        messages: [{ role: 'user', content: demandeDeVers({ echo, langue, mots }) }],
      }),
    })
    if (!r.ok) return null
    const data = await r.json()
    return retenirVers(String(data?.content?.[0]?.text ?? ''), langue, data?.stop_reason === 'max_tokens')
  } catch {
    return null
  } finally {
    clearTimeout(minuteur)
  }
}
