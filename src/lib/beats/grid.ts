export interface BeatAdjust {
  /** power of two applied to the detected tempo: 0.5 keeps every second beat, 2 inserts midpoints */
  factor: number
  manualBpm: number | null
  offsetMs: number
  /** how many beats after the first detected beat "the one" lies; absent in projects saved before it existed */
  downbeat?: number
}

export const BEAT_OPTIONS = [1, 2, 4, 8, 16] as const

export function effectiveBpm(detectedBpm: number, adjust: BeatAdjust) {
  return adjust.manualBpm ?? detectedBpm * adjust.factor
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[sorted.length >> 1]!
}

function constantGrid(anchor: number, period: number, duration: number) {
  const beats: number[] = []
  const first = anchor - Math.floor(anchor / period) * period
  for (let i = 0; first + i * period < duration; i++) beats.push(first + i * period)
  return beats
}

function scale(beats: number[], factor: number) {
  let result = beats
  for (let f = factor; f >= 2; f /= 2) result = result.flatMap((b, i) => (i ? [(result[i - 1]! + b) / 2, b] : [b]))
  for (let f = factor; f <= 0.5; f *= 2) result = result.filter((_, i) => i % 2 === 0)
  return result
}

/** Beat times of a track after the user's corrections, covering the whole track. */
export function effectiveBeats(detected: number[], duration: number, adjust: BeatAdjust): number[] {
  const offset = adjust.offsetMs / 1000
  if (adjust.manualBpm) return constantGrid((detected[0] ?? 0) + offset, 60 / adjust.manualBpm, duration)
  const beats = scale(detected, adjust.factor)
  if (beats.length < 2) return []
  const interval = median(beats.slice(1).map((b, i) => b - beats[i]!))
  const before: number[] = []
  for (let t = beats[0]! - interval; t + offset >= 0; t -= interval) before.unshift(t)
  const after: number[] = []
  for (let t = beats.at(-1)! + interval; t + offset < duration; t += interval) after.push(t)
  return [...before, ...beats, ...after].map((b) => b + offset).filter((b) => b >= 0 && b < duration)
}

/** index in `beats` (from `effectiveBeats`) of the beat the user declared as "the one" */
export function downbeatIndex(beats: number[], detected: number[], adjust: BeatAdjust) {
  const first = (detected[0] ?? 0) + adjust.offsetMs / 1000
  return Math.max(beats.findIndex((b) => b >= first - 1e-6), 0) + (adjust.downbeat ?? 0)
}

export function beatOptions(bpm: number) {
  return BEAT_OPTIONS.map((beats) => ({ beats, seconds: (beats * 60) / bpm }))
}

export function nearestBeatOption(bpm: number, seconds: number) {
  return beatOptions(bpm).reduce((best, o) => (Math.abs(o.seconds - seconds) < Math.abs(best.seconds - seconds) ? o : best))
    .beats
}
