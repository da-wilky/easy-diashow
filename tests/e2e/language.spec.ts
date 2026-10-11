import { expect, test } from '@playwright/test'
import { ensureFixtures } from './fixtures'

test('language can be switched to English and is remembered', async ({ page }) => {
  const { images, tracks } = ensureFixtures()
  await page.goto('/')
  await expect(page).toHaveTitle('Easy Diashow')
  await expect(page.getByRole('heading', { name: 'Easy Diashow', level: 2 })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.getByRole('heading', { name: 'Projekte' })).toBeVisible()

  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.reload()
  await page.getByRole('button', { name: 'New project' }).click()
  await expect(page.getByText('Drag your photos here or pick them.')).toBeVisible()
  await page.getByLabel('Add images').setInputFiles(images.slice(0, 2))
  await page.getByLabel('Add music', { exact: true }).setInputFiles(tracks.slice(0, 1))
  await expect(page.getByRole('listitem', { name: 'click120.mp3' })).toBeVisible()
  await expect(page.getByRole('listitem', { name: '2. img2.png' })).toBeVisible()
  await page.getByLabel('Put transitions on the beat').check()
  await expect(page.getByText('= 2.0 s per image')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Crossfade' })).toBeChecked()
  await expect(page.getByRole('button', { name: 'Create slideshow' })).toBeEnabled()

  await page.getByRole('link', { name: 'Privacy' }).click()
  await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible()
  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page.getByRole('heading', { name: 'Datenschutzhinweis' })).toBeVisible()
})

test.describe('with an English browser', () => {
  test.use({ locale: 'en-US' })

  test('English is the default', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
    await expect(page.getByText('No projects yet.')).toBeVisible()
  })
})
