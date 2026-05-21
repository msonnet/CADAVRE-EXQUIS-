export async function partagerImage(dataUrl: string, nomFichier: string): Promise<void> {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], `${nomFichier}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: nomFichier })
      return
    }
  } catch { /* fall through to download */ }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${nomFichier}.png`
  a.click()
}

export async function partagerTexte(texte: string, titre: string): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({ title: titre, text: texte })
      return
    }
  } catch { /* fall through */ }
  try {
    await navigator.clipboard.writeText(texte)
  } catch { /* ignore */ }
}
