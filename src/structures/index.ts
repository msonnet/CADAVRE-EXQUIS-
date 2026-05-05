// Structures grammaticales — coeur du jeu

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

  // 1. Phrase simple (3 cases)
  {
    id: 'phrase-simple',
    nom: 'Phrase simple',
    description: '3 cases — sujet, verbe, complement',
    cases: [
      { fonction: 'sujet', consigne: 'un groupe nominal sujet', type: 'groupe-nominal' },
      { fonction: 'verbe', consigne: 'un verbe conjugue', type: 'verbe' },
      { fonction: 'complement', consigne: 'un groupe nominal complement', type: 'groupe-nominal' },
    ],
  },

  // 2. Phrase etoffee — canonique de Breton (7 cases)
  {
    id: 'phrase-etoffee',
    nom: 'Phrase etoffee',
    description: '7 cases — la canonique de Breton',
    cases: [
      { fonction: 'article + adjectif', consigne: 'un article suivi d\'un adjectif', type: 'adjectif' },
      { fonction: 'nom sujet', consigne: 'un nom commun (sujet)', type: 'nom' },
      { fonction: 'adjectif du sujet', consigne: 'un adjectif qui qualifie le sujet', type: 'adjectif' },
      { fonction: 'verbe', consigne: 'un verbe conjugue au futur', type: 'verbe' },
      { fonction: 'article + adjectif (COD)', consigne: 'un article suivi d\'un adjectif', type: 'adjectif' },
      { fonction: 'nom COD', consigne: 'un nom commun (complement d\'objet)', type: 'nom' },
      { fonction: 'adjectif du COD', consigne: 'un adjectif qui qualifie le complement', type: 'adjectif' },
    ],
  },

  // 3. Conditionnelle (8 cases)
  {
    id: 'conditionnelle',
    nom: 'Conditionnelle',
    description: '8 cases — si... alors',
    cases: [
      { fonction: 'sujet (condition)', consigne: 'un groupe nominal sujet', type: 'groupe-nominal' },
      { fonction: 'verbe (condition)', consigne: 'un verbe a l\'imparfait', type: 'verbe' },
      { fonction: 'complement (condition)', consigne: 'un complement : lieu, objet ou maniere', type: 'groupe-nominal' },
      { fonction: 'circonstance (condition)', consigne: 'un groupe circonstanciel de temps', type: 'groupe-nominal' },
      { fonction: 'sujet (consequence)', consigne: 'un groupe nominal sujet', type: 'groupe-nominal' },
      { fonction: 'verbe (consequence)', consigne: 'un verbe au conditionnel', type: 'verbe' },
      { fonction: 'complement (consequence)', consigne: 'un groupe nominal complement', type: 'groupe-nominal' },
      { fonction: 'circonstance (consequence)', consigne: 'un groupe circonstanciel final', type: 'groupe-nominal' },
    ],
    separateurs: { 5: ' , alors ' },
  },

  // 4. Comparative (7 cases)
  {
    id: 'comparative',
    nom: 'Comparative',
    description: '7 cases — comme',
    cases: [
      { fonction: 'sujet', consigne: 'un groupe nominal sujet', type: 'groupe-nominal' },
      { fonction: 'verbe', consigne: 'un verbe conjugue', type: 'verbe' },
      { fonction: 'complement', consigne: 'un complement (objet ou lieu)', type: 'groupe-nominal' },
      { fonction: 'terme compare — sujet', consigne: 'un groupe nominal (ce a quoi on compare)', type: 'groupe-nominal' },
      { fonction: 'terme compare — verbe', consigne: 'un verbe conjugue', type: 'verbe' },
      { fonction: 'terme compare — complement', consigne: 'un complement du terme de comparaison', type: 'groupe-nominal' },
      { fonction: 'circonstance finale', consigne: 'un groupe circonstanciel final', type: 'adverbe' },
    ],
    separateurs: { 4: ' comme ' },
  },

  // 5. Enumerative (5 a 8 cases)
  {
    id: 'enumerative',
    nom: 'Enumerative',
    description: '5 a 8 elements — liste libre',
    cases: [
      { fonction: 'element 1', consigne: 'un groupe nominal', type: 'groupe-nominal' },
      { fonction: 'element 2', consigne: 'un groupe nominal', type: 'groupe-nominal' },
      { fonction: 'element 3', consigne: 'un groupe nominal', type: 'groupe-nominal' },
      { fonction: 'element 4', consigne: 'un groupe nominal', type: 'groupe-nominal' },
      { fonction: 'element 5', consigne: 'un groupe nominal', type: 'groupe-nominal' },
      { fonction: 'element 6', consigne: 'un groupe nominal', type: 'groupe-nominal' },
      { fonction: 'element 7', consigne: 'un groupe nominal', type: 'groupe-nominal' },
      { fonction: 'element 8', consigne: 'un groupe nominal', type: 'groupe-nominal' },
    ],
    nombreCasesVariable: { min: 5, max: 8 },
  },

  // 6. Question / Reponse
  {
    id: 'question-reponse',
    nom: 'Question / Reponse',
    description: 'Paires de questions et reponses',
    cases: [
      { fonction: 'question 1', consigne: 'pose une question (mot interrogatif)', type: 'proposition' },
      { fonction: 'reponse 1', consigne: 'reponds a une question — sans la connaitre', type: 'proposition' },
      { fonction: 'question 2', consigne: 'pose une nouvelle question', type: 'proposition' },
      { fonction: 'reponse 2', consigne: 'reponds — sans connaitre la question', type: 'proposition' },
      { fonction: 'question 3', consigne: 'pose une derniere question', type: 'proposition' },
      { fonction: 'reponse 3', consigne: 'reponds une derniere fois', type: 'proposition' },
    ],
  },

  // 7. Vers libre (4 a 12 tours)
  {
    id: 'vers-libre',
    nom: 'Vers libre',
    description: '4 a 12 tours — aucune contrainte syntaxique',
    cases: Array.from({ length: 12 }, (_, i) => ({
      fonction: `vers ${i + 1}`,
      consigne: 'un vers — ce qui te vient, dans ta langue',
      type: 'libre' as const,
    })),
    nombreCasesVariable: { min: 4, max: 12 },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStructure(id: StructureId): Structure {
  const s = STRUCTURES.find(s => s.id === id)
  if (!s) throw new Error(`Structure inconnue : ${id}`)
  return s
}

export function nombreCasesEffectif(structure: Structure): number {
  if (!structure.nombreCasesVariable) return structure.cases.length
  const { min, max } = structure.nombreCasesVariable
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function reconstruirePoeme(cases: Case[], structure: Structure): string {
  if (structure.id === 'enumerative') {
    const textes = cases.map(c => c.texte.trim())
    if (textes.length <= 1) return textes[0] ?? ''
    return textes.slice(0, -1).join(', ') + ' et ' + textes[textes.length - 1]
  }

  if (structure.id === 'question-reponse' || structure.id === 'vers-libre') {
    return cases.map(c => c.texte.trim()).join('\n')
  }

  const sep = structure.separateurs ?? {}
  const parts: string[] = []

  if (structure.id === 'conditionnelle') parts.push('Si ')

  cases.forEach((c, index) => {
    const num = index + 1
    if (sep[num]) parts.push(sep[num])
    parts.push(c.texte.trim())
  })

  return parts.join(' ')
}
