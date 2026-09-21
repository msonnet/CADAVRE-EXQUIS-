import { supabase } from './supabase'
import { api } from './apiBase'
import { jetonOuIdentite } from './acces'
import { langueActuelle } from '../i18n'
import type { RefusVers } from './jourLogique'

/**
 * Le poème du jour, côté joueur.
 *
 * ── Ce que le client ne peut pas savoir ───────────────────────────────────
 *
 * Le texte des autres, tant que la chaîne n'est pas scellée. Ce n'est pas
 * une politesse d'affichage : la politique RLS refuse la lecture, et l'API
 * ne renvoie qu'un MOT — l'écho. Ce module ne peut donc pas tricher même
 * s'il le voulait, et c'est exactement ce qu'on veut d'un cadavre exquis.
 *
 * ── Le poème scellé, lui, se lit en direct ────────────────────────────────
 *
 * Une fois la chaîne close, ses vers deviennent publics : la révélation
 * passe par Supabase sans repasser par une fonction serveur. Rien à
 * héberger pour la partie la plus lue du rendez-vous.
 */

export interface EtatDuJour {
  jour: string
  amorce: string
  /** Le dernier mot du vers précédent. Tout ce qu'on voit avant d'écrire. */
  echo: string
  /** Le rang qu'on occuperait en écrivant maintenant. */
  rang: number
  mains: number
  monVers: { rang: number; texte: string } | null
  scelle: boolean
}

export interface VersScelle {
  id: string
  rang: number
  texte: string
  pseudo: string | null
  voix: boolean
  voixNom: string | null
  /** Un vers retiré après signalement : remplacé par une voix, jamais effacé. */
  retire: boolean
  aMoi: boolean
}

export interface PoemeScelle {
  jour: string
  amorce: string
  vers: VersScelle[]
  /** Le rang de ton vers, si tu étais de la journée. */
  monRang: number | null
}

export type MotifRefus = RefusVers | 'scelle' | 'deja-ecrit' | 'indisponible' | 'auth'

export type ResultatSignalement =
  | { ok: true; retire: boolean }
  | { ok: false; motif: 'sien' | 'deja' | 'voix' | 'introuvable' | 'indisponible' | 'auth' }

/** L'état du rendez-vous. `null` si le serveur ne répond pas. */
export async function lireJour(): Promise<EtatDuJour | null> {
  try {
    // Le jeton est facultatif : venir voir l'amorce n'engage personne et ne
    // doit ouvrir aucune identité.
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(api(`/api/jour?langue=${langueActuelle()}`), {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

/**
 * Pose son vers au bout de la chaîne.
 *
 * C'est ICI que l'identité s'ouvre, et nulle part avant : « une main, un
 * vers » n'existe pas sans quelqu'un à qui rattacher la main.
 */
export async function poserVers(texte: string): Promise<{ ok: true; rang: number } | { ok: false; motif: MotifRefus }> {
  try {
    const jeton = await jetonOuIdentite()
    if (!jeton) return { ok: false, motif: 'auth' }
    const r = await fetch(api('/api/jour'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ texte, langue: langueActuelle() }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && typeof d.rang === 'number') return { ok: true, rang: d.rang }
    return { ok: false, motif: (d.motif as MotifRefus) ?? 'indisponible' }
  } catch {
    return { ok: false, motif: 'indisponible' }
  }
}

/**
 * Le dernier poème scellé — celui qu'on vient lire le lendemain.
 *
 * Deux requêtes plutôt qu'une jointure : la table des vers n'est lisible que
 * pour les chaînes scellées, et une jointure dont la moitié est refusée rend
 * un résultat vide sans dire pourquoi.
 */
export async function dernierPoemeScelle(): Promise<PoemeScelle | null> {
  try {
    const { data: chaine } = await supabase
      .from('jour_chaines')
      .select('id,jour,amorce')
      .eq('langue', langueActuelle())
      .not('scelle_le', 'is', null)
      .order('jour', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!chaine) return null

    const { data: vers } = await supabase
      .from('jour_vers')
      .select('id,rang,texte,pseudo,voix,voix_nom,main_id,retire')
      .eq('chaine_id', (chaine as { id: string }).id)
      .order('rang', { ascending: true })

    const { data: { session } } = await supabase.auth.getSession()
    const moi = session?.user?.id ?? null

    const lignes = (vers ?? []) as {
      id: string; rang: number; texte: string; pseudo: string | null
      voix: boolean; voix_nom: string | null; main_id: string | null; retire: boolean
    }[]

    const c = chaine as { jour: string; amorce: string }
    return {
      jour: c.jour,
      amorce: c.amorce,
      vers: lignes.map(v => ({
        id: v.id, rang: v.rang, texte: v.texte, pseudo: v.pseudo,
        voix: v.voix, voixNom: v.voix_nom, retire: v.retire,
        aMoi: !!moi && v.main_id === moi,
      })),
      monRang: lignes.find(v => !!moi && v.main_id === moi)?.rang ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Signaler un vers du poème achevé.
 *
 * Deux signalements le retirent — remplacé par un vers de voix écrit sur le
 * même écho, jamais effacé : un trou casserait les rangs et l'écho qu'a reçu
 * la main suivante ne voudrait plus rien dire.
 */
export async function signalerVers(versId: string, motif = 'autre'): Promise<ResultatSignalement> {
  try {
    const jeton = await jetonOuIdentite()
    if (!jeton) return { ok: false, motif: 'auth' }
    const r = await fetch(api('/api/signaler-vers'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ versId, motif }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok) return { ok: true, retire: !!d.retire }
    return { ok: false, motif: d.motif ?? 'indisponible' }
  } catch {
    return { ok: false, motif: 'indisponible' }
  }
}
