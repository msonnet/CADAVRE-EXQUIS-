import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import config from '../../capacitor.config'
// @ts-expect-error — module ESM sans déclaration de types
import { plistPortrait, pbxprojIphone, manifestePortrait } from '../../scripts/natif-telephone.mjs'

/**
 * Le jeu tient sur n'importe quel téléphone — iPhone, Samsung, ou autre.
 *
 * Trois décisions, et chacune a une panne derrière elle :
 *
 * 1. La webvue iOS DÉFILE. `scrollEnabled: false` figeait le document : sur
 *    un iPhone, le bouton « Commencer la séance » des préparatifs tombait
 *    sous le pli et ne se laissait plus atteindre.
 * 2. Les zones sûres passent par `--sa-*`. Les webviews Android antérieures
 *    à la 140 rendent `env(safe-area-inset-*)` faux ; Capacitor injecte les
 *    bonnes valeurs ailleurs, et seul un point de passage unique les lit.
 * 3. Portrait, téléphone. Les gabarits de Capacitor déclarent l'iPad et les
 *    quatre orientations ; la mise en page n'est composée que debout.
 */

const SRC = join(__dirname, '..')

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : fichiers(p)
    return /\.(tsx?|css)$/.test(n) ? [p] : []
  })
}

describe('la webvue native', () => {
  it('iOS laisse défiler le document', () => {
    expect(config.ios?.scrollEnabled).toBe(true)
  })

  it('iOS ne double pas les retraits que la page pose elle-même', () => {
    expect(config.ios?.contentInset).toBe('never')
  })

  it('Android reçoit les vraies valeurs de zone sûre', () => {
    expect((config.plugins?.SystemBars as { insetsHandling?: string })?.insetsHandling).toBe('css')
  })
})

describe('les zones sûres', () => {
  it('ne se lisent qu\'à travers --sa-*, jamais env() en direct', () => {
    const fautifs: string[] = []
    for (const f of fichiers(SRC)) {
      const t = readFileSync(f, 'utf8')
      // La seule lecture permise : la définition des variables dans :root.
      const sansRacine = t.replace(/--sa-(top|bottom|left|right):[^;]+;/g, '')
      if (/env\(\s*safe-area-inset-(top|bottom|left|right)/.test(sansRacine)) fautifs.push(f.replace(SRC, 'src'))
    }
    expect(fautifs).toEqual([])
  })

  it('les variables lisent Capacitor avant env()', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf8')
    for (const cote of ['top', 'bottom', 'left', 'right']) {
      expect(css).toMatch(new RegExp(
        `--sa-${cote}:\\s*var\\(--safe-area-inset-${cote},\\s*env\\(safe-area-inset-${cote}`))
    }
  })
})

describe('portrait, au téléphone', () => {
  // Les VRAIS gabarits de Capacitor, pas une copie : si une version future
  // change leur forme, la mesure le dira.
  const gabarits = (() => {
    const d = mkdtempSync(join(tmpdir(), 'cap-'))
    const assets = join(SRC, '..', 'node_modules/@capacitor/cli/assets')
    execFileSync('mkdir', ['-p', join(d, 'ios'), join(d, 'android')])
    execFileSync('tar', ['xzf', join(assets, 'ios-spm-template.tar.gz'), '-C', join(d, 'ios')])
    execFileSync('tar', ['xzf', join(assets, 'android-template.tar.gz'), '-C', join(d, 'android')])
    return d
  })()
  const lire = (p: string) => readFileSync(join(gabarits, p), 'utf8')

  it('iOS : le gabarit brut accepte le paysage — la retouche le retire', () => {
    const brut = lire('ios/App/App/Info.plist')
    expect(brut).toContain('UIInterfaceOrientationLandscapeLeft')
    const retouche = plistPortrait(brut)
    expect(retouche).not.toMatch(/Landscape|UpsideDown/)
    expect(retouche.match(/UIInterfaceOrientationPortrait</g)?.length).toBe(2)
  })

  it('iOS : iPhone seulement', () => {
    const brut = lire('ios/App/App.xcodeproj/project.pbxproj')
    expect(brut).toMatch(/TARGETED_DEVICE_FAMILY = "1,2"/)
    const retouche = pbxprojIphone(brut)
    expect(retouche).not.toMatch(/TARGETED_DEVICE_FAMILY = "?1,2/)
    expect(retouche).toMatch(/TARGETED_DEVICE_FAMILY = 1;/)
  })

  it('iOS : 16 au minimum, comme la fiche App Store', () => {
    const retouche = pbxprojIphone(lire('ios/App/App.xcodeproj/project.pbxproj'))
    const cibles = retouche.match(/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;/g) ?? []
    expect(cibles.length).toBeGreaterThan(0)
    for (const c of cibles) expect(c).toBe('IPHONEOS_DEPLOYMENT_TARGET = 16.0;')
  })

  it('Android : l\'activité se tient debout, une seule fois', () => {
    const brut = lire('android/app/src/main/AndroidManifest.xml')
    expect(brut).not.toContain('screenOrientation')
    const une = manifestePortrait(brut)
    const deux = manifestePortrait(une)
    expect(deux).toBe(une)
    expect(une.match(/android:screenOrientation="portrait"/g)?.length).toBe(1)
  })

  it('les commandes natives appliquent la retouche', () => {
    const pkg = JSON.parse(readFileSync(join(SRC, '..', 'package.json'), 'utf8'))
    for (const s of ['cap:ios', 'cap:android', 'cap:add:ios', 'cap:add:android', 'cap:sync']) {
      expect(pkg.scripts[s], s).toContain('cap:telephone')
    }
  })
})
