export function clickTrack(bpm: number, offset: number, seconds: number, sampleRate: number) {
  const data = new Float32Array(sampleRate * seconds)
  const beats: number[] = []
  for (let n = 0; offset + (n * 60) / bpm < seconds - 0.1; n++) {
    const t = offset + (n * 60) / bpm
    beats.push(t)
    const start = Math.round(t * sampleRate)
    for (let i = 0; i < sampleRate * 0.05; i++)
      data[start + i]! += Math.sin((2 * Math.PI * 1000 * i) / sampleRate) * Math.exp(-i / (sampleRate * 0.008))
  }
  return { data, beats }
}
