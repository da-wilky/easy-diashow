import { registerAacEncoder } from '@mediabunny/aac-encoder'
import { canEncodeAudio, canEncodeVideo } from 'mediabunny'

/** Registers the WASM AAC encoder when the browser has none. Call once per thread before encoding. */
export async function ensureAacEncoder() {
  if (!(await canEncodeAudio('aac'))) registerAacEncoder()
  return canEncodeAudio('aac')
}

export async function checkExportSupport(width: number, height: number) {
  return {
    video: typeof VideoEncoder !== 'undefined' && (await canEncodeVideo('avc', { width, height })),
    audio: await ensureAacEncoder(),
  }
}
