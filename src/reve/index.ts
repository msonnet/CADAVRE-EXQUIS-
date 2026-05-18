// Système Rêve nocturne · Q v3
// Décore l'application surréaliste avec :
//   · un rêve unique par jour (1 seed → palette + symbole + citation + heure + ...)
//   · des zones de placement protégées par écran
//   · animations d'entrée séquencées
//   · contenu commercial-safe (auteurs domaine public, références stylistiques)
//
// Usage minimal :
//   <ReveProvider><BrowserRouter>…</BrowserRouter></ReveProvider>
//
//   // dans une page (parent en position:relative + overflow:hidden) :
//   <HeaderKeywords />
//   <Decor variant="accueil" />

export { ReveProvider, Decor, HeaderKeywords, useReve, type SeanceReve, type Variant } from './Decor'
export { COLLAGES, type CollageDef, Hatches } from './collages'
export {
  COLOR_POOL, COLOR_SCHEMAS, CITATIONS, ETIQ_POOL, HEURES_NOCTURNES,
  MARGINALIA, STRIPE_COMBOS,
  type ColorKey, type ColorSchema, type Citation, type MargEntry, type StripeSpec,
} from './pools'
