import type { BeatAnalysis } from './analyse'
import type { BeatRequest } from './worker'

export type { BeatAnalysis }

/** Rejects when no tempo can be found in the audio. */
export function analyseInWorker(mono: Float32Array, sampleRate: number): Promise<BeatAnalysis> {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return new Promise<BeatAnalysis>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<BeatAnalysis>) => resolve(e.data)
    worker.onerror = (e) => reject(new Error(e.message))
    worker.postMessage({ mono, sampleRate } satisfies BeatRequest, [mono.buffer])
  }).finally(() => worker.terminate())
}
