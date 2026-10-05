import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Le rendez-vous — l'heure qu'on annonce, le soir où l'on rappelle, ce que
 * l'appareil garde.
 *
 * Trois défauts tenus ici :
 *  · l'annonce « le poème est achevé » partait à 9 h locales le lendemain,
 *    donc AVANT le scellement au Japon ou en Australie ;
 *  · le rappel de 20 h était répété sans condition — il sonnait le soir où
 *    l'on venait d'écrire, et en français pour tout le monde ;
 *  · un réseau pendu laissait la page tourner sans fin, et le poème scellé,
 *    qui ne change plus, ne se gardait nulle part.
 */

const stockage = new Map<string, string>()
const natif = { actif: true, permission: 'granted' as string }
const planifiees: { id: number; title: string; body: string; schedule: { at?: Date; on?: unknown } }[] = []
const annulees: number[] = []
const demandes = { n: 0 }

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => natif.actif } }))
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: async () => ({ display: natif.permission }),
    requestPermissions: async () => { demandes.n++; return { display: natif.permission } },
    cancel: async (o: { notifications: { id: number }[] }) => {
      for (const { id } of o.notifications) {
        annulees.push(id)
        const i = planifiees.findIndex(p => p.id === id)
        if (i >= 0) planifiees.splice(i, 1)
      }
    },
    schedule: async (o: { notifications: typeof planifiees }) => { planifiees.push(...o.notifications) },
  },
}))

/** Une requête qui ne répond jamais — le train dans le tunnel. */
const pendue = () => new Promise<never>(() => {})
const reponseVers = { courante: pendue as () => Promise<unknown> }
vi.mock('../lib/supabase', () => {
  const constructeur = () => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'not', 'order', 'limit', 'abortSignal', 'maybeSingle']) b[m] = () => b
    b.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => reponseVers.courante().then(ok, ko)
    return b
  }
  return {
    supabase: {
      auth: { getSession: async () => ({ data: { session: null } }) },
      from: constructeur,
    },
  }
})
vi.mock('../lib/acces', () => ({ jetonOuIdentite: async () => null }))

beforeEach(() => {
  stockage.clear(); planifiees.length = 0; annulees.length = 0; demandes.n = 0
  natif.actif = true; natif.permission = 'granted'
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => stockage.get(k) ?? null,
    setItem: (k: string, v: string) => { stockage.set(k, v) },
    removeItem: (k: string) => { stockage.delete(k) },
  })
  stockage.set('langue', 'fr')
})

const FUSEAUX = ['Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney', 'America/Los_Angeles', 'Pacific/Auckland', 'Atlantic/Azores', 'America/Sao_Paulo']
const TZ0 = process.env.TZ
afterEach(() => { process.env.TZ = TZ0; vi.useRealTimers() })

