import { fetchAvecTimeout } from '../utils/fetchAvecTimeout'
import { api } from '../lib/apiBase'
import { langueActuelle } from '../i18n'
import { jetonOuIdentite, type Refus } from '../lib/acces'

/**
 * La lecture surréaliste d'un cadavre dessiné.
 *
 * Dessiner et assembler restent gratuits et illimités — seule cette lecture
 * appelle un serveur facturé. Le décompte se fait côté serveur, et il rend
 * ce qu'il a pris si la lecture échoue.
 */
export interface Lecture {
  texte: string
  refus?: Refus
}

export async function lireLeDessin(imageDataUrl: string): Promise<Lecture> {
  const base64 = imageDataUrl.split(',')[1]
  if (!base64) return { texte: '' }
  try {
    const jeton = await jetonOuIdentite()
    if (!jeton) return { texte: '' }
    const res = await fetchAvecTimeout(api('/api/interpreter-dessin'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jeton}`,
      },
      body: JSON.stringify({ imageBase64: base64, langue: langueActuelle() }),
    }, 20_000)

    if (res.status === 402) {
      const d = await res.json().catch(() => ({}))
      return {
        texte: '',
        refus: {
          acte: 'lecture_dessin',
          motif: d.error === 'plafond_jour' ? 'plafond_jour' : 'essai_epuise',
          plafond: d.plafond,
        },
      }
    }
    if (!res.ok) return { texte: '' }
    const data = await res.json()
    return { texte: data.texte ?? '' }
  } catch {
    return { texte: '' }
  }
}
