import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { buildTimeline } from '../../src/lib/timeline/build'
import { toFramePlan, type FramePlan } from '../../src/lib/timeline/frames'
import type { TimelineSettings, TimelineTrack } from '../../src/lib/timeline/types'
import { clickTracks, colours, ensureFixtures, fixturesDir } from './fixtures'
import { nearestColour, probe, psnr, readAudio, readFrame, readFrameBytes, readFrames, rms } from './media'
import { drag, imageItems, setNumber } from './ui'

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

const TRANSITION_LABELS = { none: 'Kein Übergang', crossfade: 'Überblenden', wipe: 'Wischen', reveal: 'Aufdecken' }

const idealTracks: TimelineTrack[] = clickTracks.map(({ name, bpm, offset, seconds }) => ({
  id: name,
  duration: seconds,
  beats: Array.from({ length: Math.ceil(((seconds - offset) * bpm) / 60) }, (_, i) => offset + (i * 60) / bpm),
  beatsPerImage: 4,
  beatPhase: 0,
}))

const names = colours.map((c) => c.name)

async function openProject(page: Page) {
  const fixtures = ensureFixtures()
  page.on('console', (m) => {
    if (/Content Security Policy/.test(m.text())) throw new Error(m.text())
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Neues Projekt' }).click()
  await page.getByLabel('Bilder hinzufügen').setInputFiles(fixtures.images)
  await page.getByLabel('Musik hinzufügen').setInputFiles(fixtures.tracks)
  await expect(page.getByRole('listitem', { name: '10. img10.png' })).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'click90.mp3' })).toBeVisible()
  return fixtures
}

async function download(page: Page, name: string) {
  const event = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: 'Diashow erstellen' }).click()
  const file = path.join(fixturesDir, 'out', name)
  expect((await event).suggestedFilename()).toBe('diashow.mp4')
  await (await event).saveAs(file)
  await expect(page.getByRole('link', { name: 'diashow.mp4 herunterladen' })).toBeVisible()
  await expect(page.locator('dialog video')).toHaveJSProperty('readyState', 4)
  await page.getByRole('button', { name: 'Schließen' }).click()
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

    await drag(page, imageItems(page).first(), imageItems(page).last())
    await expect(page.getByRole('listitem', { name: '10. img1.png' })).toBeVisible()
    const order = [...names.slice(1), names[0]!]

    await page.getByLabel('Übergänge auf den Beat legen').check()
    await page.getByRole('radio', { name: TRANSITION_LABELS[transition] }).check()
    // the crossfade run also moves "the one" of the first song by two beats
    const downbeat = transition === 'crossfade' ? 2 : 0
    const shift = page.getByRole('listitem', { name: 'click120.mp3' }).getByLabel('Die Eins verschieben um')
    await shift.fill(String(downbeat))
    await shift.press('Enter')
    const file = await download(page, `beat-.mp4`)

    const tracks = [{ ...idealTracks[0]!, beatPhase: downbeat }, idealTracks[1]!]
    const expected = buildTimeline(order, tracks, { ...settings, transition })
    expectContainer(file, 1920, 1080, expected.duration)
    expectCuts(file, toFramePlan(expected))
    expectAudio(file)
  })

for (const transition of ['wipe', 'reveal'] as const)
  test(`fixed-time 720p export with watermark and transition ${transition}`, async ({ page }) => {
    test.setTimeout(180_000)
    const { watermark } = await openProject(page)
    await setNumber(page, 'Sekunden pro Bild', 1)
    await page.getByRole('radio', { name: TRANSITION_LABELS[transition] }).check()
    await page.getByRole('radio', { name: /720p/ }).check()
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

test('a detailed image is sharp from the first frame after a transition', async ({ page }) => {
  test.setTimeout(180_000)
  const { photos } = ensureFixtures()
  await page.goto('/')
  await page.getByRole('button', { name: 'Neues Projekt' }).click()
  await page.getByLabel('Bilder hinzufügen').setInputFiles(photos)
  await expect(page.getByRole('listitem', { name: '2. detail2.jpg' })).toBeVisible()
  await page.getByRole('radio', { name: /720p/ }).check()
  const file = await download(page, 'detail.mp4')

  const plan = toFramePlan(buildTimeline(['a', 'b'], [], { ...settings, width: 1280, height: 720, beatSync: false }))
  const transition = plan.transitions[0]!
  const settled = readFrameBytes(file, plan.segments[1]!.end - plan.fadeOutFrames - 10)
  expect(psnr(readFrameBytes(file, transition.end), settled)).toBeGreaterThan(40)
  const before = readFrameBytes(file, transition.start - 2)
  const middle = Math.round((transition.start + transition.end) / 2)
  const progress = (middle - transition.start) / (transition.end - transition.start)
  const blend = before.map((v, i) => Math.round(v * (1 - progress) + settled[i]! * progress))
  expect(psnr(readFrameBytes(file, middle), blend)).toBeGreaterThan(35)
})

test('export can be cancelled', async ({ page }) => {
  await openProject(page)
  await page.getByRole('button', { name: 'Diashow erstellen' }).click()
  await expect(page.getByText(/Bilder werden gerendert/)).toBeVisible()
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Diashow erstellen' })).toBeEnabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('preview shows the right image and plays with music', async ({ page }) => {
  await openProject(page)
  await setNumber(page, 'Sekunden pro Bild', 1)
  const expected = buildTimeline(names, idealTracks, { ...settings, secondsPerImage: 1, beatSync: false })
  const colourAt = async (x: number) => {
    const rgb = await page.locator('[data-section="preview"] canvas').evaluate((canvas: HTMLCanvasElement, at) => {
      const { data } = canvas.getContext('2d')!.getImageData(Math.floor(canvas.width * at), canvas.height / 2, 1, 1)
      return [data[0]!, data[1]!, data[2]!]
    }, x)
    return nearestColour(colours, rgb).name
  }
  const slider = page.getByLabel('Position in der Vorschau')

  await expect.poll(() => colourAt(0.5)).toBe('img1')
  for (const index of [7, 2]) {
    const segment = expected.segments[index]!
    await slider.fill(String((segment.start + segment.end) / 2))
    await expect.poll(() => colourAt(0.5)).toBe(segment.imageId)
  }

  await slider.fill('0')
  await page.getByLabel('Lautstärke der Vorschau').fill('0.3')
  await expect(page.getByLabel('Lautstärke der Vorschau')).toHaveValue('0.3')
  await page.getByRole('button', { name: 'Vorschau abspielen' }).click()
  await expect(page.getByRole('button', { name: 'Vorschau anhalten' })).toBeVisible()
  await expect(page.getByTestId('preview-time')).toHaveText(/^0:0[3-9]/, { timeout: 10_000 })
  await page.getByRole('button', { name: 'Vorschau anhalten' }).click()
  const position = Number(await slider.inputValue())
  const playing = expected.segments.find((s) => position >= s.start + 0.3 && position < s.end - 0.3)
  if (playing) expect(await colourAt(0.5)).toBe(playing.imageId)
  await expect(page.getByRole('alert')).toHaveCount(0)
})
