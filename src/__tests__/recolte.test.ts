import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  chargerRecolte, deplacerDansLaRecolte, idDansLaRecolte, recolter,
  retirerDeLaRecolte, viderLaRecolte,
} from '../db'

// Le moteur produisait dix-huit vers gardables par séance et il n'existait
// aucun moyen de les garder : on les relisait dans une capture d'écran, puis
// ils disparaissaient. Un recueil n'est pas vingt poèmes générés — c'est trois
// cents vers récoltés puis assemblés à la main.

const garder = (texte: string) => recolter({ texte })

describe('le carnet', () => {
  beforeEach(async () => { await viderLaRecolte() })

  it('garde un vers et le rend', async () => {
    await garder('la lampe du couloir reste allumée')
    const v = await chargerRecolte()
    expect(v).toHaveLength(1)
    expect(v[0].texte).toBe('la lampe du couloir reste allumée')
    expect(v[0].dateRecolte).toBeGreaterThan(0)
  })

  it('conserve la provenance — sans elle un carnet devient un tas', async () => {
    await recolter({
      texte: "l'abbé presse ma main",
      poemeId: 'p1', poemeTitre: 'Sans titre', datePoeme: 1000,
      signature: "L'enlumineur", nbVoix: 1,
    })
    const [v] = await chargerRecolte()
    expect(v.poemeId).toBe('p1')
    expect(v.signature).toBe("L'enlumineur")
    expect(v.nbVoix).toBe(1)
  })

  it('ne garde pas deux fois le même vers', async () => {
    const a = await garder('le chien dort encore')
    const b = await garder('le chien dort encore')
    expect(b.id).toBe(a.id)
    expect(await chargerRecolte()).toHaveLength(1)
  })

  it("ignore les blancs autour — c'est le même vers", async () => {
    await garder('ma radio brûle')
    await garder('  ma radio brûle  ')
    expect(await chargerRecolte()).toHaveLength(1)
  })

  it('dit si un vers est déjà gardé', async () => {
    const v = await garder('et le drap restait froid')
    expect(await idDansLaRecolte('et le drap restait froid')).toBe(v.id)
    expect(await idDansLaRecolte('un vers jamais gardé')).toBeUndefined()
  })

  it('retire un vers sans toucher aux autres', async () => {
    const a = await garder('premier')
    await garder('deuxième')
    await retirerDeLaRecolte(a.id)
    const v = await chargerRecolte()
    expect(v).toHaveLength(1)
    expect(v[0].texte).toBe('deuxième')
  })

  it('garde les vers dans leur ordre d\'arrivée', async () => {
    for (const t of ['un', 'deux', 'trois']) await garder(t)
    expect((await chargerRecolte()).map(v => v.texte)).toEqual(['un', 'deux', 'trois'])
  })

  it('monte et descend un vers — un recueil se compose, il ne se range pas par date', async () => {
    for (const t of ['un', 'deux', 'trois']) await garder(t)
    const v = await chargerRecolte()
    await deplacerDansLaRecolte(v[2].id, -1)
    expect((await chargerRecolte()).map(x => x.texte)).toEqual(['un', 'trois', 'deux'])
    await deplacerDansLaRecolte(v[2].id, -1)
    expect((await chargerRecolte()).map(x => x.texte)).toEqual(['trois', 'un', 'deux'])
    await deplacerDansLaRecolte(v[2].id, 1)
    expect((await chargerRecolte()).map(x => x.texte)).toEqual(['un', 'trois', 'deux'])
  })

  it('ne fait rien aux deux bouts du carnet', async () => {
    for (const t of ['un', 'deux']) await garder(t)
    const v = await chargerRecolte()
    await deplacerDansLaRecolte(v[0].id, -1)
    await deplacerDansLaRecolte(v[1].id, 1)
    expect((await chargerRecolte()).map(x => x.texte)).toEqual(['un', 'deux'])
  })

  it('ne bronche pas sur un identifiant inconnu', async () => {
    await garder('un')
    await deplacerDansLaRecolte('personne', 1)
    expect(await chargerRecolte()).toHaveLength(1)
  })

  it('accueille un carnet de recueil — trois cents vers', async () => {
    for (let i = 0; i < 300; i++) await garder(`vers numéro ${i}`)
    const v = await chargerRecolte()
    expect(v).toHaveLength(300)
    expect(v[0].texte).toBe('vers numéro 0')
    expect(v[299].texte).toBe('vers numéro 299')
    // L'ordre reste strictement croissant après un déplacement au milieu.
    await deplacerDansLaRecolte(v[150].id, -1)
    const apres = await chargerRecolte()
    expect(apres.map(x => x.ordre)).toEqual([...apres.map(x => x.ordre)].sort((a, b) => a - b))
    expect(apres[149].texte).toBe('vers numéro 150')
  })

  it('se vide', async () => {
    for (const t of ['un', 'deux']) await garder(t)
    await viderLaRecolte()
    expect(await chargerRecolte()).toHaveLength(0)
  })
})
