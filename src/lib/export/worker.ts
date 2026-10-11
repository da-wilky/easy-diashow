import {
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from 'mediabunny'
import { mixChunk } from '../audio/mix'
import { Compositor } from '../render/compositor'
import type { Timeline } from '../timeline/types'
import { ensureAacEncoder } from './support'

export interface ExportRequest {
  timeline: Timeline
  images: Map<string, Blob>
  watermark: Blob | null
  tracks: Map<string, Float32Array[]>
  sampleRate: number
}

export type ExportMessage =
  | { type: 'progress'; stage: 'video' | 'audio' | 'finalize'; fraction: number }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; message: string }

const post = (message: ExportMessage, transfer: Transferable[] = []) => self.postMessage(message, { transfer })

async function run({ timeline, images, watermark, tracks, sampleRate }: ExportRequest) {
  const canvas = new OffscreenCanvas(timeline.width, timeline.height)
  const compositor = new Compositor(canvas, timeline, images, watermark && (await createImageBitmap(watermark)))
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
  const video = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH })
  output.addVideoTrack(video, { frameRate: timeline.fps })
  let audio: AudioSampleSource | null = null
  if (timeline.audio.length) {
    await ensureAacEncoder()
    audio = new AudioSampleSource({ codec: 'aac', quality: QUALITY_HIGH })
    output.addAudioTrack(audio)
  }
  await output.start()

  for (let frame = 0; frame < compositor.totalFrames; frame++) {
    await compositor.draw(frame)
    await video.add(frame / timeline.fps, 1 / timeline.fps)
    if (frame % 15 === 0) post({ type: 'progress', stage: 'video', fraction: frame / compositor.totalFrames })
  }

  if (audio) {
    const total = Math.round(timeline.duration * sampleRate)
    for (let from = 0; from < total; from += sampleRate) {
      const length = Math.min(sampleRate, total - from)
      const sample = new AudioSample({
        data: mixChunk(timeline, tracks, sampleRate, from, length),
        format: 'f32-planar',
        numberOfChannels: 2,
        sampleRate,
        timestamp: from / sampleRate,
      })
      await audio.add(sample)
      sample.close()
      post({ type: 'progress', stage: 'audio', fraction: from / total })
    }
  }

  post({ type: 'progress', stage: 'finalize', fraction: 0 })
  await output.finalize()
  const buffer = output.target.buffer!
  post({ type: 'done', buffer }, [buffer])
}

self.onmessage = (e: MessageEvent<ExportRequest>) => {
  run(e.data).catch((error: unknown) => post({ type: 'error', message: String(error) }))
}
