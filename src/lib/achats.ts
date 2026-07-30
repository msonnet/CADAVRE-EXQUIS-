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

export interface Offre {
  id: string
  /** Prix déjà formaté dans la devise du joueur, par le magasin lui-même. */
  prix: string
  periode: 'mois' | 'an'
  /** Objet natif à repasser tel quel à l'achat. */
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

/** Les offres telles que le magasin les annonce — prix et devise compris. */
export async function lireOffres(): Promise<Offre[]> {
  if (!(await preparerAchats())) return []
  try {
    const Purchases = await plugin()
    const { current } = await Purchases.getOfferings()
    if (!current) return []
    return current.availablePackages.map((p: any) => ({
      id: p.identifier,
      prix: p.product?.priceString ?? '',
      periode: /ANNUAL|YEAR/i.test(p.packageType ?? p.identifier) ? 'an' : 'mois',
      paquet: p,
    }))
  } catch (err) {
    console.error('[achats] offres illisibles', err)
    return []
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
