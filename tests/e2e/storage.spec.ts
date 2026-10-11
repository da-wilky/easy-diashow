import { expect, test, type Page } from '@playwright/test'
import { ensureFixtures } from './fixtures'

const stored = (page: Page) =>
  page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const entries: string[] = []
    for await (const name of root.keys()) entries.push(name)
    return { databases: (await indexedDB.databases()).map((d) => d.name), entries }
  })

async function createProject(page: Page, name: string) {
  await page.getByLabel('Name des Projekts').fill(name)
  await page.getByRole('button', { name: 'Neues Projekt' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test('projects persist, can be renamed, deleted and wiped', async ({ page }) => {
  const { images, tracks } = ensureFixtures()
  page.on('dialog', (dialog) => dialog.accept(dialog.type() === 'prompt' ? 'Umbenannt' : undefined))
  await page.goto('/')
  await expect(page.getByText('Noch keine Projekte.')).toBeVisible()

  await createProject(page, 'Urlaub')
  await page.getByLabel('Bilder').setInputFiles(images.slice(0, 3))
  await page.getByLabel('Musik').setInputFiles(tracks.slice(0, 1))
  await expect(page.getByText('click120.mp3')).toBeVisible()
  await page.getByLabel('Übergänge auf den Beat legen').check()
  await expect(page.getByText('Alle Änderungen gespeichert')).toBeVisible()

  await page.reload()
  await expect(page.getByText('3 Bilder · 1 Musikstücke')).toBeVisible()
  await page.getByRole('button', { name: /^Urlaub \d/ }).click()
  await expect(page.getByText('img3.png')).toBeVisible()
  await expect(page.getByText('click120.mp3: 120.0 BPM')).toBeVisible()
  await expect(page.getByLabel('Übergänge auf den Beat legen')).toBeChecked()

  await page.getByRole('button', { name: 'Zur Projektliste' }).click()
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
