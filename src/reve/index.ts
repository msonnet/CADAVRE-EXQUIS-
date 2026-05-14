// Système « Rêve nocturne »
// Décore l'application avec un collage référencé + marginalia + dérèglement,
// composition unique par seed (1 par jour).
//
// Usage :
//   import { ReveProvider, Decor, SignatureReve, useReve } from './reve'
//
//   // dans App.tsx :
//   <ReveProvider><BrowserRouter>…</BrowserRouter></ReveProvider>
//
//   // dans une page (avec position: relative sur le conteneur) :
//   <Decor variant="accueil" />

export { ReveProvider, Decor, SignatureReve, useReve } from './Decor'
export { COLLAGES, type CollageDef } from './collages'
export { MARGINALIA, type MargEntry } from './pools'
