import type { BeatAnalysis } from '../beats/analyse'
import type { Silence } from '../audio/silence'
import type { BeatAdjust } from '../beats/grid'
import type { TransitionType } from '../timeline/types'

export const RESOLUTIONS = {
  '1080': { width: 1920, height: 1080 },
  '720': { width: 1280, height: 720 },
  '480': { width: 854, height: 480 },
} as const

export const LIMITS = {
  secondsPerImage: { min: 0.1, max: 20, step: 0.1 },
  transitionDuration: { min: 0.1, max: 3, step: 0.1 },
  fadeIn: { min: 0.1, max: 10, step: 0.1 },
  fadeOut: { min: 0.1, max: 10, step: 0.1 },
  audioCrossfade: { min: 0, max: 6, step: 0.5 },
} as const

export interface ProjectSettings {
  secondsPerImage: number
  transition: TransitionType
  transitionDuration: number
  fadeIn: number
  fadeOut: number
  resolution: keyof typeof RESOLUTIONS
  beatSync: boolean
  /** 'beats': each track uses its `beatsPerImage`; 'seconds': the beat count nearest to `targetSeconds` unless overridden per track */
  beatMode: 'beats' | 'seconds'
  targetSeconds: number
  audioCrossfade: number
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  secondsPerImage: 3,
  transition: 'crossfade',
  transitionDuration: 0.5,
  fadeIn: 2,
  fadeOut: 3,
  resolution: '1080',
  beatSync: false,
  beatMode: 'beats',
  targetSeconds: 3,
  audioCrossfade: 2,
}

export interface ProjectImage {
  id: string
  name: string
}

export interface ProjectTrack {
  id: string
  name: string
  duration: number
  /** null when no tempo could be detected */
  analysis: BeatAnalysis | null
  adjust: BeatAdjust
  beatsPerImage: number
  /** beat count chosen by the user in 'seconds' mode; null follows `targetSeconds` */
  targetBeats: number | null
  /** silence found at the ends of the file; absent for tracks added before detection existed */
  silence?: Silence
  /** false keeps the silence; absent means cut */
  trimSilence?: boolean
}

export interface Project {
  id: string
  name: string
  modified: number
  images: ProjectImage[]
  tracks: ProjectTrack[]
  watermark: string | null
  settings: ProjectSettings
}
