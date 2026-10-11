import { describe, expect, it } from 'vitest'
import { analyseBeats } from '../../src/lib/beats/analyse'
import { clickTrack } from './clicks'

const BEAT_TOLERANCE = 0.025

describe('analyseBeats', () => {
  for (const sampleRate of [44100, 48000])
    for (const [bpm, offset] of [[90, 0.25], [120, 0.1], [128, 0.37], [174, 0.05]] as const)
      it(`finds ${bpm} BPM with first beat at ${offset}s (${sampleRate} Hz)`, () => {
        const { data, beats } = clickTrack(bpm, offset, 60, sampleRate)
        const result = analyseBeats(data, sampleRate)
        expect(Math.abs(result.bpm - bpm)).toBeLessThanOrEqual(1)
        expect(Math.abs(result.beats.length - beats.length)).toBeLessThanOrEqual(2)
        for (const found of result.beats) {
          const nearest = Math.min(...beats.map((b) => Math.abs(b - found)))
          expect(nearest).toBeLessThanOrEqual(BEAT_TOLERANCE)
        }
        expect(Math.abs(result.beats[0]! - offset)).toBeLessThanOrEqual(BEAT_TOLERANCE)
      })
})
