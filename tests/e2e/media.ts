import { execFileSync } from 'node:child_process'

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { maxBuffer: 1 << 30 })

export interface Probe {
  format: { format_name: string; duration: string }
  streams: {
    codec_type: 'video' | 'audio'
    codec_name: string
    width?: number
    height?: number
    r_frame_rate: string
    duration: string
    nb_frames: string
  }[]
}

export function probe(file: string): Probe {
  return JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]).toString())
}

const W = 16
const H = 9

/** every frame scaled down to 16x9 RGB */
export function readFrames(file: string) {
  const raw = run('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
  const size = W * H * 3
  return {
    count: raw.length / size,
    /** colour at relative position (0..1, 0..1) of a frame */
    pixel(frame: number, x = 0.5, y = 0.5): [number, number, number] {
      const o = frame * size + (Math.floor(y * (H - 1)) * W + Math.floor(x * (W - 1))) * 3
      return [raw[o]!, raw[o + 1]!, raw[o + 2]!]
    },
  }
}

export function nearestColour<T extends { rgb: readonly number[] }>(palette: readonly T[], rgb: number[]): T {
  const distance = (c: T) => c.rgb.reduce((sum, v, i) => sum + (v - rgb[i]!) ** 2, 0)
  return palette.reduce((best, c) => (distance(c) < distance(best) ? c : best))
}

/** mono samples at 48 kHz */
export function readAudio(file: string) {
  const raw = run('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'])
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4)
}

export function rms(samples: Float32Array, from = 0, to = samples.length) {
  let sum = 0
  for (let i = from; i < to; i++) sum += samples[i]! ** 2
  return Math.sqrt(sum / (to - from))
}

/** one frame at full resolution as RGB bytes */
export function readFrameBytes(file: string, frame: number) {
  return run('ffmpeg', ['-v', 'error', '-i', file, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
}

export function psnr(a: Uint8Array, b: Uint8Array) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i]! - b[i]!) ** 2
  return 10 * Math.log10(255 ** 2 / (sum / a.length))
}

/** one frame at full resolution; returns a pixel reader */
export function readFrame(file: string, frame: number, width: number, height: number) {
  const raw = readFrameBytes(file, frame)
  if (raw.length !== width * height * 3) throw new Error(`frame ${frame} is not ${width}x${height}`)
  return (x: number, y: number): [number, number, number] => {
    const o = (y * width + x) * 3
    return [raw[o]!, raw[o + 1]!, raw[o + 2]!]
  }
}
