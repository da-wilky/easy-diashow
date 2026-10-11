import { describe, expect, it } from 'vitest'
import { mixChunk } from '../../src/lib/audio/mix'
import { projectTimeline, trackDuration } from '../../src/lib/project/timeline'
import { DEFAULT_SETTINGS, type Project, type ProjectTrack } from '../../src/lib/project/types'

function track(id: string, overrides: Partial<ProjectTrack> = {}): ProjectTrack {
  return {
    id,
    name: id,
    duration: 60,
    // beats every 0.5 s from 0.25 s
    analysis: { bpm: 120, beats: Array.from({ length: 119 }, (_, i) => 0.25 + i * 0.5) },
    adjust: { factor: 1, manualBpm: null, offsetMs: 0 },
    beatsPerImage: 4,
    targetBeats: null,
    ...overrides,
  }
}

function project(tracks: ProjectTrack[], settings: Partial<Project['settings']> = {}): Project {
  return {
    id: 'p',
    name: 'p',
    modified: 0,
    images: Array.from({ length: 30 }, (_, i) => ({ id: `img${i}`, name: `img${i}` })),
    tracks,
    watermark: null,
    settings: { ...DEFAULT_SETTINGS, beatSync: true, ...settings },
  }
}

describe('silence trimming', () => {
  const silent = track('a', { silence: { start: 3.1, end: 10 } })

  it('plays only the part between the silences', () => {
    expect(trackDuration(silent)).toBeCloseTo(46.9, 9)
    const clip = projectTimeline(project([silent])).audio[0]!
    expect(clip.offset).toBe(3.1)
    expect(clip.end - clip.start).toBeCloseTo(46.9, 9)
  })

  it('keeps cuts on the original beats', () => {
    const timeline = projectTimeline(project([silent]))
    const firstPass = timeline.segments.slice(1).filter((s) => s.start < timeline.audio[0]!.end - 2)
    expect(firstPass.length).toBeGreaterThan(10)
    for (const segment of firstPass) {
      const inSource = segment.start + 3.1
      expect((inSource - 0.25) / 0.5).toBeCloseTo(Math.round((inSource - 0.25) / 0.5), 6)
    }
  })

  it('keeps the declared downbeat on the same beat of the song', () => {
    const cutsInSource = (t: ProjectTrack) => projectTimeline(project([t])).segments.slice(1).map((s) => s.start + (t.silence?.start ?? 0))
    const phase = (times: number[]) => Math.round((times[0]! - 0.25) / 0.5) % 4
    expect(phase(cutsInSource(silent))).toBe(phase(cutsInSource(track('a'))))
  })

  it('can be switched off per track', () => {
    const kept = { ...silent, trimSilence: false }
    expect(trackDuration(kept)).toBe(60)
    expect(projectTimeline(project([kept])).audio[0]!.offset).toBe(0)
  })

  it('starts the next song where the trimmed one ends', () => {
    const timeline = projectTimeline(project([silent, track('b')], { audioCrossfade: 2 }))
    expect(timeline.audio[1]!.start).toBeCloseTo(46.9 - 2, 9)
  })
})

describe('mixing trimmed and hard-cut tracks', () => {
  const rate = 100
  const ramp = (seconds: number) => [Float32Array.from({ length: seconds * rate }, (_, i) => i / rate)]

  it('reads the source from the trim offset and stops at the trimmed end', () => {
    const one = track('a', { duration: 20, analysis: null, silence: { start: 5, end: 5 } })
    const timeline = projectTimeline(project([one, track('b', { duration: 20, analysis: null })], { beatSync: false, audioCrossfade: 0 }))
    expect(timeline.audio.slice(0, 2).map((c) => [c.start, c.end, c.fadeOut])).toEqual([[0, 10, 0], [10, 30, 0]])
    const mix = mixChunk(timeline, new Map([['a', ramp(20)], ['b', ramp(20)]]), rate, 0, 15 * rate)
    expect(mix.every((v) => Number.isFinite(v))).toBe(true)
    expect(mix[4 * rate]).toBeCloseTo(9, 5)
    expect(mix[10 * rate - 1]).toBeCloseTo(14.99, 5)
    expect(mix[10 * rate]).toBeCloseTo(0, 5)
    expect(mix[12 * rate]).toBeCloseTo(2, 5)
  })
})
