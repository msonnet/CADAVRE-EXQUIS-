import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import {
  REPERES, hexVersLottie, repereDe, recolorer, couleursDe, parcourir,
  reperesDe, segmentAJouer, imagePose, proportions,
} from '../lib/animation'
import { composerSeance } from '../reve/Decor'

/**
 * Les animations du chantier EffectCraft — `docs/chantier-effectcraft.md`.
 *
 * Deux moitiés. La première mesure la logique : la recoloration, la lecture
 * des repères. La seconde mesure CHAQUE fichier de `public/animations/`, tel
 * qu'EffectCraft l'a exporté : un fichier qui porte une couleur en dur, une
 * expression ou un dégradé s'affiche mal sans que rien ne casse — il faut
 * qu'une mesure le dise avant l'écran.
 */

const RACINE = resolve(__dirname, '../..')
const DOSSIER = resolve(RACINE, 'public/animations')
const SOURCES = resolve(RACINE, 'animations')
const KO = 1024

/**
 * Ce que chaque animation doit porter : ses repères de composition (le
 * composant les lit par leur nom) et son plafond de poids. Un fichier absent
 * de cette table fait échouer la mesure : une animation nouvelle se déclare.
 */
const ATTENDUS: Record<string, { reperes: string[]; plafondKo: number; couleursPropres?: true }> = {
  couture: { reperes: ['boucle', 'pose'], plafondKo: 15 },
  'couture-longue': { reperes: ['boucle', 'noeud', 'pose'], plafondKo: 40 },
  sceau: { reperes: ['frappe', 'pose'], plafondKo: 30 },
  encrier: { reperes: ['sec', 'plein', 'remplir', 'pose'], plafondKo: 40 },
  // L'Œil garde ses couleurs : c'est la marque, crème et vermillon sur noir.
  'oeil-cousu': { reperes: ['pose'], plafondKo: 200, couleursPropres: true },
}

const fichiers = readdirSync(DOSSIER).filter(f => f.endsWith('.json')).sort()

/* ── La logique ─────────────────────────────────────────────────────────── */

describe('les couleurs repères', () => {
  it('se lisent en hexadécimal court ou long', () => {
    expect(hexVersLottie('#FF0000')).toEqual([1, 0, 0])
    expect(hexVersLottie('#0f0')).toEqual([0, 1, 0])
    expect(hexVersLottie('rouge')).toBeNull()
  })

  it('se reconnaissent à 1/255 près, pas au-delà', () => {
    expect(repereDe([254 / 255, 1 / 255, 0])).toBe('accent')
    expect(repereDe([0, 1, 0, 1])).toBe('encre')
    expect(repereDe([0, 0, 1])).toBe('papier')
    expect(repereDe([253 / 255, 0, 0])).toBeNull()
    expect(repereDe([0.5, 0.5, 0.5])).toBeNull()
  })

  const forme = (ty: string, k: unknown) => ({ ty, c: { a: Array.isArray(k) && typeof k[0] === 'object' ? 1 : 0, k } })
  const exemple = () => ({
    v: '5.12.0', fr: 30, ip: 0, op: 30, w: 90, h: 30,
    layers: [{
      ty: 4,
      shapes: [{
        ty: 'gr',
        it: [
          forme('st', [1, 0, 0, 1]),
          forme('fl', [0, 1, 0, 0.4]),
          forme('fl', [0.2, 0.3, 0.4, 1]),
        ],
      }],
    }],
    assets: [{
      id: 'pre', layers: [{
        ty: 4,
        shapes: [forme('fl', [{ t: 0, s: [0, 0, 1, 1] }, { t: 10, s: [1, 0, 0, 1], e: [0, 0, 1, 1] }])],
      }],
    }],
  })
  const seance = { accent: '#b22c20', encre: '#e8d4b8', papier: '#0f0805' }
  const rgb = (hex: string) => hexVersLottie(hex)!

  it('remplace chaque repère par la couleur de la séance, alpha gardé', () => {
    const out = recolorer(exemple(), seance)
    const it_ = out.layers[0].shapes[0].it
    expect(it_[0].c.k).toEqual([...rgb(seance.accent), 1])
    expect(it_[1].c.k).toEqual([...rgb(seance.encre), 0.4])
  })

  it('laisse une couleur qui n\'est pas un repère', () => {
    const out = recolorer(exemple(), seance)
    expect(out.layers[0].shapes[0].it[2].c.k).toEqual([0.2, 0.3, 0.4, 1])
  })

  it('atteint les couleurs animées et les précompositions', () => {
    const out = recolorer(exemple(), seance)
    const k = (out.assets[0].layers[0].shapes[0] as { c: { k: { s: number[]; e?: number[] }[] } }).c.k
    expect(k[0].s).toEqual([...rgb(seance.papier), 1])
    expect(k[1].s).toEqual([...rgb(seance.accent), 1])
    expect(k[1].e).toEqual([...rgb(seance.papier), 1])
  })

  it('rend une copie : le fichier partagé entre instances reste intact', () => {
    const original = exemple()
    const avant = JSON.stringify(original)
    recolorer(original, seance)
    expect(JSON.stringify(original)).toBe(avant)
  })

  it('chaque ambiance donne trois couleurs lisibles — aucun repère ne reste', () => {
    for (let graine = 0; graine < 500; graine++) {
      const c = composerSeance(graine).colorSchema
      for (const hex of [c.hex, c.encre, c.bg]) {
        expect(hexVersLottie(hex), `graine ${graine} : « ${hex} »`).not.toBeNull()
      }
    }
  })
})

