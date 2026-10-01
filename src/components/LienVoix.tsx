import { Link } from 'react-router-dom'
import { idDeVoix } from '../data/voiceIds'
import { nomAffiche } from '../lib/attribution'
import { tr } from '../i18n'

/**
 * Le nom d'une voix dans les coutures, qui mène à sa fiche du registre.
 *
 * Un lien et non un bouton : c'est une navigation, elle s'ouvre au clavier
 * et se partage. Un nom que le registre ne reconnaît pas (une voix retirée,
 * un nom d'essai) reste du texte — un lien vers une fiche vide promettrait
 * ce qu'il ne tient pas.
 *
 * Le soulignement est pointillé et pâle : le nom reste une signature qu'on
 * lit, pas un bouton qui réclame. La zone d'appui de 44 px vient de la règle
 * globale posée sur `a[href]`.
 */
export default function LienVoix({ nom, couleur }: { nom: string; couleur?: string }) {
  const id = idDeVoix(nom)
  const affiche = nomAffiche(nom)
  if (!id) return <>{affiche}</>
  return (
    <Link
      to={`/voix/${encodeURIComponent(id)}`}
      aria-label={tr(`${affiche} — sa fiche au registre des voix`, `${affiche} — entry in the register of voices`)}
      style={{
        color: couleur ?? 'inherit',
        textDecoration: 'underline', textDecorationStyle: 'dotted',
        textDecorationThickness: 1, textUnderlineOffset: 3,
      }}
    >
      {affiche}
    </Link>
  )
}
