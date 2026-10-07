/**
 * Annuler / rétablir. Les caractères « ↩ » et « ↪ » ont une présentation
 * emoji sur iOS : ils sortaient en pictogrammes bleus dans la barre du studio.
 * Un trait dessiné ne dépend d'aucune police.
 */
export default function Fleche({ sens }: { sens: 'annuler' | 'retablir' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden focusable="false"
      style={{ transform: sens === 'retablir' ? 'scaleX(-1)' : undefined }}>
      <path d="M7.5 4.5 L3.5 8.5 L7.5 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.8 8.5 H12 a4.5 4.5 0 0 1 0 9 H8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
