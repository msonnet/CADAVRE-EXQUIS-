// Système « Rêve nocturne » — direction artistique surréaliste avec rêve unique par jour
//
// Usage :
//   import { ReveProvider, Decor, HeaderKeywords, VerticalAccent, SignatureReve, useReve } from '~/reve'
//
//   // dans App.tsx :
//   <ReveProvider><BrowserRouter>…</BrowserRouter></ReveProvider>
//
//   // dans une page (avec position: relative + overflow: hidden) :
//   <HeaderKeywords />
//   <Decor variant="accueil" />
//   <VerticalAccent text="CADAVRE" />
//   <SignatureReve />

export {
  ReveProvider, Decor, HeaderKeywords, VerticalAccent, SignatureReve,
  TornCollage, useReve,
} from './Decor'
export { COLLAGES, type CollageDef, Hatches } from './collages'
export { MARGINALIA, COLOR_POOL, COLOR_SCHEMAS, type ColorKey, type MargEntry } from './pools'
