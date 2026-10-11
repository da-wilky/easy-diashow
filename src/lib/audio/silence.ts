/** -50 dBFS: below this a passage is inaudible next to music */
const THRESHOLD = 10 ** (-50 / 20)
/** shorter quiet stretches are part of the music */
const MIN_SILENCE_SECONDS = 1
/** kept before the first and after the last sound so nothing starts or ends abruptly */
const PADDING_SECONDS = 0.2

export interface Silence {
  /** seconds of silence that can be cut from the start and from the end */
  start: number
  end: number
}

export function detectSilence(channels: Float32Array[], sampleRate: number): Silence {
  const length = channels[0]!.length
  const loud = (i: number) => channels.some((c) => Math.abs(c[i]!) > THRESHOLD)
  let first = 0
  while (first < length && !loud(first)) first++
  if (first === length) return { start: 0, end: 0 }
  let last = length - 1
  while (!loud(last)) last--
  const cut = (samples: number) => {
    const seconds = samples / sampleRate
    return seconds >= MIN_SILENCE_SECONDS ? seconds - PADDING_SECONDS : 0
  }
  return { start: cut(first), end: cut(length - 1 - last) }
}
