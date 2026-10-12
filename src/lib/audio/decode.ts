export const SAMPLE_RATE = 48000

/** Decodes to mono or stereo and resamples to SAMPLE_RATE. Rejects for data the browser cannot decode. */
export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  const buffer = await new OfflineAudioContext(2, 1, SAMPLE_RATE).decodeAudioData(await blob.arrayBuffer())
  if (buffer.numberOfChannels <= 2) return buffer
  // surround: the stereo destination mixes centre and rear channels in instead of dropping them
  const context = new OfflineAudioContext(2, buffer.length, SAMPLE_RATE)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(context.destination)
  source.start()
  return context.startRendering()
}

export function toMono(buffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(buffer.length)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < mono.length; i++) mono[i]! += data[i]! / buffer.numberOfChannels
  }
  return mono
}

export function copyChannels(buffer: AudioBuffer): Float32Array[] {
  return Array.from({ length: Math.min(buffer.numberOfChannels, 2) }, (_, c) => buffer.getChannelData(c).slice())
}
