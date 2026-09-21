import { test, expect, type Page } from '@playwright/test'

/**
 * Le poème du jour — une chaîne, une main, un vers.
 *
 * Ce que ces tests gardent, et que rien d'autre ne peut garder : que la page
 * ne montre JAMAIS le poème en cours. C'est le pli du papier. Il est tenu à
 * trois endroits — la politique RLS, l'API qui ne renvoie qu'un mot, et
 * l'écran — et c'est le troisième qu'on mesure ici.
 *
 * Les versions précédentes de ce fichier décrivaient deux modèles
 * abandonnés : un poème de la galerie ressorti par `dayOfYear() % n`, puis
 * des poèmes parallèles sur une base commune. Ils sont déposés, pas
 * conservés — le dépôt ne doit jamais porter deux conceptions à la fois.
 */

const ETAT = {
  jour: '2026-09-21',
  amorce: 'une horloge',
  echo: 'poches',
  rang: 12,
  mains: 11,
  monVers: null as { rang: number; texte: string } | null,
  scelle: false,
}

const CHAINE_SCELLEE = { id: 'c1', jour: '2026-09-20', amorce: 'le sel' }

const VERS_SCELLES = [
  { rang: 1, texte: 'la porte bat dans le grenier', pseudo: 'Nadja', voix: false, voix_nom: null, main_id: 'autre-1' },
  { rang: 2, texte: 'personne ne compte les marches', pseudo: null, voix: true, voix_nom: 'archiviste', main_id: null },
  { rang: 3, texte: 'le cuivre chante quand on l’oublie', pseudo: 'Moi', voix: false, voix_nom: null, main_id: 'moi' },
  { rang: 4, texte: 'un drap glisse le long du couloir', pseudo: 'Desnos', voix: false, voix_nom: null, main_id: 'autre-2' },
  { rang: 5, texte: 'les racines remontent vers la lampe', pseudo: 'Man Ray', voix: false, voix_nom: null, main_id: 'autre-3' },
]

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/** Bouchonne le rendez-vous : l'état du jour, et le poème d'hier. */
async function poser(page: Page, opts: {
  etat?: Partial<typeof ETAT>
  hier?: boolean
  surEcriture?: (texte: string) => { status: number; corps: unknown }
} = {}) {
  const etat = { ...ETAT, ...opts.etat }
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))

  await page.route('**/api/jour**', async route => {
    if (route.request().method() === 'POST') {
      const texte = JSON.parse(route.request().postData() ?? '{}').texte ?? ''
      const r = opts.surEcriture?.(texte) ?? { status: 200, corps: { rang: etat.rang } }
      if (r.status === 200) { etat.monVers = { rang: etat.rang, texte }; etat.mains += 1 }
      return route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.corps) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(etat) })
  })

  await page.route('**/rest/v1/jour_chaines**', r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(opts.hier ? CHAINE_SCELLEE : null),
  }))
  await page.route('**/rest/v1/jour_vers**', r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(opts.hier ? VERS_SCELLES : []),
  }))
  // L'identité anonyme s'ouvre au premier vers : sans elle, « une main, un
  // vers » n'existe pas, et le POST n'est même pas émis.
  await page.route('**/auth/v1/**', r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      access_token: 'jeton-test', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
      user: { id: 'moi', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }),
  }))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
}

async function ouvrir(page: Page, url = '/poeme-du-jour') {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(900)
}

test('on ne voit qu’un mot — jamais le poème en cours', async ({ page }) => {
  await poser(page)
  await ouvrir(page)

  await expect(page.getByText(/— L’ÉCHO —|— THE ECHO —/)).toBeVisible()
  await expect(page.getByText('poches', { exact: true })).toBeVisible()

  // Le pli du papier : rien du poème en cours ne doit paraître à l'écran.
  const vu = await page.evaluate(() => document.body.innerText)
  for (const v of VERS_SCELLES) {
    expect(vu, `« ${v.texte} » ne doit pas être lisible`).not.toContain(v.texte)
  }
  // Et l'on sait seulement COMBIEN de mains sont passées, jamais lesquelles.
  expect(vu).toMatch(/11 MAINS SONT PASSÉES|11 HANDS HAVE PASSED/)
  expect(vu).not.toContain('Nadja')
})

