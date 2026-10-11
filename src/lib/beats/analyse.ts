import MusicTempo from 'music-tempo'

export interface BeatAnalysis {
  bpm: number
  beats: number[]
}

export function analyseBeats(mono: Float32Array, sampleRate: number): BeatAnalysis {
  // music-tempo defaults assume 44.1 kHz; keep its 10 ms analysis step at any rate
  const hopSize = Math.round(sampleRate * 0.01)
  const result = new MusicTempo(mono, { hopSize, timeStep: hopSize / sampleRate })
  return { bpm: Number(result.tempo), beats: result.beats }
}
