import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

export const fixturesDir = path.resolve(import.meta.dirname, '../fixtures')

export const colours = [
  { name: 'img1', rgb: [255, 0, 0] },
  { name: 'img2', rgb: [0, 255, 0] },
  { name: 'img3', rgb: [0, 0, 255] },
  { name: 'img4', rgb: [255, 255, 0] },
  { name: 'img5', rgb: [255, 0, 255] },
  { name: 'img6', rgb: [0, 255, 255] },
  { name: 'img7', rgb: [255, 255, 255] },
  { name: 'img8', rgb: [255, 128, 0] },
  { name: 'img9', rgb: [128, 0, 255] },
  { name: 'img10', rgb: [128, 128, 128] },
] as const

export const clickTracks = [
  { name: 'click120', bpm: 120, offset: 0.1, seconds: 20 },
  { name: 'click90', bpm: 90, offset: 0.25, seconds: 20 },
] as const

function ffmpeg(args: string[]) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args])
}

const hex = (rgb: readonly number[]) => rgb.map((c) => c.toString(16).padStart(2, '0')).join('')

export function ensureFixtures() {
  mkdirSync(fixturesDir, { recursive: true })
  const images = colours.map(({ name, rgb }) => {
    const file = path.join(fixturesDir, `${name}.png`)
    if (!existsSync(file)) ffmpeg(['-f', 'lavfi', '-i', `color=c=0x${hex(rgb)}:s=1920x1080`, '-frames:v', '1', file])
    return file
  })
  const tracks = clickTracks.map(({ name, bpm, offset, seconds }) => {
    const file = path.join(fixturesDir, `${name}.mp3`)
    const period = 60 / bpm
    const click = `sin(2*PI*1000*t)*exp(-mod(t-${offset}+${period},${period})*120)*gte(t,${offset})`
    if (!existsSync(file))
      ffmpeg(['-f', 'lavfi', '-i', `aevalsrc='${click}':s=44100:d=${seconds}`, '-ac', '2', '-b:a', '128k', file])
    return file
  })
  return { images, tracks }
}
