import { describe, expect, it } from 'vitest'
import { beatOptions, downbeatIndex, effectiveBeats, effectiveBpm, nearestBeatOption } from '../../src/lib/beats/grid'

const none = { factor: 1, manualBpm: null, offsetMs: 0 }
const detected = [2, 2.5, 3, 3.5, 4]

describe('effectiveBeats', () => {
  it('extends detected beats over the whole track', () => {
    const beats = effectiveBeats(detected, 6, none)
    expect(beats).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5])
  })

  it('doubles by inserting midpoints and halves by dropping every second beat', () => {
    expect(effectiveBeats(detected, 4.2, { ...none, factor: 2 }).slice(-5)).toEqual([3, 3.25, 3.5, 3.75, 4])
    expect(effectiveBeats(detected, 6, { ...none, factor: 0.5 })).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('shifts by the offset', () => {
    expect(effectiveBeats(detected, 3, { ...none, offsetMs: 100 })).toEqual([0.1, 0.6, 1.1, 1.6, 2.1, 2.6])
    expect(effectiveBeats(detected, 3, { ...none, offsetMs: -100 })[0]).toBeCloseTo(0.4, 9)
  })

  it('replaces beats with a constant grid anchored at the first detected beat plus offset', () => {
    const beats = effectiveBeats(detected, 5, { factor: 1, manualBpm: 60, offsetMs: 250 })
    expect(beats).toEqual([0.25, 1.25, 2.25, 3.25, 4.25])
  })

  it('returns nothing without a usable detection', () => {
    expect(effectiveBeats([], 10, none)).toEqual([])
    expect(effectiveBeats([], 3, { ...none, manualBpm: 60 })).toEqual([0, 1, 2])
  })
})

describe('beat options', () => {
  it('reports the effective tempo', () => {
    expect(effectiveBpm(87, { ...none, factor: 2 })).toBe(174)
    expect(effectiveBpm(87, { ...none, factor: 2, manualBpm: 100 })).toBe(100)
  })

  it('lists durations for 1, 2, 4, 8, 16 beats and picks the nearest', () => {
    expect(beatOptions(120).map((o) => o.seconds)).toEqual([0.5, 1, 2, 4, 8])
    expect(nearestBeatOption(120, 3.2)).toBe(8)
    expect(nearestBeatOption(120, 2.9)).toBe(4)
    expect(nearestBeatOption(90, 3)).toBe(4)
  })
})

describe('downbeatIndex', () => {
  it('counts from the first detected beat, wherever the grid starts', () => {
    const beats = effectiveBeats(detected, 6, none)
    expect(downbeatIndex(beats, detected, none)).toBe(4)
    expect(downbeatIndex(beats, detected, { ...none, downbeat: 3 })).toBe(7)
  })

  it('follows the offset and a manual grid', () => {
    const shifted = { ...none, offsetMs: 100 }
    expect(downbeatIndex(effectiveBeats(detected, 6, shifted), detected, shifted)).toBe(4)
    const manual = { factor: 1, manualBpm: 60, offsetMs: 250, downbeat: 1 }
    expect(downbeatIndex(effectiveBeats(detected, 5, manual), detected, manual)).toBe(3)
  })
})
