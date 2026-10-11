import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { buildTimeline } from '../../src/lib/timeline/build'
import { toFramePlan, type FramePlan } from '../../src/lib/timeline/frames'
import type { TimelineSettings, TimelineTrack } from '../../src/lib/timeline/types'
import { clickTracks, colours, ensureFixtures, fixturesDir } from './fixtures'
import { nearestColour, probe, readAudio, readFrame, readFrames, rms } from './media'

const settings: TimelineSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  secondsPerImage: 3,
  transition: 'crossfade',
  transitionDuration: 0.5,
  fadeIn: 2,
  fadeOut: 3,
  beatSync: true,
}

const idealTracks: TimelineTrack[] = clickTracks.map(({ name, bpm, offset, seconds }) => ({
  id: name,
  duration: seconds,
  beats: Array.from({ length: Math.ceil(((seconds - offset) * bpm) / 60) }, (_, i) => offset + (i * 60) / bpm),
  beatsPerImage: 4,
}))

const names = colours.map((c) => c.name)

async function openProject(page: Page) {
  const fixtures = ensureFixtures()
  await page.goto('/')
  await page.getByRole('button', { name: 'Neues Projekt' }).click()
  await page.getByLabel('Bilder hinzufügen').setInputFiles(fixtures.images)
  await page.getByLabel('Musik hinzufügen').setInputFiles(fixtures.tracks)
  await expect(page.getByText('10. img10.png')).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'click90.mp3' })).toBeVisible()
  return fixtures
}

async function setNumber(page: Page, label: string, value: number) {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(String(value))
  await input.press('Enter')
}

async function download(page: Page, name: string) {
  const event = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: 'Diashow erstellen' }).click()
  const file = path.join(fixturesDir, 'out', name)
  expect((await event).suggestedFilename()).toBe('diashow.mp4')
  await (await event).saveAs(file)
  await expect(page.getByRole('link', { name: 'diashow.mp4 herunterladen' })).toBeVisible()
  return file
}

function expectContainer(file: string, width: number, height: number, duration: number) {
  const info = probe(file)
  const video = info.streams.find((s) => s.codec_type === 'video')!
  const audio = info.streams.find((s) => s.codec_type === 'audio')!
  expect(info.format.format_name).toContain('mp4')
  expect(video.codec_name).toBe('h264')
  expect(audio.codec_name).toBe('aac')
  expect([video.width, video.height]).toEqual([width, height])
  expect(video.r_frame_rate).toBe('30/1')
  expect(Math.abs(Number(video.duration) - duration)).toBeLessThanOrEqual(1 / 30)
  expect(Math.abs(Number(audio.duration) - Number(video.duration))).toBeLessThanOrEqual(0.05)
}

/** every image is on screen from one frame after its cut until one frame before the next */
function expectCuts(file: string, plan: FramePlan) {
  const frames = readFrames(file)
  expect(Math.abs(frames.count - plan.totalFrames)).toBeLessThanOrEqual(1)
  const colourAt = (frame: number) => nearestColour(colours, frames.pixel(frame)).name
  plan.segments.forEach((segment, i) => {
    const first = Math.max((plan.transitions[i - 1]?.end ?? segment.start) + 1, plan.fadeInFrames)
    const last = Math.min((plan.transitions[i]?.start ?? segment.end) - 2, plan.totalFrames - plan.fadeOutFrames - 1)
    expect(colourAt(first), `first frame ${first} of ${segment.imageId}`).toBe(segment.imageId)
    expect(colourAt(last), `last frame ${last} of ${segment.imageId}`).toBe(segment.imageId)
  })
  expect(frames.pixel(0).every((c) => c < 20)).toBe(true)
  expect(frames.pixel(frames.count - 1).every((c) => c < 40)).toBe(true)
  return frames
}

function expectAudio(file: string) {
  const samples = readAudio(file)
  expect(rms(samples)).toBeGreaterThan(0.005)
  expect(rms(samples, 48000 * 4, 48000 * 6)).toBeGreaterThan(rms(samples, 0, 48000 * 0.3) * 2)
}

for (const transition of ['none', 'crossfade'] as const)
  test(`beat-synced export with transition ${transition}`, async ({ page }) => {
    test.setTimeout(180_000)
    await openProject(page)

    const first = page.locator('[data-image]').first()
    const last = page.locator('[data-image]').last()
    await first.hover()
    await page.mouse.down()
    await last.hover({ position: { x: 20, y: 40 } })
    await last.hover()
    await page.mouse.up()
    await expect(page.getByText('10. img1.png')).toBeVisible()
    const order = [...names.slice(1), names[0]!]

    await page.getByLabel('Übergänge auf den Beat legen').check()
    await page.getByLabel('Übergang', { exact: true }).selectOption(transition)
    const file = await download(page, `beat-${transition}.mp4`)

    const expected = buildTimeline(order, idealTracks, { ...settings, transition })
    expectContainer(file, 1920, 1080, expected.duration)
    expectCuts(file, toFramePlan(expected))
    expectAudio(file)
  })

for (const transition of ['wipe', 'reveal'] as const)
  test(`fixed-time 720p export with watermark and transition ${transition}`, async ({ page }) => {
    test.setTimeout(180_000)
    const { watermark } = await openProject(page)
    await setNumber(page, 'Sekunden pro Bild', 1)
    await page.getByLabel('Übergang', { exact: true }).selectOption(transition)
    await page.getByLabel('Auflösung').selectOption('720')
    await page.getByLabel('Wasserzeichen wählen').setInputFiles(watermark)
    await expect(page.getByRole('button', { name: 'Wasserzeichen entfernen' })).toBeVisible()
    await expect(page.getByTestId('video-duration')).toHaveText('0:20 min')
    const file = await download(page, `fixed-${transition}.mp4`)

    const expected = buildTimeline(names, idealTracks, {
      ...settings,
      width: 1280,
      height: 720,
      transition,
      secondsPerImage: 1,
      beatSync: false,
    })
    const plan = toFramePlan(expected)
    expectContainer(file, 1280, 720, expected.duration)
    const frames = expectCuts(file, plan)
    expectAudio(file)

    const colourAt = (frame: number, x: number) => nearestColour(colours, frames.pixel(frame, x)).name
    for (const t of plan.transitions) {
      const middle = Math.round((t.start + t.end) / 2)
      expect(colourAt(middle, transition === 'wipe' ? 0.1 : 0.5)).toBe(t.to)
      expect(colourAt(middle, transition === 'wipe' ? 0.9 : 0.02)).toBe(t.from)
      expect(colourAt(middle, 0.98)).toBe(t.from)
    }

    // 400x200 watermark fits 128x64, 30 px from the bottom-right corner
    const pixel = readFrame(file, plan.transitions[0]!.end + 3, 1280, 720)
    const inside = pixel(1280 - 30 - 64, 720 - 30 - 32)
    expect(inside[1]).toBeGreaterThan(200)
    expect(inside[0]).toBeLessThan(60)
    expect(nearestColour(colours, pixel(1280 - 30 - 128 - 12, 720 - 30 - 32)).name).toBe('img2')
    expect(nearestColour(colours, pixel(1280 - 12, 720 - 12)).name).toBe('img2')
  })

test('export can be cancelled', async ({ page }) => {
  await openProject(page)
  await page.getByRole('button', { name: 'Diashow erstellen' }).click()
  await expect(page.getByText(/Bilder werden gerendert/)).toBeVisible()
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page.getByRole('button', { name: 'Diashow erstellen' })).toBeEnabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
