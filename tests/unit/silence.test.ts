import { describe, expect, it } from 'vitest'
import { detectSilence } from '../../src/lib/audio/silence'

const rate = 1000
function signal(seconds: number, from: number, to: number, level = 0.5) {
  const data = new Float32Array(seconds * rate)
  data.fill(level, from * rate, to * rate)
  return data
}

describe('detectSilence', () => {
  it('finds long silence at both ends and keeps a short padding', () => {
    const { start, end } = detectSilence([signal(20, 3, 16)], rate)
    expect(start).toBeCloseTo(2.8, 2)
    expect(end).toBeCloseTo(3.8, 2)
  })

  it('leaves short pauses alone', () => {
    expect(detectSilence([signal(20, 0.6, 19.5)], rate)).toEqual({ start: 0, end: 0 })
  })

  it('treats very quiet noise as silence but not quiet music', () => {
    const noisy = signal(20, 3, 16)
    for (let i = 0; i < 3 * rate; i++) noisy[i] = 0.001
    expect(detectSilence([noisy], rate).start).toBeCloseTo(2.8, 2)
    const quiet = signal(20, 3, 16)
    for (let i = 0; i < 3 * rate; i++) quiet[i] = 0.01
    expect(detectSilence([quiet], rate).start).toBe(0)
  })

  it('looks at every channel', () => {
    expect(detectSilence([signal(20, 5, 10), signal(20, 2, 18)], rate)).toEqual({ start: 1.8, end: expect.closeTo(1.8, 2) })
  })

  it('cuts nothing from a silent file', () => {
    expect(detectSilence([new Float32Array(5 * rate)], rate)).toEqual({ start: 0, end: 0 })
  })
})
