import { describe, expect, it } from 'vitest'
import { buildTimeline } from '../../src/lib/timeline/build'
import { toFramePlan } from '../../src/lib/timeline/frames'
import { FPS, type Timeline, type TimelineSettings, type TimelineTrack } from '../../src/lib/timeline/types'

const settings: TimelineSettings = {
  width: 1920,
  height: 1080,
  fps: FPS,
  secondsPerImage: 3,
  transition: 'crossfade',
  transitionDuration: 0.5,
  fadeIn: 2,
  fadeOut: 3,
  beatSync: false,
  audioCrossfade: 1,
}
const beat: TimelineSettings = { ...settings, beatSync: true }

const ids = (n: number) => Array.from({ length: n }, (_, i) => `img${i}`)

function track(id: string, bpm: number, offset: number, duration: number, beatsPerImage = 4): TimelineTrack {
  const beats: number[] = []
  for (let i = 0; offset + (i * 60) / bpm < duration; i++) beats.push(offset + (i * 60) / bpm)
  return { id, offset: 0, duration, beats, beatsPerImage, beatPhase: 0 }
}

const cuts = (t: Timeline) => t.segments.slice(1).map((s) => s.start)

/** the cut must be a beat of the clip whose grid is active at that time */
function expectOnBeat(timeline: Timeline, tracks: TimelineTrack[], time: number) {
  const clip = timeline.audio.find((c) => time >= c.start + c.fadeIn / 2 - 1e-9 && time < c.end - c.fadeOut / 2)
  expect(clip, `no active clip at ${time}`).toBeDefined()
  const beats = tracks.find((t) => t.id === clip!.trackId)!.beats
  const distance = Math.min(...beats.map((b) => Math.abs(b - (time - clip!.start))))
  expect(distance, `cut at ${time} is ${distance}s off the beat of ${clip!.trackId}`).toBeLessThan(1e-6)
}

function expectWellFormed(t: Timeline) {
  expect(t.segments[0]?.start ?? 0).toBe(0)
  expect(t.segments.at(-1)?.end ?? 0).toBe(t.duration)
  t.segments.forEach((s, i) => {
    expect(s.end).toBeGreaterThan(s.start)
    if (i) expect(s.start).toBe(t.segments[i - 1]!.end)
  })
  t.transitions.forEach((tr, i) => {
    expect(tr.end).toBeGreaterThan(tr.start)
    expect(tr.start).toBeGreaterThanOrEqual(i ? t.transitions[i - 1]!.end - 1e-9 : 0)
    expect(tr.end).toBeLessThanOrEqual(t.duration)
    expect((tr.start + tr.end) / 2).toBeCloseTo(t.segments[i + 1]!.start, 9)
    expect(tr.from).toBe(t.segments[i]!.imageId)
    expect(tr.to).toBe(t.segments[i + 1]!.imageId)
  })
}

describe('fixed time', () => {
  it('matches the old app: fade-in, hold, transition, hold, fade-out', () => {
    const t = buildTimeline(ids(3), [], settings)
    expect(t.duration).toBeCloseTo(2 + 3 * 3 + 2 * 0.5 + 3, 9)
    expect(cuts(t)).toEqual([5.25, 8.75])
    expect(t.transitions.map((x) => [x.start, x.end])).toEqual([[5, 5.5], [8.5, 9]])
    expect(t.audio).toEqual([])
    expectWellFormed(t)
  })

  it('cuts hard without transition', () => {
    const t = buildTimeline(ids(3), [], { ...settings, transition: 'none' })
    expect(cuts(t)).toEqual([5, 8])
    expect(t.transitions).toEqual([])
    expect(t.duration).toBeCloseTo(14, 9)
  })

  it('handles zero and one image', () => {
    expect(buildTimeline([], [], settings).duration).toBe(0)
    const one = buildTimeline(ids(1), [], settings)
    expect(one.segments).toEqual([{ imageId: 'img0', start: 0, end: 8 }])
  })

  it('is used when beat sync is on but there is no music', () => {
    expect(buildTimeline(ids(3), [], beat)).toEqual(buildTimeline(ids(3), [], settings))
  })

  it('keeps fixed timing with music when beat sync is off', () => {
    const t = buildTimeline(ids(3), [track('a', 120, 0.1, 60)], settings)
    expect(cuts(t)).toEqual([5.25, 8.75])
    expect(t.audio).toEqual([{ trackId: 'a', start: 0, end: 60, offset: 0, fadeIn: 0, fadeOut: 1 }])
  })
})

