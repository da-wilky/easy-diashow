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

export function projectTimeline(project: Project): Timeline {
  const { settings } = project
  return buildTimeline(
    project.images.map((i) => i.id),
    project.tracks.map((track) => {
      const detected = track.analysis?.beats ?? []
      const beats = effectiveBeats(detected, track.duration, track.adjust)
      return {
        id: track.id,
        duration: track.duration,
        beats,
        beatsPerImage: trackBeatsPerImage(track, settings),
        beatPhase: downbeatIndex(beats, detected, track.adjust),
      }
    }),
    { ...settings, ...RESOLUTIONS[settings.resolution], fps: FPS },
  )
}
