# HANDOFF — Almanach surréaliste & Rêve nocturne

Ce dossier contient le **système de design + le système « rêve nocturne »** prêt à intégrer dans ton projet React + TypeScript + Vite + Tailwind.

---

## 1 · Ce qui est livré

```
handoff/
├── tailwind.config.js          # ↻ remplace le tien
├── src/
│   ├── index.css                # ↻ remplace le tien
│   ├── App.tsx                  # ↻ remplace le tien (wrap ReveProvider)
│   ├── pages/
│   │   └── Accueil.tsx          # ↻ exemple complet refait
│   └── reve/                    # ← nouveau dossier à créer
│       ├── index.ts
│       ├── Decor.tsx
│       ├── collages.tsx         # 17 collages SVG référencés
│       ├── pools.ts             # 25 marginalia + dérèglements
│       └── prng.ts              # PRNG + mémoire localStorage
```

---

## 2 · Instructions d'intégration (10 min)

### Étape 1 — Remplacer la config Tailwind
Copie `handoff/tailwind.config.js` → `tailwind.config.js` à la racine.

→ La palette est élargie : `papier`, `encre`, `rouge`, `or`, `gris` (+ variantes).
→ Les fontes ajoutées : `font-bodoni`, `font-fell`, `font-cormorant`, `font-caveat`.
→ **Compat** : `font-garamond` et `font-lora` pointent vers les nouvelles, donc tes pages existantes ne cassent pas.

### Étape 2 — Remplacer le CSS de base
Copie `handoff/src/index.css` → `src/index.css`.

→ Charge automatiquement les 4 fontes Google (Bodoni Moda, IM Fell English, Cormorant Garamond, Caveat).
→ Définit toutes les classes utilitaires : `.titre-principal`, `.btn-primaire`, `.filet-double`, `.lettrine`, `.petite-cap`, `.folio`, etc.
→ Le fond papier est doublé d'une texture SVG subtile.

### Étape 3 — Créer le dossier `src/reve/`
Copie le dossier complet `handoff/src/reve/` → `src/reve/`.

```
src/reve/
├── index.ts        # exports
├── Decor.tsx       # ReveProvider + composant Decor
├── collages.tsx    # 17 SVGs
├── pools.ts        # données
└── prng.ts         # PRNG + mémoire
```

### Étape 4 — Wrap l'app dans `ReveProvider`
Remplace ton `src/App.tsx` par celui livré, OU ajoute juste le wrap :

```tsx
import { ReveProvider } from './reve'

export default function App() {
  return (
    <ReveProvider>
      <BrowserRouter>
        {/* routes */}
      </BrowserRouter>
    </ReveProvider>
  )
}
```

### Étape 5 — Refaire la page Accueil
Remplace `src/pages/Accueil.tsx` par `handoff/src/pages/Accueil.tsx`.

→ C'est l'exemple complet : décor du rêve, lettre déréglée, folios, bouton « re-rêver ».

---

## 3 · Adapter les autres pages (Configuration, Jeu, FinDePartie…)

Pour chaque page, **3 lignes suffisent** :

```tsx
import { Decor, useReve } from '../reve'

export default function Configuration() {
  // ...
  return (
    <PageTransition className="page-carnet relative ...">
      <Decor variant="config" />   {/* ← ajoute le décor */}

      {/* le contenu existant, mais avec les nouvelles classes */}
    </PageTransition>
  )
}
```

Le composant `<Decor variant="X" />` accepte :
- `variant`: `'accueil' | 'config' | 'jeu' | 'fin' | 'biblio' | 'detail'`
- `collageIndex` (optionnel) : forcer un collage précis (0..5)
- `hideLabel`, `hideMarginalia`, `hideDereglement` : couper certains éléments

**Le conteneur de la page doit avoir `position: relative` et `overflow: hidden`** pour que les collages placés en absolute se positionnent bien.

---

## 4 · Mapping des classes anciennes → nouvelles

Si tu veux migrer rapidement, voici la table d'équivalence :

| Ancienne classe | Nouvelle classe | Rôle |
|---|---|---|
| `text-or` | `text-rouge` | accent principal |
| `text-encre` | `text-encre` | inchangé |
| `font-garamond` | `font-bodoni` (auto-aliasé) | titres |
| `font-lora` | `font-fell` (auto-aliasé) | corps |
| `bg-ivoire` | `bg-papier` | fond |
| `.separateur-or` | `.filet-rouge` (auto-aliasé) | séparateur |
| `.titre-principal` | `.titre-principal` | inchangé (mais fonte changée) |
| `.btn-primaire` | `.btn-primaire` | inchangé (mais style refait) |
| `.consigne-grammaticale` | `.consigne-grammaticale` | inchangé |
| — | `.folio` | mini-texte en-tête « Tome I · Feuillet N » |
| — | `.petite-cap` / `.petite-cap-rouge` | petites capitales |
| — | `.lettrine` | grand B initial rouge |
| — | `.filet-double` | filet ── ── (deux traits) |

---

## 5 · Tester en local

```bash
npm install      # rien à installer en plus — tout est déjà là
npm run dev
```

Tu devrais voir :
- L'Accueil avec un collage référencé (différent à chaque rafraîchissement de jour)
- Un sous-titre « pour cerveaux d'urgence et amoureux »
- Le bouton « ✦ re-rêver » qui change le tirage
- En bas à droite : « rêve № 17 »

---

## 6 · Roadmap suggérée pour les pages restantes

| Page | Priorité | Travail |
|---|---|---|
| Accueil | ✓ fait | Exemple livré |
| Configuration | haute | Ajouter `<Decor variant="config" />` + remplacer les fontes (font-garamond → font-bodoni) |
| Jeu | haute | Idem + champ d'écriture en `.champ-carnet` |
| FinDePartie | haute | Lettrine rouge sur 1ʳᵉ lettre du poème, `<Decor variant="fin" />`, ornement entre vers |
| Bibliotheque | moyenne | Items en numéros romains, `<Decor variant="biblio" />` |
| PoemeDetail | moyenne | Lettrine + `<Decor variant="detail" />` |
| Aide / Reglages | basse | Juste appliquer le nouveau Tailwind, ça suffit |

---

## 7 · Notes techniques

- **Le seed du rêve est stocké par jour** (`cadavre-seed-YYYY-MM-DD`) — l'app a le même rêve pendant 24h, change automatiquement le lendemain. Le bouton « re-rêver » force un nouveau tirage immédiat.
- **La mémoire des collages** (`cadavre-memoire-collages`) garde un compteur d'apparitions par collage. Un collage tiré 3+ fois est temporairement exclu pour garantir la variété.
- **Les animations** (`collageDrop`, `inkBloom`) sont définies dans Tailwind config — utilisables via `animate-collage-drop` / `animate-ink-bloom` si besoin.
- **Aucune dépendance supplémentaire** : tout passe par les fontes Google déjà importées dans le CSS.

---

## Questions / blocages ?

Si tu veux que j'adapte d'autres pages, dis-moi lesquelles et je te livre les versions complètes dans un prochain dossier.
