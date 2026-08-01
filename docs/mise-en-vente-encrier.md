# Mettre L'Encrier en vente — feuille de route

Le code est écrit, la comptabilité tourne en production. Ce qui reste se passe
entièrement dans les consoles d'Apple, de RevenueCat et de Vercel — et une
seule fois dans Xcode, tout à la fin.

> **Compte une semaine d'attente administrative** avant de pouvoir tester le
> moindre achat : 24 à 48 h pour l'adhésion au Developer Program (phase 0),
> puis quelques jours pour la validation bancaire (phase A). Lance ces deux
> démarches en premier, le reste s'enchaîne pendant l'attente.

---

## À recopier au caractère près

| Quoi | Valeur |
|---|---|
| Bundle ID | `fr.nathansonnet.cadavreexquis` |
| Abonnement mensuel — 4,99 € | `fr.nathansonnet.cadavreexquis.encrier.mensuel` |
| Abonnement annuel — 39,99 € | `fr.nathansonnet.cadavreexquis.encrier.annuel` |
| Entitlement RevenueCat | `encrier` |
| URL du webhook | `https://cadavre-exquis-beta.vercel.app/api/revenuecat` |

Ce sont les seules choses où une faute de frappe coûte une heure de débogage.

---

## ✅ Déjà fait — la comptabilité tourne

Migration appliquée, essai attribué, décompté et refusé au bon moment.
Parcours complet joué en production sur une vraie identité anonyme :

| Contrôle | Résultat |
|---|---|
| Joueur neuf | 5 images · 5 parties · 3 lectures |
| Sixième partie | refusée, `essai_epuise` |
| Partie rejouée | ne se repaie pas |
| Reçu volé à un autre joueur | refusé |
| Illustration grand format | générée, réserve 5 → 4 |
| Actes payants sans identité | 401 |

> **Conséquence en cours.** Sur le web, un joueur qui épuise son essai voit
> désormais un mur sans issue — l'abonnement n'existe que dans l'app native.
> C'est le prix de l'activation, et c'est réversible en deux minutes.

---

## Phase 0 — L'inscription au Developer Program

**Où :** developer.apple.com · **Délai : 24 à 48 h**

Préalable à absolument tout. Posséder un identifiant Apple ne donne **pas**
accès à App Store Connect : sans adhésion au Developer Program, la console
répond « Compte de développeur requis » (erreur 2002), et il n'y a ni fiche
d'app, ni Bundle ID, ni TestFlight, ni soumission possible.

