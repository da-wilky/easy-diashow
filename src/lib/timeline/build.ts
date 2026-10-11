import {
  AUDIO_CROSSFADE_SECONDS,
  type AudioClip,
  type Timeline,
  type TimelineSettings,
  type TimelineTrack,
  type Transition,
} from './types'

const EPS = 1e-6

interface Region {
  track: TimelineTrack
  /** output time of the track's first sample */
  start: number
  /** the beat grid of this track is valid in [from, to) */
  from: number
  to: number
  fadeIn: number
  fadeOut: number
}

function regionSequence(tracks: TimelineTrack[]) {
  const regions: Region[] = []
  const crossfade = (a: TimelineTrack, b: TimelineTrack) =>
    Math.min(AUDIO_CROSSFADE_SECONDS, a.duration / 2, b.duration / 2)
  const extend = () => {
    const i = regions.length
    const track = tracks[i % tracks.length]!
    const fadeOut = crossfade(track, tracks[(i + 1) % tracks.length]!)
    const prev = regions[i - 1]
    const start = prev ? prev.start + prev.track.duration - prev.fadeOut : 0
    const fadeIn = prev ? prev.fadeOut : 0
    regions.push({
      track,
      start,
      from: prev ? prev.to : 0,
      to: start + track.duration - fadeOut / 2,
      fadeIn,
      fadeOut,
    })
  }
  return {
    at(t: number) {
      while (!regions.length || regions.at(-1)!.to <= t) extend()
      return regions.find((r) => t < r.to)!
    },
    until(t: number) {
      this.at(t)
      return regions.filter((r) => r.start < t)
    },
  }
}

const hasGrid = (track: TimelineTrack) => track.beats.length >= 2

function beatIndex(region: Region, t: number) {
  return region.track.beats.findIndex((b) => b >= t - region.start - EPS)
}

/** index of the first beat at or after `t` this track may cut on, or -1 */
function cutIndex(region: Region, t: number) {
  const { beats, beatsPerImage, beatPhase } = region.track
  const i = beatIndex(region, t)
  if (i === -1) return -1
  const aligned = i + ((((beatPhase - i) % beatsPerImage) + beatsPerImage) % beatsPerImage)
  return aligned < beats.length ? aligned : -1
}

/** output time of the beat `n` beats after the first beat at or after `t`, continuing the grid past its last beat */
function advance(region: Region, t: number, n: number) {
  const { beats } = region.track
  const last = beats.length - 1
  const interval = beats[last]! - beats[last - 1]!
  let i = beatIndex(region, t)
  if (i === -1) i = last + Math.ceil((t - region.start - beats[last]!) / interval - EPS)
  i += n
  return region.start + (i <= last ? beats[i]! : beats[last]! + (i - last) * interval)
}

export function buildTimeline(imageIds: string[], allTracks: TimelineTrack[], settings: TimelineSettings): Timeline {
  const { fps, fadeIn, fadeOut, secondsPerImage } = settings
  const transitionDuration = settings.transition === 'none' ? 0 : settings.transitionDuration
  const tracks = allTracks.filter((t) => t.duration > 0)
  const regions = tracks.length ? regionSequence(tracks) : null
  const beatSync = settings.beatSync && regions !== null

  /** first beat at or after `target` that the track playing at that beat may cut on */
  const snap = (target: number, origin: Region | null): number => {
    // a track whose beats all lie inside its crossfades never yields one
    for (let tries = 0; tries <= tracks.length * 2; tries++) {
      const region = regions!.at(target)
      if (region === origin || !hasGrid(region.track)) return target
      const i = cutIndex(region, Math.max(target, region.from))
      const beat = region.start + (region.track.beats[i] ?? Infinity)
      if (beat < region.to) return beat
      target = region.to
    }
    return target
  }
  /** next cut after the cut at `t` */
  const next = (t: number): number => {
    if (!beatSync) return t + secondsPerImage + transitionDuration
    const region = regions!.at(t)
    if (!hasGrid(region.track)) return snap(t + secondsPerImage + transitionDuration, region)
    const target = advance(region, t, region.track.beatsPerImage)
    return target < region.to ? target : snap(target, region)
  }

  const cuts: number[] = []
  const onGrid = (time: number) => beatSync && hasGrid(regions!.at(time).track)
  let t = onGrid(fadeIn) ? snap(fadeIn + transitionDuration / 2, null) : fadeIn - transitionDuration / 2
  let lastStepOnGrid = false
  for (let i = 0; i < imageIds.length; i++) {
    lastStepOnGrid = onGrid(t)
    t = next(t)
    cuts.push(t)
  }
  const holdEnd = imageIds.length ? cuts.pop()! - (lastStepOnGrid ? 0 : transitionDuration / 2) : 0
  const duration = imageIds.length ? Math.round((holdEnd + fadeOut) * fps) / fps : 0

  const bounds = [0, ...cuts, duration]
  const segments = imageIds.map((imageId, i) => ({ imageId, start: bounds[i]!, end: bounds[i + 1]! }))

  const transitions: Transition[] = []
  if (settings.transition !== 'none')
    for (let i = 0; i < cuts.length; i++) {
      const gap = Math.min(cuts[i]! - bounds[i]!, bounds[i + 2]! - cuts[i]!)
      const half = Math.min(transitionDuration, gap) / 2
      transitions.push({
        type: settings.transition,
        start: cuts[i]! - half,
        end: cuts[i]! + half,
        from: imageIds[i]!,
        to: imageIds[i + 1]!,
      })
    }

  const audio: AudioClip[] = (regions && duration > 0 ? regions.until(duration) : []).map((r) => ({
    trackId: r.track.id,
    start: r.start,
    end: r.start + r.track.duration,
    offset: 0,
    fadeIn: r.fadeIn,
    fadeOut: r.fadeOut,
  }))

  return { fps, width: settings.width, height: settings.height, duration, fadeIn, fadeOut, segments, transitions, audio }
}
