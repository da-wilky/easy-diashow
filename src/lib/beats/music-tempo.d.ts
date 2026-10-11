declare module 'music-tempo' {
  export default class MusicTempo {
    constructor(audioData: ArrayLike<number>, params?: { hopSize?: number; timeStep?: number })
    tempo: number | string
    beats: number[]
  }
}
