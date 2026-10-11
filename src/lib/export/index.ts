import { SAMPLE_RATE, copyChannels, decodeAudio } from '../audio/decode'
import type { Timeline } from '../timeline/types'
import type { ExportMessage, ExportRequest } from './worker'

export type ExportStage = 'decode' | 'video' | 'audio' | 'finalize'

export interface ExportInput {
  timeline: Timeline
  images: Map<string, Blob>
  tracks: Map<string, Blob>
  watermark: Blob | null
}

/** Rejects with an AbortError when `signal` aborts. */
export async function exportVideo(
  input: ExportInput,
  onProgress: (stage: ExportStage, fraction: number) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const ids = [...new Set(input.timeline.audio.map((c) => c.trackId))]
  const tracks = new Map<string, Float32Array[]>()
  for (const [i, id] of ids.entries()) {
    onProgress('decode', i / ids.length)
    tracks.set(id, copyChannels(await decodeAudio(input.tracks.get(id)!)))
    signal.throwIfAborted()
  }

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  try {
    return await new Promise<Blob>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason))
      worker.onerror = (e) => reject(new Error(e.message))
      worker.onmessage = ({ data }: MessageEvent<ExportMessage>) => {
        if (data.type === 'progress') onProgress(data.stage, data.fraction)
        else if (data.type === 'done') resolve(new Blob([data.buffer], { type: 'video/mp4' }))
        else reject(new Error(data.message))
      }
      const request: ExportRequest = {
        timeline: input.timeline,
        images: input.images,
        watermark: input.watermark,
        tracks,
        sampleRate: SAMPLE_RATE,
      }
      worker.postMessage(request, [...tracks.values()].flat().map((c) => c.buffer))
    })
  } finally {
    worker.terminate()
  }
}
