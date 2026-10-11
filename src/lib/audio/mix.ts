import type { Timeline } from '../timeline/types'

/**
 * Mixes `length` samples starting at sample `from` of the timeline's audio plan.
 * Returns planar stereo: left channel followed by right channel.
 */
export function mixChunk(
  timeline: Timeline,
  tracks: Map<string, Float32Array[]>,
  sampleRate: number,
  from: number,
  length: number,
): Float32Array {
  const out = new Float32Array(length * 2)
  for (const clip of timeline.audio) {
    const channels = tracks.get(clip.trackId)!
    const clipStart = Math.round(clip.start * sampleRate)
    const source = Math.round(clip.offset * sampleRate) - clipStart
    const begin = Math.max(from, clipStart)
    const end = Math.min(from + length, clipStart + channels[0]!.length - Math.round(clip.offset * sampleRate))
    for (let i = begin; i < end; i++) {
      const t = i / sampleRate
      let gain = 1
      if (t < clip.start + clip.fadeIn) gain = Math.sin(((t - clip.start) / clip.fadeIn) * (Math.PI / 2))
      else if (t > clip.end - clip.fadeOut) gain = Math.sin((Math.max(clip.end - t, 0) / clip.fadeOut) * (Math.PI / 2))
      for (let c = 0; c < 2; c++) out[c * length + i - from]! += channels[Math.min(c, channels.length - 1)]![i + source]! * gain
    }
  }
  for (let i = 0; i < length; i++) {
    const t = (from + i) / sampleRate
    const master = Math.min(1, t / timeline.fadeIn, Math.max(timeline.duration - t, 0) / timeline.fadeOut)
    if (master < 1) {
      out[i]! *= master
      out[length + i]! *= master
    }
  }
  return out
}
