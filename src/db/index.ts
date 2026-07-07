import Dexie, { type Table } from 'dexie'
import type { Poeme, DessinCadavre } from '../types'

class CadavreExquisDB extends Dexie {
  poemes!: Table<Poeme>
  dessins!: Table<DessinCadavre>

  constructor() {
    super('cadavre-exquis')
    this.version(1).stores({
      poemes: 'id, dateCreation, dateModification',
    })
    this.version(2).stores({
      poemes: 'id, dateCreation, dateModification',
      dessins: 'id, dateCreation, dateModification',
    })
  }
}

export const db = new CadavreExquisDB()

export async function sauvegarderPoeme(poeme: Poeme): Promise<void> {
  await db.poemes.put(poeme)
}

export async function chargerPoemes(): Promise<Poeme[]> {
  return db.poemes.orderBy('dateCreation').reverse().toArray()
}

export async function chargerPoeme(id: string): Promise<Poeme | undefined> {
  return db.poemes.get(id)
}

export async function supprimerPoeme(id: string): Promise<void> {
  await db.poemes.delete(id)
}

export async function mettreAJourTitre(id: string, titre: string | null): Promise<void> {
  // null (et non '') : les affichages testent `titre ?? extrait` — une chaîne
  // vide passerait le ?? et rendrait une ligne blanche dans la bibliothèque.
  await db.poemes.update(id, { titre: titre || null, dateModification: Date.now() })
}

export async function sauvegarderIllustration(id: string, illustration: import('../types').Illustration): Promise<void> {
  await db.poemes.update(id, { illustration, dateModification: Date.now() })
}

export async function sauvegarderDessin(dessin: DessinCadavre): Promise<void> {
  await db.dessins.put(dessin)
}

export async function chargerDessins(): Promise<DessinCadavre[]> {
  return db.dessins.orderBy('dateCreation').reverse().toArray()
}

export async function chargerDessin(id: string): Promise<DessinCadavre | undefined> {
  return db.dessins.get(id)
}

export async function supprimerDessin(id: string): Promise<void> {
  await db.dessins.delete(id)
}

export async function mettreAJourTitreDessin(id: string, titre: string): Promise<void> {
  await db.dessins.update(id, { titre, dateModification: Date.now() })
}
