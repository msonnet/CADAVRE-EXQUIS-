# Bilan — l'état du jeu au 15 septembre 2026

Clôture de la campagne ouverte par l'audit mobile du 10 septembre
(375 × 812, DPR 2, vingt lots). Ce document dit ce qui a changé, ce que la
mesure a démenti, ce qui reste, et ce qui est faux et le restera.

---

## 1 · Où en est le jeu

**Le code est prêt à être soumis.** Ce qui manque avant la mise en vente
n'est plus du code : c'est un compte RevenueCat, deux fiches de magasin et
une migration SQL à passer. Le détail est dans
[`mise-en-vente-encrier.md`](mise-en-vente-encrier.md) et
[`soumission-app-store.md`](soumission-app-store.md).

| | |
|---|---|
| Tests unitaires | **369** (Vitest) |
| Tests de bout en bout | **55** (Playwright, FR et EN) |
| `tsc --noEmit` · `npm run build` | verts |
| Précache du service worker | 103 entrées, 6,8 Mo |
| Poids du `dist/` | 8,1 Mo |
| Familles typographiques | 3, auto-hébergées, 428 Ko |

Au début de la campagne : 312 tests unitaires, 17 tests E2E.

---

## 2 · Les vingt lots

### Corrigés (16)

| Lot | Ce qui n'allait pas | Ce qui a été fait |
|---|---|---|
| 1 | Un vers pouvait être soumis deux fois au même rang — **le livrable se corrompait en silence** | Garde `rangsPourvus` dans `ajouterVers`, test de non-régression |
| 2 | L'illustration n'avait aucun état « en cours » | Attente tenue jusqu'au `onLoad` de l'image, relance après échec |
| 3 | Les trois boutons de partage ne disaient rien | `usePartage` — une seule machine d'état, presse-papiers d'abord |
| 4 | Toute la typographie venait de Google, **et elle est tombée pendant l'audit** | 3 familles variables auto-hébergées, précachées |
| 5 | iOS mettait une majuscule au milieu d'un vers | `CLAVIER_FRAGMENT` / `CLAVIER_VERS` sur les quatre champs |
| 7 | Des cibles tactiles sous 44 px | Règle **globale** sur `button, a[href], [role=button]` |
| 8 | La vignette d'ambiance recouvrait le texte | `useEcarterDuTexte` — recherche en spirale, `MutationObserver` |
| 9 | « 5 VOIX » sur une partie jouée seul | `libelleMorceaux` / `libelleMains` — le compte ne ment plus |
| 10 | Un écran de passage inutile en solo | Rideau d'acte qui se lève seul en 1,1 s |
| 11 | La carte du Recueil ne montrait pas le poème | Premier **vers**, vignette, `⟡ COUTURES` |
| 12 | L'ambiance était retirée à chaque rechargement | Graine stockée avec son jour |
| 13 | Le solde d'essai n'était lisible que dans les Réglages | Il s'écrit sous le bouton qui déclenche la dépense |
| 14 | La promesse d'anonymat était démentie par les coutures | « leurs noms ne te seront rendus qu'au dernier vers » |
| 15 | « il devient givré la rue, lait » — une faute, pas de l'étrangeté | `accord.ts` : **5 dislocations, 4 fautives avant, 0 après** |
| 17 | Zéro groupe sémantique, cinq boutons sans nom | `groupeRadio` / `optionRadio` / `zoneVivante` |
| 18 | Invite d'installation Android minimale | `id`, `screenshots`, `shortcuts`, `overscroll-behavior` |
| 20 | Il n'existait **nulle part** une copie de la bibliothèque | Export `.txt` + `.json`, et la restauration qui va avec |

Le lot 16 est à cheval : sa prémisse était fausse (voir plus bas) mais il
manquait vraiment `aria-controls`, qui a été ajouté.

### Démentis par la mesure (4)

Le brief demandait de reproduire avant de coder, et de le dire quand on n'y
arrive pas. Quatre constats ne se reproduisent pas.

- **Lot 6 — « 4 à 6 secondes avant de pouvoir agir ».** Mesuré sur cinq
  écrans : le bouton d'action est utilisable en **0 à 313 ms** (accueil 313,
  préparatifs 44, atelier 0, en jeu 15, acte I 29). Les cascades décoratives
  se jouent derrière un contenu déjà lisible. Rien n'a été touché.
- **Lot 16 — « les deux panneaux s'empilent ».** Un seul `activeSection` les
  gouverne : ouvrir IMAGE ferme COUTURES. Et `role="tablist"` aurait été un
  mensonge d'un autre genre — PARTAGER est une action, pas un onglet.
- **Lot 19 — « la série n'est jamais affichée ».** Elle s'affiche à partir de
  deux jours. Le relevé a été fait avec `compte: 1`.
- **Lot 20 — « le poème part chez Supabase ».** Faux :
  `sauvegarderPoeme` écrit dans Dexie et **aucun appel n'envoie un poème au
  serveur**. Seules les publications en galerie y vont, et ce sont des
  copies. La conclusion du lot tenait quand même, et elle était plus sévère
  que ce que le rapport croyait.

---

## 3 · Ce qui a été trouvé en chemin, et qui n'était pas dans l'audit

- **Un plantage complet de la page de fin** sous
  `prefers-reduced-motion: reduce` : `RevealAssemblageTexte` calculait une
  durée négative au treizième fragment et l'API Web Animations refusait.
  Personne n'avait ouvert cet écran avec le réglage actif. Vérifié sur `main`
  avant correction.
