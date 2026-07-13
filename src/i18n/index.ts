// ════════════════════════════════════════════════
// i18n — Cadavre Exquis
//
// Deux langues : fr (source) et en. Le choix vit dans localStorage,
// détecté depuis le navigateur au premier lancement. Changer de langue
// recharge l'app (les pages lisent la langue au montage — pas de
// plomberie réactive à travers 25 écrans pour un réglage rare).
//
// `tr(fr, en)` : la traduction vit à côté de l'usage. Pour ajouter une
// 3e langue plus tard, ce helper migrera vers un dictionnaire — les
// appels sont déjà les points d'extraction.
// ════════════════════════════════════════════════

export type Langue = 'fr' | 'en'

const CLE = 'langue'

export function langueActuelle(): Langue {
  try {
    const l = localStorage.getItem(CLE)
    if (l === 'fr' || l === 'en') return l
    return (navigator.language ?? 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'
  } catch {
    return 'fr'
  }
}

export function changerLangue(l: Langue): void {
  try { localStorage.setItem(CLE, l) } catch { /* ignore */ }
  window.location.reload()
}

/** Traduction inline : renvoie la version dans la langue active. */
export function tr(fr: string, en: string): string {
  return langueActuelle() === 'fr' ? fr : en
}
