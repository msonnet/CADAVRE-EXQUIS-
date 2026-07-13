import type { StructureId, Case } from '../types'
import { langueActuelle } from '../i18n'

export interface DefinitionCase {
  fonction: string
  consigne: string
  type: 'nom' | 'verbe' | 'adjectif' | 'adverbe' | 'groupe-nominal' | 'groupe-nominal-riche' | 'groupe-verbal' | 'proposition' | 'libre' | 'article-adj'
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
      { fonction: 'sujet', consigne: 'un groupe nominal sujet', type: 'groupe-nominal-riche' },
      { fonction: 'verbe', consigne: 'un verbe conjugué', type: 'verbe' },
      { fonction: 'complément', consigne: 'un groupe nominal complément', type: 'groupe-nominal-riche' },
    ],
  },

  // 2. Phrase étoffée — canonique de Breton (5 cases)
  //    « Le cadavre exquis boira le vin nouveau »
  //    article+nom · adjectif · verbe · article+nom · adjectif
  {
    id: 'phrase-etoffee',
    nom: 'Phrase étoffée',
    description: '5 cases — la canonique de Breton',
    cases: [
      { fonction: 'sujet', consigne: 'article + nom — ex : "le cadavre", "une ombre", "un couteau"', type: 'groupe-nominal' },
      { fonction: 'adjectif du sujet', consigne: "adjectif qualificatif seul — ex : 'exquis', 'nocturne', 'brisé'", type: 'adjectif' },
      { fonction: 'verbe', consigne: "verbe conjugué — ex : 'boira', 'dévore', 'hante'", type: 'verbe' },
      { fonction: 'complément', consigne: 'article + nom — ex : "le vin", "la flamme", "un miroir"', type: 'groupe-nominal' },
      { fonction: 'adjectif du complément', consigne: "adjectif qualificatif seul — ex : 'nouveau', 'opaque', 'sourd'", type: 'adjectif' },
    ],
  },

  // 3. Vers libre (4 à 12 tours)
  {
    id: 'vers-libre',
    nom: 'Vers libre',
    description: '4 à 12 vers — aucune contrainte syntaxique',
    cases: Array.from({ length: 12 }, (_, i) => ({
      fonction: `vers ${i + 1}`,
      consigne: 'un vers de 3 à 6 mots — une image physique et inattendue',
      type: 'libre' as const,
    })),
    nombreCasesVariable: { min: 4, max: 12 },
  },
]

// ─── Structures anglaises — la grammaire EST le gameplay, elle se traduit ─────

export const STRUCTURES_EN: Structure[] = [

  // 1. Short sentence (3 cases)
  {
    id: 'phrase-simple',
    nom: 'Short sentence',
    description: '3 parts — subject, verb, object',
    cases: [
      { fonction: 'subject', consigne: 'a subject noun phrase', type: 'groupe-nominal-riche' },
      { fonction: 'verb', consigne: 'a conjugated verb', type: 'verbe' },
      { fonction: 'object', consigne: 'an object noun phrase', type: 'groupe-nominal-riche' },
    ],
  },

  // 2. Full sentence — Breton's canonical form (5 cases)
  //    « The exquisite corpse shall drink the new wine »
  {
    id: 'phrase-etoffee',
    nom: 'Full sentence',
    description: "5 parts — Breton's canonical form",
    cases: [
      { fonction: 'subject', consigne: 'article + noun — ex: "the corpse", "a shadow", "a knife"', type: 'groupe-nominal' },
      { fonction: 'subject adjective', consigne: "a single adjective — ex: 'exquisite', 'nocturnal', 'broken'", type: 'adjectif' },
      { fonction: 'verb', consigne: "a conjugated verb — ex: 'drinks', 'devours', 'haunts'", type: 'verbe' },
      { fonction: 'object', consigne: 'article + noun — ex: "the wine", "the flame", "a mirror"', type: 'groupe-nominal' },
      { fonction: 'object adjective', consigne: "a single adjective — ex: 'new', 'opaque', 'hollow'", type: 'adjectif' },
    ],
  },

  // 3. Free verse (4 to 12 turns)
  {
    id: 'vers-libre',
    nom: 'Free verse',
    description: '4 to 12 lines — no constraint',
    cases: Array.from({ length: 12 }, (_, i) => ({
      fonction: `line ${i + 1}`,
      consigne: 'a line of 3 to 6 words — one physical, unexpected image',
      type: 'libre' as const,
    })),
    nombreCasesVariable: { min: 4, max: 12 },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

// L'Atelier — mode spécial hors liste (entrée discrète, non proposé dans /config).
// Le nombre de vers est tiré au sort à chaque séance (5 à 27) : cases vides ici.
export const STRUCTURE_ATELIER: Structure = {
  id: 'atelier',
  nom: "L'Atelier",
  description: '5 à 27 vers — toutes les voix convoquées',
  cases: [],
}

/** Liste des structures dans la langue active (l'anglais adapte les consignes). */
export function getStructuresActives(): Structure[] {
  return langueActuelle() === 'en' ? STRUCTURES_EN : STRUCTURES
}

export function getStructure(id: string): Structure {
  if (id === 'atelier') return STRUCTURE_ATELIER
  const pool = getStructuresActives()
  const s = pool.find(s => s.id === id)
  // Fallback gracieux pour les anciens poèmes avec des structures supprimées
  return s ?? pool.find(s => s.id === 'vers-libre')!
}

export function nombreCasesEffectif(structure: Structure): number {
  if (!structure.nombreCasesVariable) return structure.cases.length
  const { min, max } = structure.nombreCasesVariable
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function reconstruirePoeme(cases: Case[], structure: Structure): string {
  if (structure.id === 'vers-libre' || structure.id === 'atelier') {
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
