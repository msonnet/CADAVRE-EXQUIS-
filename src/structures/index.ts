import type { StructureId, Case } from '../types'

export interface DefinitionCase {
  fonction: string
  consigne: string
  type: 'nom' | 'verbe' | 'adjectif' | 'adverbe' | 'groupe-nominal' | 'groupe-verbal' | 'proposition' | 'libre'
}

export interface Structure {
  id: StructureId
  nom: string
  description: string
  cases: DefinitionCase[]
  separateurs?: Record<number, string>
  nombreCasesVariable?: { min: number; max: number }
}

export const STRUCTURES: Structure[] = [

  // 1. Phrase courte (3 cases)
  {
    id: 'phrase-simple',
    nom: 'Phrase courte',
    description: '3 cases — sujet, verbe, complément',
    cases: [
      { fonction: 'sujet', consigne: 'un groupe nominal sujet', type: 'groupe-nominal' },
      { fonction: 'verbe', consigne: 'un verbe conjugué', type: 'verbe' },
      { fonction: 'complément', consigne: 'un groupe nominal complément', type: 'groupe-nominal' },
    ],
  },

  // 2. Phrase étoffée — canonique de Breton (7 cases)
  {
    id: 'phrase-etoffee',
    nom: 'Phrase étoffée',
    description: '7 cases — la canonique de Breton',
    cases: [
      { fonction: 'article + adjectif', consigne: "un article indéfini suivi d'un adjectif", type: 'adjectif' },
      { fonction: 'nom sujet', consigne: 'un nom commun (le sujet)', type: 'nom' },
      { fonction: 'adjectif du sujet', consigne: 'un adjectif qui qualifie ce nom', type: 'adjectif' },
      { fonction: 'verbe', consigne: 'un verbe conjugué au futur', type: 'verbe' },
      { fonction: 'article + adjectif (COD)', consigne: "un article indéfini suivi d'un adjectif", type: 'adjectif' },
      { fonction: 'nom COD', consigne: "un nom commun (complément d'objet)", type: 'nom' },
      { fonction: 'adjectif du COD', consigne: 'un adjectif qui qualifie ce complément', type: 'adjectif' },
    ],
  },

  // 3. Vers libre (4 à 12 tours)
  {
    id: 'vers-libre',
    nom: 'Vers libre',
    description: '4 à 12 vers — aucune contrainte syntaxique',
    cases: Array.from({ length: 12 }, (_, i) => ({
      fonction: `vers ${i + 1}`,
      consigne: 'un vers — ce qui te vient, dans ta langue',
      type: 'libre' as const,
    })),
    nombreCasesVariable: { min: 4, max: 12 },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStructure(id: string): Structure {
  const s = STRUCTURES.find(s => s.id === id)
  // Fallback gracieux pour les anciens poèmes avec des structures supprimées
  return s ?? STRUCTURES.find(s => s.id === 'vers-libre')!
}

export function nombreCasesEffectif(structure: Structure): number {
  if (!structure.nombreCasesVariable) return structure.cases.length
  const { min, max } = structure.nombreCasesVariable
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function reconstruirePoeme(cases: Case[], structure: Structure): string {
  if (structure.id === 'vers-libre') {
    return cases.map(c => c.texte.trim()).join('\n')
  }
  const sep = structure.separateurs ?? {}
  const parts: string[] = []
  cases.forEach((c, index) => {
    const num = index + 1
    if (sep[num]) parts.push(sep[num])
    parts.push(c.texte.trim())
  })
  return parts.join(' ')
}
