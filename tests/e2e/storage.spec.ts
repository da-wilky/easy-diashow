import { expect, test, type Page } from '@playwright/test'
import { ensureFixtures } from './fixtures'

const stored = (page: Page) =>
  page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const entries: string[] = []
    for await (const name of root.keys()) entries.push(name)
    return { databases: (await indexedDB.databases()).map((d) => d.name), entries }
  })

const imageOrder = (page: Page) => page.locator('[data-image] img').evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).alt))

async function createProject(page: Page, name: string) {
  await page.getByLabel('Name des Projekts').fill(name)
  await page.getByRole('button', { name: 'Neues Projekt' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test('projects persist, can be reordered, renamed, deleted and wiped', async ({ page }) => {
  const { images, tracks } = ensureFixtures()
  page.on('dialog', (dialog) => dialog.accept(dialog.type() === 'prompt' ? 'Umbenannt' : undefined))
  await page.goto('/')
  await expect(page.getByText('Noch keine Projekte.')).toBeVisible()

  await createProject(page, 'Urlaub')
  await page.getByLabel('Bilder hinzufügen').setInputFiles([images[9]!, images[1]!, images[0]!])
  await page.getByLabel('Musik hinzufügen').setInputFiles(tracks.slice(0, 1))
  const track = page.getByRole('listitem', { name: 'click120.mp3' })
  await expect(track.getByTestId('bpm')).toHaveText('120')
  expect(await imageOrder(page)).toEqual(['img1.png', 'img2.png', 'img10.png'])

  await page.locator('[data-image]').first().hover()
  await page.mouse.down()
  await page.locator('[data-image]').last().hover({ position: { x: 20, y: 40 } })
  await page.locator('[data-image]').last().hover()
  await page.mouse.up()
  expect(await imageOrder(page)).toEqual(['img2.png', 'img10.png', 'img1.png'])

  await page.getByLabel('Übergänge auf den Beat legen').check()
  await track.getByRole('button', { name: 'BPM verdoppeln' }).click()
  await expect(track.getByTestId('bpm')).toHaveText('240')
  await expect(page.getByText('Alle Änderungen gespeichert')).toBeVisible()

  await page.reload()
  await expect(page.getByText('3 Bilder · 1 Musikstück')).toBeVisible()
  await page.getByRole('button', { name: /^Urlaub \d/ }).click()
  await expect(page.getByRole('listitem', { name: 'click120.mp3' }).getByTestId('bpm')).toHaveText('240')
  await expect(page.getByLabel('Übergänge auf den Beat legen')).toBeChecked()
  expect(await imageOrder(page)).toEqual(['img2.png', 'img10.png', 'img1.png'])
  await expect(page.locator('[data-image] img').first()).toHaveJSProperty('complete', true)
  expect(await page.locator('[data-image] img').first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(320)

  await page.getByRole('button', { name: 'Nach Name sortieren' }).click()
  expect(await imageOrder(page)).toEqual(['img1.png', 'img2.png', 'img10.png'])
  await page.getByRole('button', { name: 'img2.png entfernen' }).click()
  expect(await imageOrder(page)).toEqual(['img1.png', 'img10.png'])
  await expect(page.getByText('Alle Änderungen gespeichert')).toBeVisible()

  await page.getByRole('button', { name: 'Zur Projektliste' }).click()
  await expect(page.getByText('2 Bilder · 1 Musikstück')).toBeVisible()
  await createProject(page, 'Zweites')
  await page.getByRole('button', { name: 'Zur Projektliste' }).click()
  await page.getByRole('button', { name: 'Urlaub umbenennen' }).click()
  await expect(page.getByRole('button', { name: /^Umbenannt \d/ })).toBeVisible()
  expect((await stored(page)).entries).toHaveLength(2)

  await page.getByRole('button', { name: 'Zweites löschen' }).click()
  await expect(page.getByRole('button', { name: /^Zweites \d/ })).toHaveCount(0)
  expect((await stored(page)).entries).toHaveLength(1)

  await page.getByRole('button', { name: 'Alle Daten löschen' }).click()
  await expect(page.getByText('Noch keine Projekte.')).toBeVisible()
  expect(await stored(page)).toEqual({ databases: [], entries: [] })
})

test('beat settings show durations per track', async ({ page }) => {
  const { images, tracks } = ensureFixtures()
  await page.goto('/')
  await createProject(page, 'Beats')
  await expect(page.getByLabel('Übergänge auf den Beat legen')).toBeDisabled()
  await page.getByLabel('Bilder hinzufügen').setInputFiles(images)
  await page.getByLabel('Musik hinzufügen').setInputFiles(tracks)
  const fast = page.getByRole('listitem', { name: 'click120.mp3' })
  const slow = page.getByRole('listitem', { name: 'click90.mp3' })
  await expect(slow.getByTestId('bpm')).toHaveText('90')
  await expect(page.getByTestId('video-duration')).toHaveText('0:40 min')

  await page.getByLabel('Übergänge auf den Beat legen').check()
  await expect(fast.getByText('= 2,0 s pro Bild')).toBeVisible()
  await expect(slow.getByText('= 2,67 s pro Bild')).toBeVisible()
  await fast.getByLabel('Beats pro Bild').fill('8')
  await fast.getByLabel('Beats pro Bild').press('Enter')
  await expect(fast.getByText('= 4,0 s pro Bild')).toBeVisible()

  await page.getByLabel('Wunschzeit', { exact: true }).check()
  await expect(fast.getByLabel('4 (2,0 s)')).toBeChecked()
  await expect(slow.getByLabel('4 (2,67 s)')).toBeChecked()
  await slow.getByLabel('8 (5,33 s)').check()
  const input = page.getByLabel('Wunschzeit pro Bild', { exact: true })
  await input.fill('4.2')
  await input.press('Enter')
  await expect(fast.getByLabel('8 (4,0 s)')).toBeChecked()
  await expect(slow.getByLabel('8 (5,33 s)')).toBeChecked()

  await fast.getByLabel('BPM von Hand').fill('60')
  await fast.getByLabel('BPM von Hand').press('Enter')
  await expect(fast.getByTestId('bpm')).toHaveText('60')
  await expect(fast.getByLabel('4 (4,0 s)')).toBeChecked()
  await fast.getByRole('button', { name: 'click120.mp3 entfernen' }).click()
  await slow.getByRole('button', { name: 'click90.mp3 entfernen' }).click()
  await expect(page.getByLabel('Übergänge auf den Beat legen')).not.toBeChecked()
  await expect(page.getByLabel('Übergänge auf den Beat legen')).toBeDisabled()
})

test('privacy notice is reachable and nothing is requested from other hosts', async ({ page }) => {
  const foreign: string[] = []
  page.on('request', (r) => {
    if (!/^(http:\/\/localhost:4173|blob:|data:)/.test(r.url())) foreign.push(r.url())
  })
  const response = await page.goto('/')
  expect(response!.headers()['content-security-policy']).toContain("default-src 'none'")
  await page.getByRole('link', { name: 'Datenschutz' }).click()
  await expect(page.getByRole('heading', { name: 'Datenschutzhinweis' })).toBeVisible()
  await page.getByRole('link', { name: 'Zurück zur Anwendung' }).click()
  await expect(page.getByRole('heading', { name: 'Projekte' })).toBeVisible()
  expect(foreign).toEqual([])
  expect(await page.context().cookies()).toEqual([])
})