describe('l’annonce du poème achevé', () => {
  it('ne part jamais avant le scellement, dans aucun fuseau', async () => {
    const { annoncerScellement } = await import('../utils/notifications')
    const { revelation, jourUTC } = await import('../lib/horlogeJour')
    for (const tz of FUSEAUX) {
      process.env.TZ = tz
      // Une main toutes les heures d'une journée UTC.
      for (let h = 0; h < 24; h++) {
        const ecrit = new Date(Date.UTC(2026, 9, 3, h, 17))
        vi.useFakeTimers({ now: ecrit, toFake: ['Date'] })
        planifiees.length = 0
        const jour = jourUTC(ecrit)
        expect(await annoncerScellement(4, jour)).toBe(true)
        const at = planifiees[0].schedule.at!
        expect(at.getTime(), `${tz}, main posée à ${h} h UTC`).toBeGreaterThanOrEqual(revelation(jour).getTime())
        // Et l'on ne réveille personne pour un poème.
        expect(at.getHours(), `${tz} : ${at.toString()}`).toBeGreaterThanOrEqual(9)
        expect(at.getHours(), `${tz} : ${at.toString()}`).toBeLessThan(23)
        vi.useRealTimers()
      }
    }
  })

  it('en France, c’est toujours le lendemain à 9 h', async () => {
    process.env.TZ = 'Europe/Paris'
    const { heureAnnonce } = await import('../lib/horlogeJour')
    const at = heureAnnonce('2026-10-03', new Date('2026-10-03T18:00:00Z'))
    expect(at.toString()).toMatch(/Sun Oct 04 2026 09:00:00/)
  })

  it('l’heure de fermeture se dit dans le fuseau du joueur', async () => {
    const { fermeture, libelleHeure } = await import('../lib/horlogeJour')
    process.env.TZ = 'Europe/Paris'
    expect(libelleHeure(fermeture('2026-10-03'), 'fr')).toBe('2 h')
    expect(libelleHeure(fermeture('2026-12-03'), 'fr')).toBe('1 h')
    process.env.TZ = 'America/Los_Angeles'
    expect(libelleHeure(fermeture('2026-10-03'), 'en')).toBe('5 PM')
    process.env.TZ = 'Asia/Kolkata'
    expect(libelleHeure(fermeture('2026-10-03'), 'fr')).toBe('5 h 30')
    process.env.TZ = 'UTC'
    expect(libelleHeure(fermeture('2026-10-03'), 'fr')).toBe('minuit')
  })

  it('ne demande la permission que sur le geste, et le dit armée', async () => {
    const { annoncerScellement, etatAnnonce } = await import('../utils/notifications')
    natif.permission = 'prompt'
    expect(await etatAnnonce('2026-10-03')).toBe('proposable')
    expect(await annoncerScellement(3, '2026-10-03')).toBe(false)
    expect(demandes.n, 'poser son vers ne déclenche aucune demande').toBe(0)

    natif.permission = 'granted'
    expect(await annoncerScellement(3, '2026-10-03', true)).toBe(true)
    expect(demandes.n).toBe(1)
    expect(await etatAnnonce('2026-10-03')).toBe('armee')
    // Un refus déjà prononcé ne se redemande pas.
    natif.permission = 'denied'
    expect(await etatAnnonce('2026-10-04')).toBe('muette')
  })

  it('sur le web, rien ne notifie et rien ne se propose', async () => {
    const { etatAnnonce } = await import('../utils/notifications')
    natif.actif = false
    expect(await etatAnnonce('2026-10-03')).toBe('muette')
  })
})

