import { Capacitor } from '@capacitor/core'
import { jetonOuIdentite } from './acces'
import { supabase } from './supabase'

/**
 * L'abonnement, côté magasin.
 *
 * Rien de ce qui est décidé ici ne fait autorité : l'achat passe par Apple
 * ou Google, RevenueCat le valide, son rappel serveur écrit le statut dans
 * notre base, et l'application se contente ensuite de relire cet état. Ce
 * fichier ne fait qu'ouvrir la feuille de paiement et prévenir le serveur
 * qu'il y a du nouveau à vérifier.
 *
 * Sur le web, aucun achat intégré n'existe : tout dégrade proprement.
 */

export const ENTITLEMENT = 'encrier'

/**
 * Les flacons — des illustrations achetées à l'unité, sans engagement.
 *
 * Ces identifiants doivent être ceux déclarés dans App Store Connect et
 * Google Play, et repris à l'identique dans `FLACONS` (`api/_acces.ts`) :
 * c'est la table du serveur qui décide combien d'images un produit
 * crédite, jamais le client. Ici on n'a besoin que de savoir QUELS produits
 * sont des flacons, pour les distinguer des abonnements dans l'offering.
 *
 * Le nombre d'images n'est ici que pour l'AFFICHER. Ce qui est réellement
 * crédité vient du webhook et de la table du serveur ; une mesure tient les
 * deux copies d'accord, parce qu'un mur qui promet douze images quand le
 * serveur en donne quatre serait pire qu'un mur muet.
 *
 * L'ordre d'affichage est celui de l'offering du magasin, pas celui-ci.
 */
export const FLACONS: Record<string, number> = {
  'fr.nathansonnet.cadavreexquis.flacon.4': 4,
  'fr.nathansonnet.cadavreexquis.flacon.12': 12,
}

export interface Offre {
  id: string
  /** Prix déjà formaté dans la devise du joueur, par le magasin lui-même. */
  prix: string
  periode: 'mois' | 'an'
  /** Objet natif à repasser tel quel à l'achat. */
  paquet: unknown
}

/** Un flacon tel que le magasin l'annonce. */
export interface OffreFlacon {
  id: string
  /** Identifiant du produit chez le magasin. */
  produit: string
  prix: string
  /** Combien d'images, pour l'affichage seulement — le serveur retranche. */
  images: number
  paquet: unknown
}

export function achatsDisponibles(): boolean {
  return Capacitor.isNativePlatform()
}

/** Charge le module natif seulement là où il existe. */
async function plugin() {
  const mod = await import('@revenuecat/purchases-capacitor')
  return mod.Purchases
}

let prete = false

/**
 * Ouvre la session RevenueCat sous l'identité Supabase du joueur — c'est ce
 * qui permet au rappel serveur de savoir à qui attribuer l'abonnement.
 */
export async function preparerAchats(): Promise<boolean> {
  if (!achatsDisponibles()) return false
  if (prete) return true

  const apiKey = Capacitor.getPlatform() === 'ios'
    ? import.meta.env.VITE_REVENUECAT_IOS_KEY
    : import.meta.env.VITE_REVENUECAT_ANDROID_KEY
  if (!apiKey) return false

  await jetonOuIdentite()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  try {
    const Purchases = await plugin()
    await Purchases.configure({ apiKey, appUserID: user.id })
    prete = true
    return true
  } catch (err) {
    console.error('[achats] configuration impossible', err)
    return false
  }
}

/** Les paquets du magasin, bruts. Un seul aller-retour pour deux lectures. */
async function paquets(): Promise<any[]> {
  if (!(await preparerAchats())) return []
  try {
    const Purchases = await plugin()
    const { current } = await Purchases.getOfferings()
    return current?.availablePackages ?? []
  } catch (err) {
    console.error('[achats] offres illisibles', err)
    return []
  }
}

/** L'identifiant du produit chez le magasin, d'où qu'il se cache. */
function produitDe(p: any): string {
  return String(p?.product?.identifier ?? '')
}

/**
 * Les abonnements tels que le magasin les annonce — prix et devise compris.
 *
 * On ÉCARTE les flacons, qui vivent dans le même offering : sans ce filtre
 * un consommable apparaissait comme un abonnement mensuel, puisque rien
 * dans `packageType` ne le démentait. Le mur aurait vendu « 2,99 € par
 * mois » pour douze images achetées une fois.
 */
export async function lireOffres(): Promise<Offre[]> {
  return (await paquets())
    .filter(p => !(produitDe(p) in FLACONS))
    .map(p => ({
      id: p.identifier,
      prix: p.product?.priceString ?? '',
      periode: /ANNUAL|YEAR/i.test(p.packageType ?? p.identifier) ? 'an' : 'mois',
      paquet: p,
    }))
}

/** Les flacons, dans l'ordre où le magasin les range. */
export async function lireFlacons(): Promise<OffreFlacon[]> {
  return (await paquets())
    .filter(p => produitDe(p) in FLACONS)
    .map(p => ({
      id: p.identifier,
      produit: produitDe(p),
      prix: p.product?.priceString ?? '',
      images: FLACONS[produitDe(p)],
      paquet: p,
    }))
}

/**
 * Achète un flacon.
 *
 * Le crédit ne vient PAS de ce retour : c'est le rappel serveur de
 * RevenueCat qui écrit les images dans la base, comme pour l'abonnement.
 * On répond seulement « le magasin a pris l'argent », et l'appelant relit
 * ensuite son état — quitte à attendre une seconde que le webhook passe.
 *
 * Ne jamais créditer depuis ici : une réponse du magasin est une donnée que
 * le téléphone tient, et un téléphone se bricole.
 */
export async function acheterFlacon(f: OffreFlacon): Promise<ResultatAchat> {
  if (!(await preparerAchats())) return 'indisponible'
  try {
    const Purchases = await plugin()
    await Purchases.purchasePackage({ aPackage: f.paquet as any })
    return 'ok'
  } catch (err: any) {
    if (err?.userCancelled || err?.code === '1') return 'annule'
    console.error('[achats] flacon impossible', err)
    return 'echec'
  }
}

export type ResultatAchat = 'ok' | 'annule' | 'echec' | 'indisponible'

export async function souscrire(offre: Offre): Promise<ResultatAchat> {
  if (!(await preparerAchats())) return 'indisponible'
  try {
    const Purchases = await plugin()
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: offre.paquet as any })
    return customerInfo?.entitlements?.active?.[ENTITLEMENT] ? 'ok' : 'echec'
  } catch (err: any) {
    if (err?.userCancelled || err?.code === '1') return 'annule'
    console.error('[achats] souscription impossible', err)
    return 'echec'
  }
}

/**
 * Restaure un abonnement acheté avec le même compte de magasin — obligatoire
 * chez Apple (3.1.1), et c'est aussi ce qui rattrape une réinstallation :
 * l'identité locale a changé, mais le magasin, lui, se souvient.
 */
export async function restaurer(): Promise<boolean> {
  if (!(await preparerAchats())) return false
  try {
    const Purchases = await plugin()
    const { customerInfo } = await Purchases.restorePurchases()
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT]
  } catch (err) {
    console.error('[achats] restauration impossible', err)
    return false
  }
}
