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
 * lit, pas un bouton qui réclame.
 *
 * ── Une zone d'appui qui reste sur sa ligne ───────────────────────────────
 *
 * Premier jet : la zone de 44 px venait de la règle globale posée sur
 * `a[href]`, un `::after` centré qui DÉBORDE d'un nom haut de dix-sept
 * pixels. Deux noms empilés à vingt-quatre pixels l'un de l'autre se
 * recouvraient donc, et celui du dessous, plus loin dans le document,
 * gagnait : un appui dans les lettres de « Le météorologue » ouvrait la
 * fiche du graveur — 28 % de la surface d'un nom, mesuré à 390.
 *
 * Le lien porte maintenant ses 44 px dans sa PROPRE boîte : un bloc en
 * ligne, une ligne de vingt pixels et douze de marge intérieure dessus et
 * dessous. La ligne qui le contient grandit d'autant, le `::after` global
 * vaut alors exactement la boîte, et deux noms ne se chevauchent plus. Le
 * nom ne se coupe pas : coupé, il avait deux boîtes, et la seconde mordait
 * sur la ligne suivante.
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
        display: 'inline-block', lineHeight: '20px', padding: '12px 0', whiteSpace: 'nowrap',
        color: couleur ?? 'inherit',
        textDecoration: 'underline', textDecorationStyle: 'dotted',
        textDecorationThickness: 1, textUnderlineOffset: 3,
      }}
    >
      {affiche}
    </Link>
  )
}