describe('le rappel du soir', () => {
  it('n’est plus répété : des soirs ponctuels, sautant celui où la main est posée', async () => {
    process.env.TZ = 'Europe/Paris'
    vi.useFakeTimers({ now: new Date('2026-10-03T08:00:00Z'), toFake: ['Date'] })
    const { activerRappelQuotidien } = await import('../utils/notifications')
    const { noterMain } = await import('../lib/jourLocal')
    noterMain('fr', '2026-10-03', 7)
    expect(await activerRappelQuotidien()).toBe(true)

    expect(planifiees.length).toBeGreaterThan(0)
    for (const p of planifiees) {
      expect(p.schedule.on, 'aucune répétition aveugle').toBeUndefined()
      expect(p.schedule.at!.getHours()).toBe(20)
    }
    const soirs = planifiees.map(p => p.schedule.at!.toISOString().slice(0, 10))
    expect(soirs, 'la main est posée aujourd’hui : pas de rappel ce soir').not.toContain('2026-10-03')
    expect(soirs).toContain('2026-10-04')
    // L'ancien rappel répété disparaît des installations qui le portaient.
    expect(annulees).toContain(1001)
  })

  it('parle la langue du joueur', async () => {
    stockage.set('langue', 'en')
    const { activerRappelQuotidien } = await import('../utils/notifications')
    await activerRappelQuotidien()
    expect(planifiees[0].body).toMatch(/poem of the day/i)
    expect(planifiees[0].body).not.toMatch(/t’attend|t'attend/)
  })
})

describe('ce que l’appareil garde', () => {
  it('le sceau de l’accueil : ✦ une fois écrit, puis « achevé » jusqu’à ce qu’on ouvre', async () => {
    const { sceauDuJour, noterMain, marquerDeplie, savoirScelle } = await import('../lib/jourLocal')
    const midi = new Date('2026-10-03T12:00:00Z')
    expect(sceauDuJour('fr', midi)).toEqual({ ecrit: false, acheve: null, aVerifier: false })

    noterMain('fr', '2026-10-03', 4, midi.getTime())
    expect(sceauDuJour('fr', midi).ecrit).toBe(true)
    expect(sceauDuJour('en', midi).ecrit, 'une chaîne par langue').toBe(false)

    // Le lendemain, avant la révélation : on se tait.
    expect(sceauDuJour('fr', new Date('2026-10-04T01:00:00Z')).acheve).toBeNull()
    // Après : on demande au registre, une fois.
    const matin = new Date('2026-10-04T07:00:00Z')
    expect(sceauDuJour('fr', matin)).toMatchObject({ ecrit: false, acheve: null, aVerifier: true })
    savoirScelle('fr', '2026-10-03')
    expect(sceauDuJour('fr', matin).acheve?.jour).toBe('2026-10-03')
    // Déplié : la ligne s'éteint.
    marquerDeplie('2026-10-03')
    expect(sceauDuJour('fr', matin).acheve).toBeNull()
  })

  it('l’ancienne clé du dépli — un jour seul — se lit encore', async () => {
    const { dejaDeplie, marquerDeplie, joursDeplies } = await import('../lib/jourLocal')
    stockage.set('cadavre-jour-deplie', '2026-09-20')
    expect(dejaDeplie('2026-09-20')).toBe(true)
    marquerDeplie('2026-09-21')
    expect(joursDeplies()).toEqual(['2026-09-21', '2026-09-20'])
  })

  it('« hier » se juge à la date locale où l’on a écrit', async () => {
    process.env.TZ = 'America/Los_Angeles'
    const { libelleAcheve } = await import('../lib/jourLocal')
    // 17 h à Los Angeles le 3 : la chaîne du 4 UTC. Le soir du 4, c'est hier.
    const pose = new Date('2026-10-04T00:00:00Z')
    expect(libelleAcheve({ jour: '2026-10-04', rang: 2, pose: pose.getTime() }, new Date('2026-10-05T03:00:00Z')))
      .toBe('TON POÈME D’HIER EST ACHEVÉ')
    expect(libelleAcheve({ jour: '2026-10-04', rang: 2, pose: pose.getTime() }, new Date('2026-10-04T04:00:00Z')))
      .toBe('TON POÈME EST ACHEVÉ')
  })
})

describe('le registre pendu', () => {
  it('rend la main en six secondes au lieu de tourner sans fin', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', () => pendue())
    vi.stubGlobal('navigator', { onLine: true })
    const { lireJour, dernierPoemeScelle, DELAI_JOUR } = await import('../lib/jour')
    reponseVers.courante = pendue
    let fini: unknown = 'attente'
    void Promise.all([lireJour(), dernierPoemeScelle()]).then(v => { fini = v })
    await vi.advanceTimersByTimeAsync(DELAI_JOUR + 50)
    expect(fini).toEqual([null, null])
    expect(DELAI_JOUR).toBeLessThanOrEqual(6000)
  })

  it('hors ligne, on n’attend même pas', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    let appels = 0
    vi.stubGlobal('fetch', () => { appels++; return pendue() })
    const { lireJour } = await import('../lib/jour')
    expect(await lireJour()).toBeNull()
    expect(appels).toBe(0)
  })

  it('un poème reçu se garde ; une lecture ratée n’écrase pas la copie', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const { lirePoemeScelle } = await import('../lib/jour')
    const { scelleGarde } = await import('../lib/jourLocal')
    const c = { id: 'c1', jour: '2026-10-02', amorce: 'le sel' }
    reponseVers.courante = async () => ({ data: [
      { id: 'v1', rang: 1, texte: 'la porte bat', pseudo: 'Nadja', voix: false, voix_nom: null, main_id: 'x', retire: false },
    ], error: null })
    expect((await lirePoemeScelle(c))?.vers).toHaveLength(1)
    expect(scelleGarde('fr', '2026-10-02')?.vers[0].texte).toBe('la porte bat')

    reponseVers.courante = async () => ({ data: null, error: { message: 'AbortError' } })
    expect(await lirePoemeScelle(c)).toBeNull()
    expect(scelleGarde('fr', '2026-10-02')?.vers[0].texte, 'la bonne copie reste').toBe('la porte bat')
  })
})

describe('les textes', () => {
  const page = readFileSync(join(__dirname, '..', 'pages', 'PoemeDuJour.tsx'), 'utf8')
  it('l’écran « TON VERS » ne dit plus « minuit », et n’est plus une impasse', () => {
    expect(page).not.toMatch(/Il se referme à minuit/)
    expect(page).not.toMatch(/avant minuit/)
    expect(page).toMatch(/M’ÉCRIRE QUAND IL SERA ACHEVÉ/)
    expect(page).toMatch(/EN ATTENDANT — UN CADAVRE ÉCRIT/)
  })
  it('le texte du rappel passe par tr()', () => {
    const notif = readFileSync(join(__dirname, '..', 'utils', 'notifications.ts'), 'utf8')
    expect(notif).not.toMatch(/body: 'Le poème du jour/)
  })
})