describe('beat sync', () => {
  it('puts every cut on a beat, N beats apart', () => {
    const tracks = [track('a', 120, 0.1, 600, 4)]
    const t = buildTimeline(ids(20), tracks, beat)
    const c = cuts(t)
    c.forEach((x) => expectOnBeat(t, tracks, x))
    c.slice(1).forEach((x, i) => expect(x - c[i]!).toBeCloseTo(2, 9))
    expectWellFormed(t)
  })

  it('shows the first image fully for at least the chosen duration', () => {
    const t = buildTimeline(ids(5), [track('a', 120, 0.1, 600, 4)], beat)
    expect(t.transitions[0]!.start - t.fadeIn).toBeGreaterThanOrEqual(2 - 1e-9)
    expect(t.transitions[0]!.start - t.fadeIn).toBeLessThan(2 + 2)
  })

  it('starts the fade-out on a beat', () => {
    const tracks = [track('a', 120, 0.1, 600, 4)]
    const t = buildTimeline(ids(5), tracks, beat)
    expect(t.duration - t.fadeOut - cuts(t).at(-1)!).toBeCloseTo(2, 1)
  })

  it('cuts hard on the beat without transition', () => {
    const tracks = [track('a', 90, 0.25, 600, 2)]
    const t = buildTimeline(ids(10), tracks, { ...beat, transition: 'none' })
    expect(t.transitions).toEqual([])
    cuts(t).forEach((x) => expectOnBeat(t, tracks, x))
  })

  it('follows real beat positions when the tempo drifts', () => {
    const beats: number[] = []
    for (let time = 0.3, i = 0; time < 300; i++, time += 0.5 + 0.03 * Math.sin(i / 7)) beats.push(time)
    const tracks = [{ id: 'a', offset: 0, duration: 300, beats, beatsPerImage: 4, beatPhase: 0 }]
    const t = buildTimeline(ids(60), tracks, beat)
    cuts(t).forEach((x) => expect(beats).toContain(x))
  })

  it('switches grid at the crossfade midpoint with per-track beats per image', () => {
    const tracks = [track('a', 120, 0.1, 20, 4), track('b', 90, 0.25, 30, 2)]
    const t = buildTimeline(ids(12), tracks, beat)
    expect(t.audio.slice(0, 2)).toEqual([
      { trackId: 'a', start: 0, end: 20, offset: 0, fadeIn: 0, fadeOut: 1 },
      { trackId: 'b', start: 19, end: 49, offset: 0, fadeIn: 1, fadeOut: 1 },
    ])
    const c = cuts(t)
    c.forEach((x) => expectOnBeat(t, tracks, x))
    const firstB = c.findIndex((x) => x >= 19.5)
    expect(firstB).toBeGreaterThan(0)
    expect(c[firstB + 1]! - c[firstB]!).toBeCloseTo((2 * 60) / 90, 9)
    expect(c[firstB - 1]! - c[firstB - 2]!).toBeCloseTo(2, 9)
    expectWellFormed(t)
  })

  it('loops the track list when the video is longer than the music', () => {
    const tracks = [track('a', 120, 0.1, 20, 4), track('b', 128, 0.37, 15, 4)]
    const t = buildTimeline(ids(40), tracks, beat)
    expect(t.duration).toBeGreaterThan(70)
    expect(t.audio.map((c) => c.trackId).slice(0, 5)).toEqual(['a', 'b', 'a', 'b', 'a'])
    expect(t.audio.at(-1)!.start).toBeLessThan(t.duration)
    expect(t.audio.at(-1)!.end).toBeGreaterThanOrEqual(t.duration)
    t.audio.slice(1).forEach((c, i) => expect(c.start).toBeCloseTo(t.audio[i]!.end - c.fadeIn, 9))
    cuts(t).forEach((x) => expectOnBeat(t, tracks, x))
    expectWellFormed(t)
  })

  it('loops a single track into itself', () => {
    const tracks = [track('a', 174, 0.05, 12, 8)]
    const t = buildTimeline(ids(20), tracks, beat)
    expect(t.audio.length).toBeGreaterThan(3)
    cuts(t).forEach((x) => expectOnBeat(t, tracks, x))
  })

  it('plans a single clip when the video is shorter than the music', () => {
    const t = buildTimeline(ids(3), [track('a', 120, 0.1, 600)], beat)
    expect(t.audio).toHaveLength(1)
    expect(t.audio[0]!.end).toBeGreaterThan(t.duration)
  })

  it('shortens transitions that do not fit between two beats', () => {
    const tracks = [track('a', 174, 0.05, 600, 1)]
    const t = buildTimeline(ids(30), tracks, { ...beat, transitionDuration: 3 })
    expectWellFormed(t)
    cuts(t).forEach((x) => expectOnBeat(t, tracks, x))
  })

  it('cuts only on beats in phase with the declared downbeat, also after a track change', () => {
    const tracks = [{ ...track('a', 120, 0.1, 20, 4), beatPhase: 2 }, { ...track('b', 90, 0.25, 30, 8), beatPhase: 5 }]
    const t = buildTimeline(ids(14), tracks, beat)
    const cutsPerTrack = { a: 0, b: 0 }
    for (const cut of cuts(t)) {
      const clip = t.audio.find((c) => cut >= c.start + c.fadeIn / 2 - 1e-9 && cut < c.end - c.fadeOut / 2)!
      const source = tracks.find((x) => x.id === clip.trackId)!
      const index = source.beats.findIndex((b) => Math.abs(b - (cut - clip.start)) < 1e-6)
      expect(index).toBeGreaterThanOrEqual(0)
      expect((index - source.beatPhase) % source.beatsPerImage).toBe(0)
      cutsPerTrack[clip.trackId as 'a' | 'b']++
    }
    expect(cutsPerTrack.a).toBeGreaterThan(1)
    expect(cutsPerTrack.b).toBeGreaterThan(1)
    expectWellFormed(t)
  })

  it('falls back to fixed steps for a track without beats', () => {
    const tracks = [{ id: 'a', offset: 0, duration: 600, beats: [], beatsPerImage: 4, beatPhase: 0 }]
    const t = buildTimeline(ids(3), tracks, beat)
    expect(t.segments).toEqual(buildTimeline(ids(3), [], settings).segments)
  })
})

describe('frame plan', () => {
  it('does not drift over 30 minutes', () => {
    const tracks = [track('a', 128, 0.37, 200, 2), track('b', 174, 0.05, 180, 4)]
    const t = buildTimeline(ids(1800), tracks, beat)
    expect(t.duration).toBeGreaterThan(30 * 60)
    const plan = toFramePlan(t)
    expect(plan.totalFrames / t.fps).toBeCloseTo(t.duration, 9)
    plan.segments.forEach((s, i) => {
      expect(Math.abs(s.start / t.fps - t.segments[i]!.start)).toBeLessThanOrEqual(0.5 / t.fps + 1e-9)
      expect(s.end).toBeGreaterThan(s.start)
      if (i) expect(s.start).toBe(plan.segments[i - 1]!.end)
    })
    expect(plan.segments.at(-1)!.end).toBe(plan.totalFrames)
  })
})
