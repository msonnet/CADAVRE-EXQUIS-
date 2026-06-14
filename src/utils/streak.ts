// Série quotidienne — pur localStorage, fonctionne partout (web + natif).
// On compte les jours d'ouverture consécutifs : « ne pas briser la chaîne ».
// Aucune donnée ne quitte l'appareil — cohérent avec la promesse de l'app.

const KEY = 'cadavre-serie'

export interface Serie {
  compte: number      // jours consécutifs, en cours
  record: number      // meilleure série jamais atteinte
  dernierJour: string // AAAA-MM-JJ (heure locale) du dernier passage compté
}

// Date locale (pas UTC) : le passage d'un jour à l'autre suit le fuseau du
// joueur, ce qui est l'attente naturelle pour une série quotidienne.
function jour(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${j}`
}

function jourPrecedent(d = new Date()): string {
  const v = new Date(d)
  v.setDate(v.getDate() - 1)
  return jour(v)
}

function lire(): Serie {
  try {
    const brut = localStorage.getItem(KEY)
    if (brut) {
      const s = JSON.parse(brut)
      if (typeof s?.compte === 'number' && typeof s?.dernierJour === 'string') {
        return { compte: s.compte, record: typeof s.record === 'number' ? s.record : s.compte, dernierJour: s.dernierJour }
      }
    }
  } catch { /* localStorage indisponible ou corrompu */ }
  return { compte: 0, record: 0, dernierJour: '' }
}

// À appeler une fois à l'ouverture. Met la série à jour selon le jour courant
// et renvoie l'état. Idempotent dans une même journée (rappel sans effet).
export function pointerSerie(): Serie {
  const s = lire()
  const aujourdhui = jour()
  if (s.dernierJour === aujourdhui) return s          // déjà compté aujourd'hui
  const compte = s.dernierJour === jourPrecedent() ? s.compte + 1 : 1
  const maj: Serie = { compte, record: Math.max(s.record, compte), dernierJour: aujourdhui }
  try { localStorage.setItem(KEY, JSON.stringify(maj)) } catch { /* non bloquant */ }
  return maj
}

// Lecture sans mutation (pour un affichage qui ne doit pas pointer la série).
export function lireSerie(): Serie {
  return lire()
}
