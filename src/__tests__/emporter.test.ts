import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Tout ce qui sort de l'application sort par `emporterFichier`.
 *
 * Dans l'app installée, un lien `<a download>`, `jsPDF.save()` et
 * `window.open(blob:)` ne produisent RIEN, et la webvue d'Android n'a pas de
 * `navigator.share`. Le bouton affichait « ✓ PARTAGÉ » et rien n'était parti ;
 * l'export du recueil — la seule sauvegarde — ne créait aucun fichier.
 */

const natif = { actif: true }
const ecrit: unknown[] = []
const partages: unknown[] = []
let refus: Error | null = null

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => natif.actif } }))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: {
    writeFile: async (o: { path: string }) => { ecrit.push(o); return { uri: `file:///cache/${o.path}` } },
  },
}))
vi.mock('@capacitor/share', () => ({
  Share: {
    share: async (o: unknown) => { if (refus) throw refus; partages.push(o) },
  },
}))

class FileReaderFactice {
  result: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  error = null
  readAsDataURL(b: Blob) {
    b.arrayBuffer().then(buf => {
      this.result = `data:${b.type};base64,${Buffer.from(buf).toString('base64')}`
      this.onload?.()
    })
  }
}
vi.stubGlobal('FileReader', FileReaderFactice)

const { emporterFichier, partagerTexteSeul, nomSur } = await import('../lib/emporter')

beforeEach(() => { natif.actif = true; ecrit.length = 0; partages.length = 0; refus = null })

describe('en natif, le fichier passe par la feuille du système', () => {
  it('écrit dans le cache — le seul dossier que le FileProvider d\'Android expose', async () => {
    const issue = await emporterFichier({ nom: 'recueil.txt', blob: new Blob(['la cire'], { type: 'text/plain' }), titre: 'Le recueil' })
    expect(issue).toBe('partage')
    expect(ecrit).toHaveLength(1)
    expect(ecrit[0]).toMatchObject({ path: 'recueil.txt', directory: 'CACHE', data: Buffer.from('la cire').toString('base64') })
    expect(partages[0]).toMatchObject({ files: ['file:///cache/recueil.txt'], title: 'Le recueil' })
  })

  it('une feuille refermée n\'est pas un partage', async () => {
    refus = new Error('Share canceled')
    const issue = await emporterFichier({ nom: 'a.png', blob: new Blob(['x']) })
    expect(issue).toBe('annule')
  })

  it('une vraie panne remonte — le bouton doit pouvoir l\'avouer', async () => {
    refus = new Error('disque plein')
    await expect(emporterFichier({ nom: 'a.png', blob: new Blob(['x']) })).rejects.toThrow('disque plein')
  })

  it('le texte seul aussi', async () => {
    expect(await partagerTexteSeul('la cire', 'Cadavre')).toBe('partage')
    expect(partages[0]).toMatchObject({ text: 'la cire', title: 'Cadavre' })
  })

  it('un titre de poème ne casse pas le nom de fichier', () => {
    expect(nomSur('cadavre-la/cire:?.pdf')).toBe('cadavre-la-cire-.pdf')
  })
})

describe('aucune sortie ne contourne la porte', () => {
  const SRC = join(__dirname, '..')
  const fichiers = (d: string): string[] => readdirSync(d).flatMap(n => {
    const p = join(d, n)
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : fichiers(p)
    return /\.tsx?$/.test(n) ? [p] : []
  })

  it('ni `download`, ni `jsPDF.save`, ni fenêtre `blob:` hors d\'emporter.ts', () => {
    const fautifs: string[] = []
    for (const f of fichiers(SRC)) {
      if (f.endsWith('lib/emporter.ts')) continue
      const t = readFileSync(f, 'utf8')
      if (/\.download\s*=/.test(t) || /\bdoc\.save\(/.test(t)) fautifs.push(f.replace(SRC, 'src'))
    }
    expect(fautifs).toEqual([])
  })

  it('l\'impression, en natif, passe par le PDF', () => {
    const t = readFileSync(join(SRC, 'pages/PoemeDetail.tsx'), 'utf8')
    const imprimer = t.slice(t.indexOf('function imprimerPoeme'))
    expect(imprimer.slice(0, imprimer.indexOf('window.open'))).toMatch(/estNatif\(\)[^\n]*exporterPoemePDF/)
  })
})
