export const FPS = 30
export const MAX_VIDEO_SECONDS = 30 * 60
export const AUDIO_CROSSFADE_SECONDS = 1

export const TRANSITION_GROUPS = {
  fades: ['none', 'crossfade', 'fadeBlack', 'zoom'],
  wipes: ['wipe', 'wipeLeft', 'wipeDown', 'wipeUp'],
  slides: ['slide', 'push', 'pushUp'],
  shapes: ['reveal', 'circle', 'blinds'],
} as const

export type TransitionGroup = keyof typeof TRANSITION_GROUPS
export type TransitionType = (typeof TRANSITION_GROUPS)[TransitionGroup][number]

export interface TimelineSettings {
  width: number
  height: number
  fps: number
  secondsPerImage: number
  transition: TransitionType
  transitionDuration: number
  fadeIn: number
  fadeOut: number
  beatSync: boolean
}

export interface TimelineTrack {
  id: string
  duration: number
  /** beat times in seconds from track start, ascending; fewer than two means no usable grid */
  beats: number[]
  beatsPerImage: number
  /** index of a beat that counts as "the one"; cuts fall on beats a multiple of `beatsPerImage` away from it */
  beatPhase: number
}

export interface Segment {
  imageId: string
  start: number
  end: number
}

export interface Transition {
  type: Exclude<TransitionType, 'none'>
  start: number
  end: number
  from: string
  to: string
}

/** `end` is the track's natural end; the mixer cuts at the timeline duration. Fades are equal-power crossfades. */
export interface AudioClip {
  trackId: string
  start: number
  end: number
  offset: number
  fadeIn: number
  fadeOut: number
}

export interface Timeline {
  fps: number
  width: number
  height: number
  duration: number
  fadeIn: number
  fadeOut: number
  segments: Segment[]
  transitions: Transition[]
  audio: AudioClip[]
}
