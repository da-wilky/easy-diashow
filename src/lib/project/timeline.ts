import type { Silence } from '../audio/silence'
import { downbeatIndex, effectiveBeats, effectiveBpm, nearestBeatOption } from '../beats/grid'
import { buildTimeline } from '../timeline/build'
import { FPS, type Timeline } from '../timeline/types'
import { RESOLUTIONS, type Project, type ProjectSettings, type ProjectTrack } from './types'

/** null when the track has neither a detected nor a manual tempo */
export function trackBpm(track: ProjectTrack): number | null {
  if (track.adjust.manualBpm) return track.adjust.manualBpm
  return track.analysis ? effectiveBpm(track.analysis.bpm, track.adjust) : null
}

export function trackBeatsPerImage(track: ProjectTrack, settings: ProjectSettings): number {
  if (settings.beatMode === 'beats') return track.beatsPerImage
  const bpm = trackBpm(track)
  return track.targetBeats ?? (bpm ? nearestBeatOption(bpm, settings.targetSeconds) : 4)
}

const NO_SILENCE: Silence = { start: 0, end: 0 }

/** what is cut from the ends of the track */
export function trackTrim(track: ProjectTrack): Silence {
  return track.trimSilence === false ? NO_SILENCE : (track.silence ?? NO_SILENCE)
}

/** length of the part of the track that is played */
export function trackDuration(track: ProjectTrack) {
  const trim = trackTrim(track)
  return track.duration - trim.start - trim.end
}

export function projectTimeline(project: Project): Timeline {
  const { settings } = project
  return buildTimeline(
    project.images.map((i) => i.id),
    project.tracks.map((track) => {
      const detected = track.analysis?.beats ?? []
      const all = effectiveBeats(detected, track.duration, track.adjust)
      const offset = trackTrim(track).start
      const duration = trackDuration(track)
      const cut = all.findIndex((b) => b >= offset)
      const beats = cut === -1 ? [] : all.slice(cut).map((b) => b - offset).filter((b) => b < duration)
      return {
        id: track.id,
        offset,
        duration,
        beats,
        beatsPerImage: trackBeatsPerImage(track, settings),
        beatPhase: downbeatIndex(all, detected, track.adjust) - Math.max(cut, 0),
      }
    }),
    { ...settings, ...RESOLUTIONS[settings.resolution], fps: FPS },
  )
}
