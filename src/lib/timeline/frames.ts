import type { Timeline, Transition } from './types'

export interface FramePlan {
  totalFrames: number
  fadeInFrames: number
  fadeOutFrames: number
  segments: { imageId: string; start: number; end: number }[]
  transitions: { type: Transition['type']; from: string; to: string; start: number; end: number }[]
}

/** Frame indices come from rounding absolute times, so rounding errors never accumulate. */
export function toFramePlan(timeline: Timeline): FramePlan {
  const frame = (t: number) => Math.round(t * timeline.fps)
  return {
    totalFrames: frame(timeline.duration),
    fadeInFrames: frame(timeline.fadeIn),
    fadeOutFrames: frame(timeline.fadeOut),
    segments: timeline.segments.map((s) => ({ imageId: s.imageId, start: frame(s.start), end: frame(s.end) })),
    transitions: timeline.transitions.map((t) => ({ ...t, start: frame(t.start), end: frame(t.end) })),
  }
}
