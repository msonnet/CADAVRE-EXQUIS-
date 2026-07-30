# Soumission App Store — état et marche à suivre

Dernière vérification : 30 juillet 2026, sur le commit courant de `main`.

---

## 1. État vérifié côté code

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `npm run build` | build PWA complet, service worker généré |
| Tests unitaires (Vitest) | 74 / 74 |
| Tests E2E (Playwright, FR + EN) | 16 / 16 |
| Secrets dans le dépôt | aucun (`.env.example` seul versionné) |
| `console.log` résiduels dans `src/` | 0 |
| `TODO` / `FIXME` / `debugger` | 0 |
| Gestionnaire d'erreurs de debug dans `dist/` | retiré — l'app affiche l'écran « Le carnet s'est déchiré. » |
| Sondes production (`/api/claude`, `/api/corriger`, `/privacy`, `/`) | HTTP 200 |

### Vulnérabilités npm

Trois corrigées (`tar` critique, `brace-expansion` haute, `dompurify` modérée).

Deux modérées restent, dans `react-router` : elles exigent un passage en
**v7 majeure**, écarté avant soumission. Non atteignables ici :
- *open redirect via backslash* — les 88 appels `navigate()` visent des routes
  littérales ; les segments dynamiques (`/u/:pseudo`) sont encodés ;
- *deserializeErrors()* — l'app n'utilise ni loaders, ni actions, ni API data.

À planifier après la mise en ligne, avec la suite E2E comme filet.

---

## 2. Conformité aux règles Apple

| Règle | Où |
|---|---|
| **1.2 — contenu généré par les utilisateurs** | signalement (`⚑` sur chaque publication → `api/report.ts`), blocage d'auteur (`⊘ Masquer l'auteur`, réinitialisable dans Réglages), suppression de ses propres publications |
| **5.1.1 (v) — suppression de compte** | Profil → « SUPPRIMER MON COMPTE » → `api/delete-account.ts` (jeton vérifié, publications anonymisées, profil et compte auth supprimés) |
| **5.1.1 — politique de confidentialité** | page `/privacy`, bilingue FR/EN, RGPD |
| **2.3 — pas de contenu de debug** | gestionnaire retiré, écran d'erreur au registre du jeu |
| **4.0 — design** | icône et splash cohérents, interface bilingue complète |
| **3.1.1 — achats intégrés** | l'abonnement passe par StoreKit via RevenueCat ; « Restaurer mes achats » présent dans le mur et dans Réglages |
| **3.1.2 — abonnements reconductibles** | le mur affiche le titre, la durée, le prix du magasin, la mention de reconduction, un lien vers l'EULA standard d'Apple et vers `/privacy` |

### App Privacy (à remplir dans App Store Connect)

Données **liées à l'utilisateur** : adresse e-mail et pseudonyme (compte
Supabase), contenu créé et publié en galerie, avatar généré, **historique
d'achat** (date d'expiration de l'abonnement et identifiant du produit).
Données **non liées** : adresse IP conservée ≤ 60 s pour le rate limiting.
**Aucun tracking**, aucune donnée vendue, aucun identifiant publicitaire,
**aucune publicité diffusée**.

---

## 3. Fiche App Store

- **Bundle ID** : `fr.nathansonnet.cadavreexquis`
- **Version** : 1.0.0 · **iOS minimum** : 16.0
- **Catégorie** : Games → Word Games · **Âge** : 4+
- **Politique de confidentialité** : `https://cadavre-exquis-beta.vercel.app/privacy`
- **Support** : `https://cadavre-exquis-beta.vercel.app`
- **Textes anglais** prêts à coller : [`docs/app-store-en.md`](./app-store-en.md)

---

## 4. Ce qu'il reste à faire — sur ton Mac

### a. Générer les binaires

```bash
npm install
npm run build

# première fois seulement
npm run cap:add:ios
npm run cap:add:android

# icônes et splash à toutes les tailles, depuis resources/
npx @capacitor/assets generate \
  --iconBackgroundColor '#000000' \
  --splashBackgroundColor '#000000'

npm run cap:ios        # Xcode → Product > Archive → App Store Connect
npm run cap:android    # Android Studio → Generate Signed Bundle
```

Le fond passe au **noir pur** : l'Œil cousu est composé sur noir, l'ancien
`#0f0805` laisserait un liseré visible autour du sceau.