describe('les repères de composition', () => {
  const anim = {
    ip: 0, op: 60, w: 84, h: 28,
    markers: [
      { cm: 'boucle', tm: 0, dr: 36 },
      { cm: '{"name":"noeud"}', tm: 36, dr: 9 },
      { cm: 'pose', tm: 45, dr: 0 },
    ],
  }

  it('se lisent par leur nom, nu ou enveloppé en JSON', () => {
    const r = reperesDe(anim)
    expect(r.get('boucle')).toEqual({ debut: 0, fin: 36 })
    expect(r.get('noeud')).toEqual({ debut: 36, fin: 45 })
    expect(r.get('pose')).toEqual({ debut: 45, fin: 45 })
  })

  it('choisissent le segment à jouer', () => {
    expect(segmentAJouer(anim, { boucle: true })).toEqual({ debut: 0, fin: 36 })
    expect(segmentAJouer(anim, { segment: 'noeud' })).toEqual({ debut: 36, fin: 45 })
    expect(segmentAJouer(anim, {})).toEqual({ debut: 0, fin: 60 })
    // Un nom inconnu joue le tout : la faute se voit, sans trou à l'écran.
    expect(segmentAJouer(anim, { segment: 'inconnu' })).toEqual({ debut: 0, fin: 60 })
  })

  it('l\'image fixe est la pose ; sans elle, la fin du segment', () => {
    expect(imagePose(anim, { debut: 0, fin: 36 })).toBe(45)
    expect(imagePose({ ...anim, markers: [] }, { debut: 0, fin: 36 })).toBe(35)
  })

  it('les proportions viennent du fichier', () => {
    expect(proportions(anim)).toBe(3)
    expect(proportions({})).toBe(1)
  })
})

/* ── Les fichiers ───────────────────────────────────────────────────────── */

