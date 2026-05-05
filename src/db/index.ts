import Dexie, { type Table } from 'dexie'
import type { Poeme } from '../types'

class CadavreExquisDB extends Dexie {
  poemes!: Table<Poeme>

  constructor() {
    super('cadavre-exquis')
    this.version(1).stores({
      poemes: 'id, dateCreation, dateModification',
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

export async function mettreAJourTitre(id: string, titre: string): Promise<void> {
  await db.poemes.update(id, { titre, dateModification: Date.now() })
}