### b. Captures d'écran

Obligatoires en **6,7"** et **6,5"** (plus iPad si tu coches le support iPad).

Écrans conseillés, dans cet ordre : la révélation d'un poème (l'écran qui vend
le jeu), l'écran d'écriture avec sa consigne, les COUTURES nommant les voix,
le cadavre dessiné assemblé, la galerie.

À faire **deux fois** : une série en français, une en anglais (bascule dans
Réglages → LANGUE avant de capturer).

### c. Variables d'environnement Vercel

Vérifier qu'elles sont bien en Production avant la revue — l'app packagée tape
sur `https://cadavre-exquis-beta.vercel.app`.

| Variable | Rôle | Requis |
|---|---|---|
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` | base, auth, galerie | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | cron de nettoyage, suppression de compte | oui |
| `ANTHROPIC_API_KEY` | voix IA, correction, lecture des dessins | oui |
| `FAL_KEY` | illustrations (FLUX) | oui |
| `CRON_SECRET` | protège `/api/cleanup` | oui |
| `RESEND_API_KEY` + `REPORT_EMAIL` | e-mail au modérateur à chaque signalement | recommandé (modération 1.2) |
| `REVENUECAT_WEBHOOK_SECRET` | authentifie le webhook du magasin | oui (abonnement) |
| `REVENUECAT_SECRET_KEY` | relit l'abonnement lors d'une restauration | oui (abonnement) |
| `VITE_REVENUECAT_IOS_KEY` · `VITE_REVENUECAT_ANDROID_KEY` | clés publiques embarquées dans l'app native | oui (abonnement) |

### d. Abonnement — à créer avant la soumission

**Dans App Store Connect** (Fonctionnalités → Abonnements) : un groupe
d'abonnement nommé *L'Encrier*, contenant deux produits.

| Identifiant | Durée | Prix |
|---|---|---|
| `fr.nathansonnet.cadavreexquis.encrier.mensuel` | 1 mois | 4,99 € |
| `fr.nathansonnet.cadavreexquis.encrier.annuel` | 1 an | 39,99 € |

Les mêmes identifiants dans Google Play Console.

**Dans RevenueCat** : un entitlement nommé **`encrier`** (le code le cherche
sous ce nom exact), un offering `default` contenant les deux produits, puis
le webhook pointé sur `https://cadavre-exquis-beta.vercel.app/api/revenuecat`
avec l'en-tête `Authorization` égal à `REVENUECAT_WEBHOOK_SECRET`.

**S'inscrire au Small Business Program** d'Apple : 15 % de commission au lieu
de 30 %. Tous les calculs de marge du dossier partent de ce taux.

### e. Compte de démonstration pour la revue

Apple teste le mode en ligne. Dans « App Review Information », fournir un
pseudo de test et cette note :

> Online play requires only a pen name — no password, no e-mail. Tap "Online
> mode", enter any pen name, then "Create a game". Solo play (Written Cadavre,
> Drawn Cadavre, The Workshop) needs no account at all.
>
> The game is free. A one-time trial (5 illustrations, 5 games with the AI
> voices, 3 drawing readings) is granted automatically on first use — no
> account, no purchase needed, so the reviewer can exercise every paid
> feature without subscribing. The "Inkwell" subscription only unlocks
> unlimited use afterwards.

---

## 5. Connu, assumé, non bloquant

- Salons en ligne : le minuteur de tour est **local**. Si le joueur dont c'est
  le tour ferme l'app, la partie attend. Les autres peuvent quitter le salon.
- Le mode **spectateur** est codé mais sans point d'entrée dans l'interface.
- La **série** (streak) compte les ouvertures de l'app, pas les poèmes écrits.
- Les **réactions et vues** de la galerie ne remontent pas à l'auteur.
- `useAmbiance` est un moignon : le bouton son de l'écran de dessin ne coupe
  rien (les sons restent coupés par l'interrupteur physique iOS).
- L'**haptique** repose sur `navigator.vibrate`, non implémenté par le WKWebView
  iOS : aucune vibration sur iPhone tant que `@capacitor/haptics` n'est pas
  branché.
- `prefers-reduced-motion` neutralise le CSS mais pas les animations
  framer-motion.

Aucun de ces points n'est un motif de rejet ; ils sont documentés pour la v1.1.