test('la première main reçoit l’amorce du jour, et on le lui dit', async ({ page }) => {
  await poser(page, { etat: { mains: 0, rang: 1, echo: 'horloge' } })
  await ouvrir(page)

  await expect(page.getByText(/— L’AMORCE DU JOUR —|— TODAY’S SEED —/)).toBeVisible()
  await expect(page.getByText(/TU OUVRES LE POÈME|YOU OPEN THE POEM/)).toBeVisible()
})

test('un vers posé change l’écran, et le champ disparaît', async ({ page }) => {
  await poser(page)
  await ouvrir(page)

  await page.getByLabel(/Ton vers|Your line/).fill('le sel dort dans les poches')
  await page.getByRole('button', { name: /Donner ma main|Give my hand/ }).click()
  await page.waitForTimeout(1200)

  await expect(page.getByText(/— TON VERS —|— YOUR LINE —/)).toBeVisible()
  await expect(page.getByText('le sel dort dans les poches')).toBeVisible()
  // On n'écrit qu'une fois par jour : le champ n'est plus là.
  await expect(page.getByLabel(/Ton vers|Your line/)).toHaveCount(0)
  // Et la série ne compte que les jours où une main a réellement écrit.
  expect(await page.evaluate(() => localStorage.getItem('cadavre-serie'))).toBeTruthy()
})

test('un vers trop long est refusé sans déranger le serveur', async ({ page }) => {
  let appels = 0
  await poser(page, { surEcriture: () => { appels++; return { status: 200, corps: { rang: 12 } } } })
  await ouvrir(page)

  await page.getByLabel(/Ton vers|Your line/).fill(Array(14).fill('mot').join(' '))
  await page.getByRole('button', { name: /Donner ma main|Give my hand/ }).click()
  await page.waitForTimeout(600)

  await expect(page.getByText(/pas une strophe|not a stanza/)).toBeVisible()
  expect(appels, 'le client anticipe le refus, le serveur n’est pas sollicité').toBe(0)
})

test('« déjà écrit » n’est pas une erreur de saisie mais un état du jour', async ({ page }) => {
  await poser(page, { surEcriture: () => ({ status: 409, corps: { motif: 'deja-ecrit' } }) })
  await ouvrir(page)

  await page.getByLabel(/Ton vers|Your line/).fill('un vers de trop')
  await page.getByRole('button', { name: /Donner ma main|Give my hand/ }).click()
  await page.waitForTimeout(800)

  await expect(page.getByText(/déjà donné ta main|already given your hand/)).toBeVisible()
})

test('le poème achevé s’ouvre sur ton vers et ses voisins', async ({ page }) => {
  // Sur un poème long, ouvrir au premier vers reviendrait à cacher la seule
  // chose qu'on vient chercher.
  await page.addInitScript(() => {
    localStorage.setItem('sb-test-auth', JSON.stringify({ user: { id: 'moi' } }))
  })
  await poser(page, { hier: true })
  await ouvrir(page)

  await expect(page.getByText(/— LE POÈME ACHEVÉ —|— THE FINISHED POEM —/)).toBeVisible()
  // Cinq vers, quatre mains : la voix est comptée à part et annoncée telle.
  await expect(page.getByText(/5 VERS|5 LINES/)).toBeVisible()
  await expect(page.getByText(/4 MAINS|4 HANDS/)).toBeVisible()
  await expect(page.getByText('le cuivre chante quand on l’oublie')).toBeVisible()
})

test('l’accueil mène au poème du jour', async ({ page }) => {
  await poser(page)
  await ouvrir(page, '/')
  await page.getByRole('button', { name: /poème du jour|poem of the day/i }).click()
  await expect(page).toHaveURL(/\/poeme-du-jour$/, { timeout: 5000 })
})
