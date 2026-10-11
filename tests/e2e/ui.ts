import { expect, type Locator, type Page } from '@playwright/test'

export const imageItems = (page: Page) => page.locator('[data-section="images"] [data-sort]')
export const trackItems = (page: Page) => page.locator('[data-section="music"] [data-sort]')

export const imageOrder = (page: Page) =>
  imageItems(page)
    .locator('img')
    .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).alt))

export async function createProject(page: Page, name: string) {
  await page.getByLabel('Name des Projekts').fill(name)
  await page.getByRole('button', { name: 'Neues Projekt' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

/** drags `item` onto `target` with the mouse; `grab` is where on the item the press happens */
export async function drag(page: Page, item: Locator, target: Locator, grab = { x: 60, y: 45 }) {
  await item.hover({ position: grab })
  await page.mouse.down()
  await target.hover({ position: { x: 20, y: 20 } })
  await target.hover()
  await page.mouse.up()
}

export async function setNumber(page: Page, label: string, value: number) {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(String(value))
  await input.press('Enter')
}
