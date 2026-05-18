# HANDOFF · Système Rêve Q v3 + Safe Zones

Direction artistique finalisée pour **Cadavre Exquis** — à intégrer dans le repo TypeScript existant.

---

## 1 · Ce qui est livré

```
handoff/
├── HANDOFF.md                       ← ce fichier
├── SAFE-ZONES.tsx                   ← documentation des zones protégées par écran
└── src/
    ├── reve/
    │   ├── index.ts                 ← exports publics
    │   ├── Decor.tsx                ← composant central + ReveProvider + HeaderKeywords
    │   ├── pools.ts                 ← palettes, citations, étiquettes, heures, rayures
    │   ├── animations.css           ← keyframes à ajouter à src/index.css
    │   └── collages.tsx             ← INCHANGÉ (déjà dans ton repo)
    │   └── prng.ts                  ← INCHANGÉ (déjà dans ton repo)
    └── pages/
        └── Accueil.tsx              ← exemple d'utilisation complet
```

---

## 2 · Ce qui a évolué depuis la dernière version

| Avant | Maintenant |
|---|---|
| Palette générée parmi 8 schemas | **5 palettes ciblées** : rouge sang, cinabre, ocre brûlée, bleu prusse, pourpre |
| Décor uniforme sur tous les écrans | **6 variants** : `accueil`, `config`, `jeu`, `jeu-ia`, `fin`, `fin-image`, `biblio`, `detail` |
| Pas de cartel | **Cartel d'identification** sous chaque symbole (références stylistiques only) |
| Pas de citation | **Citation rotative** parmi 7 (Breton, Desnos, Apollinaire, Cocteau — DP en France) |
| Signature « rêve № 17 » | **Signature poétique** : « rêvé à 03h47, vendredi » (heure nocturne tirée) |
| Animation simple `collageDrop` | **Animation séquencée** : titre 0.2s → symbole 0.5s → étiquettes 0.9-1.1s → citation 1.3s → CTA 1.5s → signature 1.8s |
| Pas de protection | **Safe zones par variant** : le décor ne s'aventure jamais sur les zones interactives |

---

## 3 · Intégration (étape par étape)

### Étape 1 — Remplacer 3 fichiers
```bash
cp handoff/src/reve/Decor.tsx   src/reve/Decor.tsx
cp handoff/src/reve/index.ts    src/reve/index.ts
cp handoff/src/reve/pools.ts    src/reve/pools.ts
```

### Étape 2 — Ajouter les animations
Ouvre `handoff/src/reve/animations.css` et **colle son contenu à la fin** de `src/index.css`.

### Étape 3 — Adapter chaque page
Pour chacune des 6 pages, le pattern est identique :

```tsx
import { Decor, HeaderKeywords, useReve } from '../reve'

export default function MaPage() {
  const seance = useReve()

  return (
    <PageTransition className="page-carnet relative ... overflow-hidden">

      {/* DÉCOR — toujours en premier (z-index 1-4) */}
      <HeaderKeywords />                  {/* facultatif, surtout pour Accueil/Fin */}
      <Decor variant="accueil" />          {/* ← change selon la page */}

      {/* CONTENU INTERACTIF — z-index 5+ pour passer devant le décor */}
      <div className="relative z-10">
        {/* ton contenu existant inchangé */}
      </div>

    </PageTransition>
  )
}
```

### Mapping `variant` → page

| Page | Variant à utiliser |
|---|---|
| `Accueil.tsx` | `<Decor variant="accueil" />` + `<HeaderKeywords />` |
| `Configuration.tsx` | `<Decor variant="config" />` |
| `Jeu.tsx` (tour humain) | `<Decor variant="jeu" />` — SANCTUAIRE, juste un mini-symbole |
| `Jeu.tsx` (tour IA) | `<Decor variant="jeu-ia" />` — symbole centré opacité 0.5 |
| `FinDePartie.tsx` SANS illustration | `<Decor variant="fin" />` |
| `FinDePartie.tsx` AVEC illustration générée | `<Decor variant="fin-image" />` ← décor minimal |
| `Bibliotheque.tsx` | `<Decor variant="biblio" />` |
| `PoemeDetail.tsx` | `<Decor variant="detail" />` |

Le détail des safe zones par écran est dans `SAFE-ZONES.tsx`.

---

## 4 · Couleur du rêve dans le contenu interactif

Pour que la palette du rêve participe à l'expérience, **utilise `useReve()` dans ta page** pour colorer dynamiquement :

```tsx
const seance = useReve()
const accent = seance?.colorSchema.hex ?? '#b22c20'

// 1. Le caret du textarea
<textarea style={{ caretColor: accent }} />

// 2. Le bouton CTA principal
<button style={{ background: accent, boxShadow: `3px 3px 0 var(--reve-encre)` }}>
  sceller cette voix →
</button>

// 3. Les mots-clés dans la consigne
<span style={{ color: accent }}>verbe</span>

// 4. Les labels de section
<div className="petite-cap" style={{ color: accent }}>— CONSIGNE —</div>
```

---

## 5 · Sécurité commerciale

✓ **Aucune citation d'auteur sous droits** — uniquement Breton (DP 2017), Desnos (DP 2016), Apollinaire (DP 1989), Cocteau (DP 2014)
✓ **Aucun titre d'œuvre reproduit** — les cartels indiquent uniquement des références stylistiques (« d'après l'antique grec », « gravure surréaliste, 1929 »)
✓ **Aucun nom de marque** (Magritte, Dalí, Buñuel ne sont jamais cités dans l'UI utilisateur)
✓ **Polices** : EB Garamond, Bodoni Moda, IM Fell English, Cormorant Garamond, Caveat — toutes en licence SIL Open Font (commerce-safe via Google Fonts)

---

## 6 · Vérification après intégration

Au chargement de chaque page, contrôle visuellement :

- [ ] Le titre / les vers du poème / le formulaire / les CTAs **ne sont jamais recouverts** par un collage ou une étiquette
- [ ] La couleur du rêve change au reload (re-rêver via bouton ✦)
- [ ] L'animation d'entrée s'enchaîne ~1.8s puis tout est stable
- [ ] La signature « rêvé à 03h47, vendredi » apparaît bien en bas à droite (sauf sur Jeu)
- [ ] Sur l'écran Jeu, **aucune étiquette ne flotte près du textarea** (sanctuaire)
- [ ] Sur Fin de partie AVEC illustration, le décor est très réduit (`variant="fin-image"`)

---

## 7 · Si quelque chose casse

**Le décor recouvre un bouton** → vérifie que le parent a `position: relative; overflow: hidden;` et que ton contenu interactif est en `z-index: 5+`.

**Les animations ne jouent pas** → vérifie que `animations.css` est bien collé dans `src/index.css` et que Caveat est chargé (l'`@import` est dans `animations.css`).

**`useReve()` renvoie null** → l'app n'est pas enveloppée dans `<ReveProvider>`. Vérifie `App.tsx`.

**Crash TypeScript sur `variant`** → la variante doit être l'une des suivantes : `'accueil' | 'config' | 'jeu' | 'jeu-ia' | 'fin' | 'fin-image' | 'biblio' | 'detail'`.

---

Tout est prêt. Bonne intégration.