describe('public/animations', () => {
  it('existe et n\'est pas vide', () => {
    expect(fichiers.length).toBeGreaterThan(0)
  })

  it('est précaché pour le hors-ligne', () => {
    const config = readFileSync(resolve(RACINE, 'vite.config.ts'), 'utf8')
    expect(config).toMatch(/globPatterns:\s*\[[^\]]*'animations\/\*\.json'/)
  })

  it('le lecteur n\'entre jamais dans le chargement de l\'accueil', () => {
    // Un `import … from 'lottie-web'` statique, n'importe où, ajouterait
    // 46 Ko compressés au premier écran. Seuls les imports de TYPES (effacés
    // à la compilation) et l'import dynamique du composant sont permis.
    const fautifs: string[] = []
    const balayer = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) { if (f !== '__tests__') balayer(p); continue }
        if (!/\.(ts|tsx)$/.test(f)) continue
        for (const ligne of readFileSync(p, 'utf8').split('\n')) {
          if (/^\s*import\s+(?!type\b)[^;]*from\s+['"]lottie-web/.test(ligne)) fautifs.push(p.replace(RACINE, ''))
        }
      }
    }
    balayer(resolve(RACINE, 'src'))
    expect(fautifs).toEqual([])
    const composant = readFileSync(resolve(RACINE, 'src/components/Animation.tsx'), 'utf8')
    expect(composant).toContain("import('lottie-web/build/player/lottie_light')")
  })
})

for (const fichier of fichiers) {
  const nom = fichier.replace(/\.json$/, '')
  const chemin = join(DOSSIER, fichier)

  describe(`l'animation « ${nom} »`, () => {
    const attendu = ATTENDUS[nom]
    const donnees = JSON.parse(readFileSync(chemin, 'utf8'))

    it('est déclarée, avec ses repères et son plafond', () => {
      expect(attendu, `ajouter « ${nom} » à ATTENDUS`).toBeDefined()
    })

    it('a sa source EffectCraft au dépôt', () => {
      expect(existsSync(join(SOURCES, `${nom}.ecproj`))).toBe(true)
    })

    it('tient sous son plafond de poids', () => {
      const ko = statSync(chemin).size / KO
      expect(ko).toBeLessThanOrEqual(attendu?.plafondKo ?? 0)
    })

    it('se lit à 30 images par seconde, avec une taille', () => {
      expect(donnees.fr).toBe(30)
      expect(donnees.op).toBeGreaterThan(donnees.ip)
      expect(donnees.w).toBeGreaterThan(0)
      expect(donnees.h).toBeGreaterThan(0)
      expect(Array.isArray(donnees.layers)).toBe(true)
    })

    it('ne porte rien que le lecteur léger ignore', () => {
      const problemes: string[] = []
      parcourir(donnees, o => {
        // Une expression est une chaîne `x` sur une propriété animable.
        if (typeof o.x === 'string') problemes.push('expression')
        if (o.ty === 'gf' || o.ty === 'gs') problemes.push(`dégradé (${o.ty})`)
        // Les calques : effets, styles, fusion et 3D ne passent pas en Lottie.
        if (typeof o.ty === 'number' && 'ks' in o) {
          if (Array.isArray(o.ef) && o.ef.length) problemes.push(`effet sur « ${o.nm} »`)
          if (Array.isArray(o.sy) && o.sy.length) problemes.push(`style sur « ${o.nm} »`)
          if (o.bm && o.bm !== 0) problemes.push(`mode de fusion sur « ${o.nm} »`)
          if (o.ddd === 1) problemes.push(`3D sur « ${o.nm} »`)
          // Calques de forme seulement — l'Œil a droit à ses PNG.
          const permis = attendu?.couleursPropres ? [0, 2, 3, 4] : [0, 3, 4]
          if (!permis.includes(o.ty)) problemes.push(`calque de type ${o.ty} « ${o.nm} »`)
        }
      })
      expect(problemes).toEqual([])
    })

    it('embarque ses images : rien à chercher hors du fichier', () => {
      const externes = (donnees.assets ?? [])
        .filter((a: { p?: string; e?: number }) => typeof a.p === 'string' && a.e !== 1 && !a.p.startsWith('data:'))
        .map((a: { id?: string }) => a.id)
      expect(externes).toEqual([])
    })

    if (!attendu?.couleursPropres) {
      it('ne porte que les trois couleurs repères', () => {
        const horsReperes = couleursDe(donnees)
          .filter(c => repereDe(c) === null)
          .map(c => c.slice(0, 3).map(x => Math.round(x * 255)).join(','))
        expect(horsReperes).toEqual([])
      })

      it('ne garde aucun repère une fois recolorée', () => {
        const out = recolorer(donnees, { accent: '#b22c20', encre: '#e8d4b8', papier: '#0f0805' })
        expect(couleursDe(out).filter(c => repereDe(c) !== null)).toEqual([])
      })
    }

    it('porte les repères de composition attendus, dont `pose`', () => {
      const r = reperesDe(donnees)
      for (const repere of attendu?.reperes ?? ['pose']) {
        expect(r.has(repere), `repère « ${repere} »`).toBe(true)
      }
      const pose = r.get('pose')!
      expect(pose.debut).toBeGreaterThanOrEqual(donnees.ip)
      expect(pose.debut).toBeLessThan(donnees.op)
      if (r.has('boucle')) expect(r.get('boucle')!.fin).toBeGreaterThan(r.get('boucle')!.debut)
    })
  })
}

