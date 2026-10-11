import type { Timeline } from '../timeline/types'
import { clipGain, masterGain } from './mix'

const CURVE_POINTS = 33

/**
 * Schedules the timeline's audio plan into `destination` so that timeline position `from` plays at context time `at`.
 * Returns a function that stops it.
 */
export function schedulePlayback(
  context: AudioContext,
  timeline: Timeline,
  buffers: Map<string, AudioBuffer>,
  from: number,
  at: number,
  destination: AudioNode,
) {
  const toContext = (t: number) => at + t - from
  const automate = (param: AudioParam, gainAt: (t: number) => number, start: number, end: number) => {
    const begin = Math.max(start, from)
    if (end <= begin) return
    const curve = Float32Array.from({ length: CURVE_POINTS }, (_, i) => gainAt(begin + ((end - begin) * i) / (CURVE_POINTS - 1)))
    // slightly short so that adjacent curves on one param never overlap
    param.setValueCurveAtTime(curve, toContext(begin), (end - begin) * 0.999)
  }

  const master = context.createGain()
  master.connect(destination)
  automate(master.gain, (t) => masterGain(timeline, t), 0, timeline.fadeIn)
  automate(master.gain, (t) => masterGain(timeline, t), timeline.duration - timeline.fadeOut, timeline.duration)

  const sources = timeline.audio
    .filter((clip) => clip.end > from && clip.start < timeline.duration)
    .map((clip) => {
      const source = context.createBufferSource()
      source.buffer = buffers.get(clip.trackId)!
      const gain = context.createGain()
      source.connect(gain).connect(master)
      automate(gain.gain, (t) => clipGain(clip, t), clip.start, clip.start + clip.fadeIn)
      automate(gain.gain, (t) => clipGain(clip, t), clip.end - clip.fadeOut, clip.end)
      const begin = Math.max(clip.start, from)
      source.start(toContext(begin), begin - clip.start + clip.offset)
      source.stop(toContext(Math.min(clip.end, timeline.duration)))
      return source
    })

  return () => {
    for (const source of sources) source.stop()
    master.disconnect()
  }
}
