// Système Rêve nocturne · Q v3
// 5 ambiances dynamiques (Minuit / Encre / Argile / Lin / Aube)
// Les variables CSS --reve-bg / --reve-ink / --reve-accent sont écrites
// sur :root par <ReveProvider> à chaque changement de rêve.

export { ReveProvider, Decor, HeaderKeywords, useReve, type SeanceReve, type Variant } from './Decor'
export { COLLAGES, type CollageDef, Hatches } from './collages'
export {
  AMBIANCES, AMBIANCE_POOL, CITATIONS, ETIQ_POOL,
  HEURES_NOCTURNES, MARGINALIA,
  type Ambiance, type AmbianceKey, type Accent,
  type Citation, type MargEntry, type ColorSchema,
} from './pools'
export { garantirContraste, ratioContraste } from './contraste'