/* ── Où elles sont posées ───────────────────────────────────────────────── */

/** Les lignes de `src/` (mesures exclues), commentaires écartés. */
function lignesDuCode(): { fichier: string; ligne: string }[] {
  const out: { fichier: string; ligne: string }[] = []
  const balayer = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) { if (f !== '__tests__') balayer(p); continue }
      if (!/\.(ts|tsx)$/.test(f)) continue
      for (const ligne of readFileSync(p, 'utf8').split('\n')) {
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(ligne)) continue
        out.push({ fichier: p.replace(RACINE + '/', ''), ligne })
      }
    }
  }
  balayer(resolve(RACINE, 'src'))
  return out
}

function compterPar(motif: RegExp): Record<string, number> {
  const out: Record<string, number> = {}
  for (const { fichier, ligne } of lignesDuCode()) {
    if (motif.test(ligne)) out[fichier] = (out[fichier] ?? 0) + 1
  }
  return out
}

describe('les attentes', () => {
  it('la couture est posée aux douze attentes courtes', () => {
    expect(compterPar(/<Animation nom="couture"/)).toEqual({
      'src/pages/Bibliotheque.tsx': 1,
      'src/pages/DessinDetail.tsx': 1,
      'src/pages/Galerie.tsx': 2,
      'src/pages/Jeu.tsx': 1,
      'src/pages/JeuOnline.tsx': 3,
      'src/pages/PoemeDetail.tsx': 1,
      'src/pages/PoemeDuJour.tsx': 1,
      'src/pages/Profil.tsx': 1,
      'src/pages/ProfilPublic.tsx': 1,
    })
  })

  /**
   * Le critère de fin du lot : 34 boucles `repeat: Infinity` avant, 12 après
   * — les invitations, les ornements, les signes et les états du tableau
   * « Ce qui ne bouge pas ». Ce relevé suit le chantier étape par étape :
   * une boucle qui revient, ou qui part sans qu'on l'ait remplacée, le fait
   * échouer.
   *
   * Étape 2 : 22. Restent les six attentes longues (étape 3) : FinDePartie,
   * FinOnline ×3, FinDessin ×2, Jeu ×3 (dont la pose), RevealDessin.
   */
  it('les boucles qui restent sont celles du relevé', () => {
    const boucles = compterPar(/repeat:\s*Infinity/)
    expect(boucles).toEqual({
      'src/components/RevealDessin.tsx': 2,
      'src/components/TutorielCoach.tsx': 2,
      'src/pages/Configuration.tsx': 1,
      'src/pages/FinDePartie.tsx': 1,
      'src/pages/FinDessin.tsx': 2,
      'src/pages/FinOnline.tsx': 3,
      'src/pages/Jeu.tsx': 4,
      'src/pages/JeuAtelier.tsx': 2,
      'src/pages/JeuOnline.tsx': 4,
      'src/pages/Online.tsx': 1,
    })
    expect(Object.values(boucles).reduce((a, b) => a + b, 0)).toBe(22)
  })
})

// Les repères eux-mêmes, figés : les changer obligerait à rouvrir chaque
// projet EffectCraft.
it('les repères valent rouge, vert et bleu purs', () => {
  expect(REPERES).toEqual({ accent: [1, 0, 0], encre: [0, 1, 0], papier: [0, 0, 1] })
})
