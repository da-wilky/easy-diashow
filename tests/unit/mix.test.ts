import { describe, expect, it } from 'vitest'
import { mixChunk } from '../../src/lib/audio/mix'
import { buildTimeline } from '../../src/lib/timeline/build'
import type { TimelineSettings } from '../../src/lib/timeline/types'

const rate = 1000
const settings: TimelineSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  secondsPerImage: 3,
  transition: 'crossfade',
  transitionDuration: 0.5,
  fadeIn: 2,
  fadeOut: 3,
  beatSync: false,
  audioCrossfade: 1,
}
const constant = (seconds: number, value: number) => [new Float32Array(seconds * rate).fill(value)]
const ids = (n: number) => Array.from({ length: n }, (_, i) => `img${i}`)

describe('mixChunk', () => {
  const tracks = [
    { id: 'a', offset: 0, duration: 10, beats: [], beatsPerImage: 4, beatPhase: 0 },
    { id: 'b', offset: 0, duration: 8, beats: [], beatsPerImage: 4, beatPhase: 0 },
  ]
  const data = new Map([['a', constant(10, 1)], ['b', constant(8, 1)]])
  const timeline = buildTimeline(ids(8), tracks, settings)
  const total = Math.round(timeline.duration * rate)
  const mix = mixChunk(timeline, data, rate, 0, total)
  const at = (t: number) => mix[Math.round(t * rate)]!

  it('produces stereo of the video length', () => {
    expect(timeline.duration).toBeCloseTo(32.5, 9)
    expect(mix.length).toBe(total * 2)
    expect(mix.subarray(total)).toEqual(mix.subarray(0, total))
  })

  it('fades in and out with the video', () => {
    expect(at(0)).toBe(0)
    expect(at(1)).toBeCloseTo(0.5, 2)
    expect(at(2)).toBeCloseTo(1, 5)
    expect(at(timeline.duration - 1.5)).toBeCloseTo(0.5, 2)
    expect(mix[total - 1]).toBeLessThan(0.01)
  })

  it('crossfades tracks with equal power and loops the list', () => {
    expect(timeline.audio.map((c) => [c.trackId, c.start])).toEqual([['a', 0], ['b', 9], ['a', 16], ['b', 25], ['a', 32]])
    expect(at(5)).toBeCloseTo(1, 5)
    expect(at(9.5)).toBeCloseTo(Math.SQRT2, 2)
    expect(at(9.25)).toBeCloseTo(Math.sin(Math.PI / 8) + Math.cos(Math.PI / 8), 2)
    expect(at(12)).toBeCloseTo(1, 5)
    expect(at(16.5)).toBeCloseTo(Math.SQRT2, 2)
    expect(at(20)).toBeCloseTo(1, 5)
  })

  it('gives the same result in chunks', () => {
    const chunked = new Float32Array(total)
    for (let from = 0; from < total; from += 700) {
      const length = Math.min(700, total - from)
      chunked.set(mixChunk(timeline, data, rate, from, length).subarray(0, length), from)
    }
    expect(chunked).toEqual(mix.subarray(0, total))
  })

  it('keeps stereo channels apart and duplicates mono', () => {
    const stereo = new Map([['a', [...constant(10, 0.25), ...constant(10, 0.75)]], ['b', constant(8, 1)]])
    const out = mixChunk(timeline, stereo, rate, 5 * rate, 10)
    expect(out[0]).toBeCloseTo(0.25, 6)
    expect(out[10]).toBeCloseTo(0.75, 6)
  })
})
