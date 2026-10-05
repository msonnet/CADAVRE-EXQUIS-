import { mono } from '../lib/typo'
import { tr } from '../i18n'
import { NOM_MAX } from '../lib/table'

function toRomain(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI'][n - 1] ?? String(n)
}

/**
 * Les prénoms des mains, sous les sièges des préparatifs.
 *
 * Une ligne par siège humain, dans l'ordre où les mains jouent. Facultatifs :
 * une ligne laissée vide garde son numéro, que le champ montre en attente —
 * c'est le défaut, et il reste sobre.
 *
 * Les deux préparatifs à plusieurs mains — le cadavre écrit et le dessiné —
 * l'emploient : recopié deux fois, le champ dériverait, comme l'avaient fait
 * les trois boutons de partage.
 */
export default function NomsDesMains({ sieges, noms, onNom, encre, accent }: {
  /** Les indices des sièges humains, de gauche à droite. */
  sieges: number[]
  /** Un prénom par siège (et non par main). */
  noms: string[]
  onNom: (siege: number, valeur: string) => void
  encre: string
  accent: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
      <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.6, letterSpacing: '0.08em', marginBottom: 2 }}>
        {tr('LEURS NOMS · FACULTATIFS', 'THEIR NAMES · OPTIONAL')}
      </div>
      {sieges.map((siege, k) => (
        <div key={siege} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden style={{ ...mono, fontSize: 12, letterSpacing: '0.16em', color: encre, opacity: 0.6, minWidth: 64 }}>
            {tr('MAIN', 'HAND')} {toRomain(k + 1)}
          </span>
          <input
            type="text"
            value={noms[siege] ?? ''}
            onChange={e => onNom(siege, e.target.value.slice(0, NOM_MAX))}
            placeholder={`${tr('Joueur', 'Player')} ${k + 1}`}
            aria-label={tr(`Nom de plume de la main ${k + 1}`, `Pen name for hand ${k + 1}`)}
            maxLength={NOM_MAX}
            autoComplete="off"
            // Un prénom prend sa majuscule ; le correcteur, lui, ferait
            // de « Nadja » un « Nadia ».
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            style={{
              flex: 1, minWidth: 0, minHeight: 44,
              // 18 px : sous 16, iOS zoome à la mise au point.
              fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 18,
              color: encre, background: 'transparent',
              border: 'none', borderBottom: `0.5px solid ${encre}40`,
              padding: '6px 2px', borderRadius: 0,
              outline: 'none', caretColor: accent,
            }}
          />
        </div>
      ))}
    </div>
  )
}