- **Un test instable hérité** : `metrique.test.ts` échouait une fois sur
  huit sur une assertion de queue. Douze mille séances simulées ont donné la
  vraie distribution (séries de 5 dans 2,7 % des cas, de 6 dans 0,4 %, de 7
  dans 0,03 %, jamais au-delà de 8) et l'assertion a été remplacée par une
  borne honnête.
- **Deux restes du lot 9** trouvés pendant le lot 11 : la carte du recueil
  disait encore « 5 voix », et `libelleMorceaux` traitait `vers-libre` comme
  des fragments là où `reconstruirePoeme` en joint les cases par des retours
  à la ligne, exactement comme l'atelier.
- **Un `<link>` vers Google sous un écran qui promet « AUCUN TRACKING »** :
  il transmettait l'IP du joueur à chaque chargement. Le lot 4 l'a fait
  disparaître au passage.

---

## 4 · Ce qui reste

### Avant la mise en vente — hors du code

- [ ] Appliquer `supabase/migrations/20260730000010_abonnement.sql`
- [ ] Créer le compte RevenueCat, l'entitlement `encrier`, l'offering
- [ ] Créer les abonnements dans App Store Connect et Google Play Console
- [ ] Renseigner les quatre variables `REVENUECAT_*`
- [ ] S'inscrire au Small Business Program d'Apple (15 % au lieu de 30 %)

Tant que la migration n'est pas passée, le jeu fonctionne **exactement comme
avant, en gratuit intégral** : registre injoignable vaut passage libre, côté
serveur comme côté client.

### Non bloquant — v1.1

- [ ] React Router — deux avis modérés. **Revérifiés le 15 septembre, tous
      deux inatteignables** : `deserializeErrors()` exige une hydratation SSR
      et l'application est un `BrowserRouter` pur ; la redirection ouverte par
      antislash exige une cible commençant par `//` ou `\\`, or chaque
      `navigate` dynamique est préfixé d'un segment littéral (`/salon/`,
      `/bibliotheque/`), et le seul `to` alimenté par une donnée d'autrui
      passe par `encodeURIComponent`.
- [ ] Haptique iOS : brancher `@capacitor/haptics` (`navigator.vibrate` est
      ignoré par WKWebView)
- [ ] `useAmbiance` est un moignon — le bouton son du mode dessin ne coupe
      rien
- [ ] Minuteur de tour en ligne côté serveur
- [ ] Mode spectateur codé mais sans point d'entrée
- [ ] La série compte les ouvertures, pas les poèmes écrits
- [ ] Réactions et vues de la galerie invisibles pour l'auteur
- [ ] Nettoyage des images orphelines dans Storage
- [ ] Sentry (optionnel — Vercel Analytics couvre les Web Vitals)

---

## 5 · Les limites connues, écrites pour qu'on ne les redécouvre pas

- **`prefers-reduced-motion` n'est honoré que par le dévoilement du poème.**
  Le plantage est corrigé, mais les autres animations framer-motion ne
  lisent toujours pas le réglage.
- **L'accord de la dislocation ne traite pas l'adjectif apposé** à un groupe
  nominal plus loin dans le vers. Il faudrait les rôles, pas le texte. Le
  module ne touche à rien quand il n'est pas sûr — élision, nom nu, adjectif
  invariable : on laisse. Un accord inventé est pire qu'un accord manquant,
  parce qu'il est invisible à la relecture.
- **Le dévoilement n'anime que neuf vers.** Un vers lisible coûte au moins
  un tiers de seconde ; trente-sept vers lisibles coûteraient vingt-cinq
  secondes, quoi qu'on règle. L'écran d'un téléphone en montre neuf : la
  tête reçoit le rythme entier, le reste est porté par un dernier volet qui
  s'ouvre sur un texte déjà écrit. Toute longueur tient en 10,7 s.
- **Le rebond iOS du lot 18 n'a pas été reproduit** — il n'y a pas d'iOS
  dans l'environnement de travail. Le correctif appliqué est le standard, il
  ne coûte rien, et l'écran natif tranchera.
- **Le solde de l'encrier se tait quand le registre ne répond pas.**
  C'est voulu : afficher un chiffre qu'on n'a pas reçu reviendrait à
  l'inventer, et il serait faux exactement pour celui qui a déjà consommé.

---

## 6 · La méthode, puisqu'elle a tenu

Elle est écrite dans `CLAUDE.md` depuis l'Atelier et cette campagne ne l'a
pas démentie une fois :

> Une monotonie ne se corrige que si on sait la compter : d'abord
> l'instrument, ensuite la cause, jamais la reformulation de consigne.

Ce qui s'y est ajouté en dix jours :

- **Reproduire avant de coder**, et le dire quand on n'y arrive pas. Quatre
  lots sur vingt étaient des constats d'audit qui ne se reproduisent pas ;
  les corriger « au cas où » aurait ajouté du code sans rien réparer.
- **Un test doit échouer sur l'ancien code.** Chacun de ceux ajoutés ici a
  été vérifié dans les deux sens, en revenant au code d'avant.
- **Un test instable est pire que pas de test.** On mesure la vraie
  distribution et on pose une borne honnête, ou on retire l'assertion et on
  écrit pourquoi.
- **Une règle vaut mieux qu'une liste.** Énumérer les boutons trop petits
  les corrigeait aujourd'hui ; la règle globale les corrige aussi demain.
