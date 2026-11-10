// Rend le dessin témoin : trois bandes PNG (720 × 840) et l'assemblage (720 × 2520).
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const [,, html, dossier] = process.argv
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
const p = await b.newPage({ viewport: { width: 360, height: 1260 }, deviceScaleFactor: 2 })
await p.goto('file://' + html)
await p.screenshot({ path: `${dossier}/dessin-assemble.png`, clip: { x: 0, y: 0, width: 360, height: 1260 } })
for (let i = 0; i < 3; i++) await p.screenshot({ path: `${dossier}/dessin-bande-${i + 1}.png`, clip: { x: 0, y: i * 420, width: 360, height: 420 } })
await b.close()
