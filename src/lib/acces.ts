import { supabase } from './supabase'
import { api } from './apiBase'

/**
 * Accès aux fonctions payantes, vu du client.
 *
 * Le client ne décide rien : il lit un état posé par le serveur, et demande
 * l'autorisation avant d'ouvrir une partie avec les voix de l'IA. Un statut
 * d'abonné en localStorage s'éditerait en dix secondes.
 *
 * Le jeu solo n'a jamais exigé de compte. On ouvre donc une identité anonyme
 * (sans e-mail, sans mot de passe, sans pseudo) au premier besoin : c'est un
 * porte-clés attaché à l'appareil, pas un compte.
 */

export interface EtatAcces {
  abonne: boolean
  jusqua: string | null
  essai: { images: number; parties: number; lectures: number }
  plafonds: { image_pro: number; partie_ia: number; lecture_dessin: number }
}

/** Ce qui a été refusé, et pourquoi — c'est ce que le mur raconte. */
export type MotifRefus = 'essai_epuise' | 'plafond_jour'
export type ActePayant = 'image_pro' | 'partie_ia' | 'lecture_dessin'

export interface Refus {
  acte: ActePayant
  motif: MotifRefus
  plafond?: number
}

/** Ouvre une session anonyme si aucune n'existe. Renvoie le jeton, ou null. */
export async function jetonOuIdentite(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session.access_token
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.session) return null
  return data.session.access_token
}

/** Le jeton s'il existe déjà — sans jamais en créer un. */
async function jetonExistant(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/**
 * Lit l'état d'accès. Par défaut sans rien créer : afficher un écran de
 * réglages ne doit pas ouvrir une identité, ni entamer l'essai offert. Ce
 * sont les actes payants qui créent l'identité, au moment où ils la
 * réclament.
 */
export async function lireAcces(creerIdentite = false): Promise<EtatAcces | null> {
  try {
    const jeton = creerIdentite ? await jetonOuIdentite() : await jetonExistant()
    if (!jeton) return null
    const r = await fetch(api('/api/acces'), { headers: { Authorization: `Bearer ${jeton}` } })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

/**
 * Règle une partie avec les voix de l'IA, avant qu'elle ne commence.
 *
 * On décompte à l'ouverture et jamais en cours de route : un poème ne doit
 * pas s'arrêter au huitième vers. Renvoie `null` si c'est accordé, sinon le
 * motif du refus.
 *
 * Réseau injoignable : on laisse passer. Le serveur revérifiera à chaque
 * fragment — mieux vaut une partie de trop qu'un joueur bloqué par une
 * coupure de réseau.
 */
export async function ouvrirPartieIA(partieId: string, mode: string): Promise<Refus | null> {
  try {
    const jeton = await jetonOuIdentite()
    if (!jeton) return null
    const r = await fetch(api('/api/acces'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ partieId, mode }),
    })
    if (r.status === 402) {
      const d = await r.json().catch(() => ({}))
      return { acte: 'partie_ia', motif: d.motif === 'plafond_jour' ? 'plafond_jour' : 'essai_epuise', plafond: d.plafond }
    }
    return null
  } catch {
    return null
  }
}

/** Identifiant de partie : sert de reçu, une partie ne se paie qu'une fois. */
export function nouvellePartieId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

/**
 * Le reçu de la partie en cours, déposé par l'écran qui l'a ouverte et relu
 * à chaque fragment. Il vit le temps de l'onglet : une partie abandonnée ne
 * se repaie pas si le joueur revient en arrière, et rien ne traîne d'une
 * session à l'autre.
 */
const CLE_PARTIE = 'partie-ia'

export function deposerRecu(partieId: string): void {
  try { sessionStorage.setItem(CLE_PARTIE, partieId) } catch { /* mode privé */ }
}

export function recuCourant(): string | null {
  try { return sessionStorage.getItem(CLE_PARTIE) } catch { return null }
}
