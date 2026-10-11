import type { AudioClip, Timeline } from '../timeline/types'

/** equal-power crossfade gain of a clip at output time `t` */
export function clipGain(clip: AudioClip, t: number) {
  if (t < clip.start || t >= clip.end) return 0
  if (t < clip.start + clip.fadeIn) return Math.sin(((t - clip.start) / clip.fadeIn) * (Math.PI / 2))
  if (t > clip.end - clip.fadeOut) return Math.sin(((clip.end - t) / clip.fadeOut) * (Math.PI / 2))
  return 1
}

/** linear fade-in and fade-out of the whole mix, following the video */
export function masterGain(timeline: Timeline, t: number) {
  return Math.min(1, t / timeline.fadeIn, Math.max(timeline.duration - t, 0) / timeline.fadeOut)
}

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
    const end = Math.min(from + length, Math.round(clip.end * sampleRate), clipStart + channels[0]!.length - Math.round(clip.offset * sampleRate))
    for (let i = begin; i < end; i++) {
      const gain = clipGain(clip, i / sampleRate)
      for (let c = 0; c < 2; c++) out[c * length + i - from]! += channels[Math.min(c, channels.length - 1)]![i + source]! * gain
    }
  }
  for (let i = 0; i < length; i++) {
    const master = masterGain(timeline, (from + i) / sampleRate)
    if (master < 1) {
      out[i]! *= master
      out[length + i]! *= master
    }
  }
  return out
}
