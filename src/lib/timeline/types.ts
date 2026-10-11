export const FPS = 30
export const MAX_VIDEO_SECONDS = 30 * 60
export const AUDIO_CROSSFADE_SECONDS = 1

export type TransitionType = 'none' | 'crossfade' | 'wipe' | 'reveal'

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
