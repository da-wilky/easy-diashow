import { analyseBeats } from './analyse'

export interface BeatRequest {
  mono: Float32Array
  sampleRate: number
}

self.onmessage = (e: MessageEvent<BeatRequest>) => {
  self.postMessage(analyseBeats(e.data.mono, e.data.sampleRate))
}
