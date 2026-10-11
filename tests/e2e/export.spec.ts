import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { buildTimeline } from '../../src/lib/timeline/build'
import { toFramePlan } from '../../src/lib/timeline/frames'
import type { TimelineSettings, TimelineTrack, TransitionType } from '../../src/lib/timeline/types'
import { clickTracks, colours, ensureFixtures, fixturesDir } from './fixtures'
import { nearestColour, probe, readAudio, readFrames, rms } from './media'

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

async function exportWith(page: Page, transition: TransitionType, name: string) {
  const { images, tracks } = ensureFixtures()
  await page.goto('/')
  await page.getByLabel('Bilder').setInputFiles(images)
  await page.getByLabel('Musik').setInputFiles(tracks)
  await expect(page.getByText('click90.mp3')).toBeVisible()
  await page.getByLabel('Übergänge auf den Beat legen').check()
  await page.getByLabel('Übergang', { exact: true }).selectOption(transition)
  const download = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: 'Diashow erstellen' }).click()
  const file = path.join(fixturesDir, 'out', name)
  await (await download).saveAs(file)
  expect((await download).suggestedFilename()).toBe('diashow.mp4')
  return file
}

for (const transition of ['none', 'crossfade'] as const)
  test(`beat-synced export with transition ${transition}`, async ({ page }) => {
    test.setTimeout(180_000)
    const file = await exportWith(page, transition, `beat-${transition}.mp4`)
    const expected = buildTimeline(colours.map((c) => c.name), idealTracks, { ...settings, transition })
    const plan = toFramePlan(expected)

    const info = probe(file)
    const video = info.streams.find((s) => s.codec_type === 'video')!
    const audio = info.streams.find((s) => s.codec_type === 'audio')!
    expect(info.format.format_name).toContain('mp4')
    expect(video.codec_name).toBe('h264')
    expect(audio.codec_name).toBe('aac')
    expect([video.width, video.height]).toEqual([1920, 1080])
    expect(video.r_frame_rate).toBe('30/1')
    expect(Math.abs(Number(video.duration) - expected.duration)).toBeLessThanOrEqual(1 / 30)
    expect(Math.abs(Number(audio.duration) - Number(video.duration))).toBeLessThanOrEqual(0.05)

    const frames = readFrames(file)
    expect(Math.abs(frames.count - plan.totalFrames)).toBeLessThanOrEqual(1)
    const colourAt = (frame: number) => nearestColour(colours, frames.pixel(frame)).name
    const margin = 1
    plan.segments.forEach((segment, i) => {
      const incoming = plan.transitions[i - 1]
      const outgoing = plan.transitions[i]
      const first = Math.max((incoming?.end ?? segment.start) + margin, plan.fadeInFrames)
      const last = Math.min((outgoing?.start ?? segment.end) - 1 - margin, plan.totalFrames - plan.fadeOutFrames - 1)
      expect(colourAt(first), `first frame ${first} of ${segment.imageId}`).toBe(segment.imageId)
      expect(colourAt(last), `last frame ${last} of ${segment.imageId}`).toBe(segment.imageId)
    })
    expect(frames.pixel(0).every((c) => c < 20)).toBe(true)
    expect(frames.pixel(frames.count - 1).every((c) => c < 40)).toBe(true)

    const samples = readAudio(file)
    expect(rms(samples)).toBeGreaterThan(0.005)
    expect(rms(samples, 48000 * 4, 48000 * 6)).toBeGreaterThan(rms(samples, 0, 48000 * 0.3) * 2)
  })