- [ ] Vérifier l'état sur **developer.apple.com/account**, dans un navigateur
      (pas l'app iOS, qui affiche parfois 2002 à tort)
- [ ] Activer la **double authentification** sur l'identifiant Apple — sans
      elle l'inscription refuse d'aller au bout
- [ ] S'inscrire au **Apple Developer Program** — 99 €/an

**Individu ou organisation ?** Pour ce projet, **individu** : validation sous
24 à 48 h, aucune paperasse, ton nom apparaît comme éditeur. L'inscription en
organisation exige un numéro **D-U-N-S** et prend une à deux semaines — à ne
choisir que si tu veux qu'une société figure comme éditeur. Le passage de
l'un à l'autre reste possible plus tard.

**Passe à la suite quand :** developer.apple.com/account affiche une section
*Membership* avec un **Team ID**, et qu'appstoreconnect.apple.com s'ouvre
sans erreur.

---

## Phase A — Les contrats Apple

**Où :** App Store Connect · **Délai : compte en jours**

Commence par là, même si ça n'a rien d'excitant : la validation bancaire
d'Apple prend parfois plusieurs jours, et **aucun achat ne fonctionne tant
qu'elle n'est pas passée** — pas même en test. C'est la cause numéro un des
« ça ne marche pas et je ne comprends pas ».

- [ ] **Entreprise** (ou *Business*) depuis la page d'accueil d'App Store Connect
- [ ] Accepter le contrat **Paid Applications**
- [ ] **Informations bancaires** — IBAN du compte qui recevra les versements
- [ ] **Informations fiscales** — au minimum le formulaire américain, plus celui de ton pays de résidence
- [ ] S'inscrire au **Small Business Program**

> Le Small Business Program, c'est 15 % de commission au lieu de 30 %. Tous
> les calculs de marge du projet partent de ce taux — sans lui, le revenu net
> tombe de 4,58 $ à 3,49 $ par mois d'abonnement.

**Passe à la suite quand :** le contrat *Paid Applications* affiche **Actif**.
S'il est « En attente », enchaîne sur B et C — elles n'en dépendent pas.

---

## Phase B — L'identifiant et la fiche de l'app

**Où :** developer.apple.com, puis App Store Connect

À sauter si ta fiche existe déjà.

- [ ] developer.apple.com → Certificates, Identifiers & Profiles → **Identifiers** → **+**
- [ ] Type **App IDs** → **App**, Bundle ID explicite `fr.nathansonnet.cadavreexquis`
- [ ] Cocher **In-App Purchase** dans les capacités
      *(sur les comptes récents elle est activée d'office et n'apparaît pas — ce n'est pas une erreur)*
- [ ] App Store Connect → **Apps** → **+** → nouvelle app iOS, en sélectionnant ce Bundle ID
- [ ] Catégorie **Jeux → Jeux de mots**, âge **4+**
- [ ] Politique de confidentialité : `https://cadavre-exquis-beta.vercel.app/privacy`

> **Déclaration App Privacy.** Coche **Historique d'achat** parmi les données
> liées à l'utilisateur — c'est nouveau depuis l'abonnement. Aucune donnée de
> tracking, aucun identifiant publicitaire : le 4+ tient sans discussion.

---

## Phase C — Les deux abonnements

**Où :** App Store Connect → ton app → Monétisation → Abonnements

- [ ] Créer un **groupe d'abonnement** nommé `L'Encrier`
- [ ] Mensuel — `fr.nathansonnet.cadavreexquis.encrier.mensuel`, **1 mois**, **4,99 €**
- [ ] Annuel — `fr.nathansonnet.cadavreexquis.encrier.annuel`, **1 an**, **39,99 €**
- [ ] Pour chacun : nom d'affichage et description, **en français et en anglais**
- [ ] Une **capture d'écran de revue** par produit — une photo du mur suffit

Les deux produits doivent vivre dans **le même groupe** : c'est ce qui permet
au joueur de passer du mensuel à l'annuel sans payer deux fois.

Suggestion de texte — nom : « L'Encrier ». Description : « Voix de l'IA et
lectures de dessins illimitées, deux illustrations grand format par jour. »

**Passe à la suite quand :** les deux affichent **Prêt à soumettre**. Ils ne
passeront réellement en vente qu'avec la première revue de l'app — c'est
normal.

---

## Phase D — RevenueCat

**Où :** revenuecat.com

C'est la pièce centrale : elle valide les achats auprès d'Apple et prévient
notre serveur. Crée un compte, puis un projet.

- [ ] Ajouter une app **App Store** avec le Bundle ID `fr.nathansonnet.cadavreexquis`
- [ ] Fournir une **clé API App Store Connect**
      *(App Store Connect → Utilisateurs et accès → Intégrations → App Store Connect API → clé avec le rôle App Manager → télécharger le `.p8` et le téléverser chez RevenueCat. Le fichier n'est téléchargeable qu'une fois.)*
- [ ] Fournir le **secret partagé** de l'app
      *(App Store Connect → ton app → Monétisation → achats intégrés → « App-Specific Shared Secret »)*
- [ ] Déclarer les **deux produits**, mêmes identifiants qu'en phase C
- [ ] Créer un **entitlement** identifié `encrier` et lui rattacher les deux produits
- [ ] Créer un **offering** identifié `default`, le marquer **Current**, avec deux packages (mensuel, annuel)
- [ ] Integrations → **Webhooks** → URL `https://cadavre-exquis-beta.vercel.app/api/revenuecat`
- [ ] Générer un secret (`openssl rand -hex 32`) et le coller dans le champ **Authorization header** du webhook — le garder pour la phase E
- [ ] Noter les trois clés : publique iOS (`appl_…`), publique Android (`goog_…`), secrète (`sk_…`)

> ⚠️ **Le nom de l'entitlement doit être exactement `encrier`**, en minuscules.
> `Encrier`, `l-encrier` ou `premium` ne marcheront pas : le code le cherche
> sous ce nom précis, dans `src/lib/achats.ts` et `api/_revenuecat.ts`.

> ⚠️ **Si l'offering n'est pas marqué *Current***, le mur affichera
> « Chargement des offres… » sans fin. C'est le symptôme le plus fréquent.

---

## Phase E — Les variables Vercel

**Où :** Vercel → Settings → Environment Variables, en **Production**

| Variable | Valeur |
|---|---|
| `VITE_REVENUECAT_IOS_KEY` | la clé `appl_…` |
| `VITE_REVENUECAT_ANDROID_KEY` | la clé `goog_…` |
| `REVENUECAT_SECRET_KEY` | la clé `sk_…` |
| `REVENUECAT_WEBHOOK_SECRET` | le secret du webhook |

- [ ] Ajouter les quatre variables
- [ ] **Redéployer** — Deployments → le dernier → Redeploy

Les variables commençant par `VITE_` sont intégrées au build : sans
redéploiement, elles n'existent pas pour l'app.

**Vérifie tout de suite :**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  https://cadavre-exquis-beta.vercel.app/api/revenuecat \
  -H 'Content-Type: application/json' -d '{"event":{"type":"TEST"}}'
```

- **401** → le secret est en place, le webhook rejette un appel non signé.
  C'est ce que tu veux voir.
- **503** → la variable manque, ou le redéploiement n'a pas eu lieu.

---

## Phase F — Le test réel

**Où :** Xcode + un iPhone réel

C'est ici, et seulement ici, qu'Xcode intervient. C'est aussi la seule partie
qui n'a pas pu être vérifiée à distance.

```bash
git pull
npm install
npm run build
npm run cap:add:ios          # première fois seulement
npx @capacitor/assets generate \
  --iconBackgroundColor '#000000' --splashBackgroundColor '#000000'
npm run cap:ios
```

- [ ] Xcode → **Signing & Capabilities** → **+ Capability** → **In-App Purchase**
- [ ] Créer un **testeur Sandbox** (App Store Connect → Utilisateurs et accès → Testeurs Sandbox), avec une adresse e-mail qui n'a jamais servi à un identifiant Apple
- [ ] Lancer sur un **iPhone réel** — le simulateur ne fait pas d'achats
- [ ] Épuiser l'essai : cinq parties avec une voix IA
- [ ] Lancer une sixième → **le mur doit s'ouvrir avec les deux prix affichés**
- [ ] Acheter le mensuel avec le compte sandbox
- [ ] Réglages → **L'ENCRIER** doit dire « Abonnement en cours »
- [ ] Rejouer une partie : plus aucun mur
- [ ] Désinstaller, réinstaller, **Restaurer mes achats** → l'abonnement revient

**Le point de contrôle qui compte :** dans RevenueCat → **Customer History**,
tu dois voir l'achat sandbox *et* le webhook livré en **200**.

> **Si le statut d'abonné ne remonte pas alors que l'achat a réussi :** le
> webhook n'a pas écrit. Ferme et rouvre l'app — la lecture directe chez
> RevenueCat rattrape le coup. Si ça marche alors, le problème est le webhook
> seul, presque toujours un `REVENUECAT_WEBHOOK_SECRET` qui ne correspond pas
> des deux côtés.

---

## Plus tard — Android

Play Console refuse de créer des produits tant qu'aucun bundle signé n'a été
téléversé, même en test interne : ça casse l'ordre logique et ça demande
Android Studio. Fais iOS de bout en bout d'abord — tu reviendras ici avec le
chemin balisé et les mêmes identifiants de produits.
