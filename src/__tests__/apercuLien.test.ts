import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * L'aperçu d'un lien partagé — ce qu'une messagerie affiche avant qu'on
 * appuie. `index.html` n'avait aucune balise Open Graph : le lien du jeu
 * collé dans une conversation s'affichait en adresse nue.
 *
 * Les robots ne lisent pas le JavaScript : on lit donc le fichier lui-même.
 */

const racine = resolve(__dirname, '../..')
const html = readFileSync(resolve(racine, 'index.html'), 'utf8')
const apiBase = readFileSync(resolve(racine, 'src/lib/apiBase.ts'), 'utf8')
const PROD = /PROD_API = '([^']+)'/.exec(apiBase)![1]

const meta = (attr: 'property' | 'name', cle: string) =>
  new RegExp(`<meta ${attr}="${cle}" content="([^"]*)"`).exec(html)?.[1]

describe("l'aperçu d'un lien", () => {
  it('porte un titre, une description et une image, pour Open Graph et pour Twitter', () => {
    for (const cle of ['og:title', 'og:description', 'og:image', 'og:type']) {
      expect(meta('property', cle), cle).toBeTruthy()
    }
    for (const cle of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      expect(meta('name', cle), cle).toBeTruthy()
    }
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
  })

  it("l'image a une adresse absolue, sur le domaine de production", () => {
    // Un robot ne résout pas une adresse relative : il n'affiche rien.
    for (const url of [meta('property', 'og:image'), meta('name', 'twitter:image')]) {
      expect(url?.startsWith(`${PROD}/`), url).toBe(true)
    }
  })

  it("ne fixe aucune adresse canonique : le lien partagé reste le sien", () => {
    // Chaque route sert ce même index.html. Un og:url posé sur la racine,
    // Facebook et LinkedIn le prennent pour l'adresse de la carte : un lien
    // /salon/KX7Q partagé là-bas se regroupait sous la racine et pouvait y
    // mener, code du salon perdu. Sans lui, le robot garde l'adresse qu'il a
    // réellement chargée.
    expect(meta('property', 'og:url')).toBeUndefined()
    expect(html).not.toMatch(/rel="canonical"/)
  })

  it("l'image existe et fait 1200 × 630, le format que les messageries attendent", () => {
    const chemin = new URL(meta('property', 'og:image')!).pathname
    const png = readFileSync(resolve(racine, 'public', `.${chemin}`))
    // En-tête PNG : largeur et hauteur aux octets 16 et 20 du bloc IHDR.
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
  })

  it('le texte est sobre : ni emoji ni point d’exclamation', () => {
    for (const t of [meta('property', 'og:description'), meta('name', 'twitter:description')]) {
      expect(t).not.toMatch(/[!\u{1F300}-\u{1FAFF}]/u)
    }
  })
})
