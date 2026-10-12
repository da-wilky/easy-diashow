<script lang="ts">
  import { i18n } from './i18n.svelte'
  import { onDestroy, untrack } from 'svelte'
  import { SAMPLE_RATE, decodeAudio } from '../lib/audio/decode'
  import { schedulePlayback } from '../lib/audio/playback'
  import type { Project } from '../lib/project/types'
  import { Compositor } from '../lib/render/compositor'
  import { WATERMARK_OFFSET } from '../lib/render/layout'
  import { thumbnailName } from '../lib/render/thumbnail'
  import { readBlob } from '../lib/storage'
  import type { Timeline } from '../lib/timeline/types'
  import { formatDuration } from './format'
  import Icon from './Icon.svelte'

  const WIDTH = 640
  const AUDIO_LEAD = 0.05

  const m = $derived(i18n.m)

  let { project, timeline }: { project: Project; timeline: Timeline } = $props()

  let canvas = $state<HTMLCanvasElement>()
  let position = $state(0)
  let playing = $state(false)
  let loading = $state(false)
  let volume = $state(1)
  let error = $state('')
  const height = $derived(Math.round((WIDTH * timeline.height) / timeline.width))
  const empty = $derived(!timeline.segments.length)

  // caches that are never rendered
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const thumbnails = new Map<string, Blob>()
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const buffers = new Map<string, AudioBuffer>()
  let compositor: Compositor | undefined
  let context: AudioContext | undefined
  let output: GainNode | undefined
  let stopAudio = () => {}
  let startedAt = 0
  let startedFrom = 0
  let frameRequest = 0
  let wanted = -1
  let drawn = -1
  let drawing = false

  async function render() {
    if (drawing) return
    drawing = true
    try {
      while (compositor && drawn !== wanted) {
        const current = compositor
        const frame = wanted
        // a compositor replaced while it draws fails on its disposed images
        await current.draw(frame).catch((e: unknown) => {
          if (current === compositor) throw e
        })
        if (current === compositor) drawn = frame
      }
    } finally {
      drawing = false
    }
  }

  function show(seconds: number) {
    if (!compositor) return
    // a paused preview at the very start would be the black first frame of the fade-in
    const visible = !playing && seconds === 0 ? timeline.fadeIn : seconds
    wanted = Math.max(0, Math.min(Math.floor(visible * timeline.fps), compositor.totalFrames - 1))
    render()
  }

  function pause() {
    cancelAnimationFrame(frameRequest)
    stopAudio()
    stopAudio = () => {}
    playing = false
  }

  function tick() {
    position = Math.min(startedFrom + Math.max(context!.currentTime - startedAt, 0), timeline.duration)
    show(position)
    // no layout box: hidden behind the privacy page
    if (position >= timeline.duration || !canvas?.offsetParent) pause()
    else frameRequest = requestAnimationFrame(tick)
  }

  function setVolume(value: number) {
    volume = value
    // squared: loudness is heard roughly logarithmically, a linear gain does almost nothing in the upper half and jumps at the bottom
    if (context && output) output.gain.setTargetAtTime(value ** 2, context.currentTime, 0.015)
  }

  async function play() {
    if (!compositor || loading) return
    if (position >= timeline.duration - 0.05) position = 0
    context ??= new AudioContext({ sampleRate: SAMPLE_RATE })
    if (!output) {
      output = context.createGain()
      output.connect(context.destination)
    }
    output.gain.value = volume ** 2
    await context.resume()
    loading = true
    error = ''
    let id = ''
    try {
      for (id of new Set(timeline.audio.map((c) => c.trackId)))
        if (!buffers.has(id)) buffers.set(id, await decodeAudio(await readBlob(project.id, id)))
    } catch {
      error = m.unreadableAudio(project.tracks.find((t) => t.id === id)?.name ?? '')
      return
    } finally {
      loading = false
    }
    startedAt = context.currentTime + AUDIO_LEAD
    startedFrom = position
    stopAudio = schedulePlayback(context, timeline, buffers, startedFrom, startedAt, output)
    playing = true
    frameRequest = requestAnimationFrame(tick)
  }

  function seek(seconds: number) {
    const resume = playing
    pause()
    position = seconds
    show(position)
    if (resume) play()
  }

  $effect(() => {
    const current = timeline
    const projectId = project.id
    const hasWatermark = project.watermark !== null
    const size = { width: WIDTH, height }
    untrack(pause)
    for (const id of buffers.keys()) if (!current.audio.some((c) => c.trackId === id)) buffers.delete(id)
    let stale = false
    ;(async () => {
      const missing = current.segments.filter((s) => !thumbnails.has(s.imageId))
      await Promise.all(missing.map(async (s) => thumbnails.set(s.imageId, await readBlob(projectId, thumbnailName(s.imageId)))))
      const watermark = hasWatermark ? await createImageBitmap(await readBlob(projectId, 'watermark')) : null
      if (stale || !canvas) return
      compositor?.dispose()
      compositor = current.segments.length
        ? new Compositor(canvas, { ...current, ...size }, thumbnails, watermark, (WATERMARK_OFFSET * WIDTH) / current.width)
        : undefined
      drawn = -1
      position = Math.min(position, current.duration)
      show(position)
    })()
    return () => (stale = true)
  })

  onDestroy(() => {
    pause()
    compositor?.dispose()
    context?.close()
  })
</script>

<section class="card preview" data-section="preview" aria-label={m.preview}>
  <div class="screen">
    <canvas bind:this={canvas} width={WIDTH} {height} hidden={empty}></canvas>
    {#if empty}
      <div class="placeholder">
        <Icon name="film" size={36} />
        <p>{m.previewEmpty}</p>
      </div>
    {:else if !playing}
      <button class="big" onclick={play} disabled={loading} aria-label={m.playPreview}>
        <Icon name="play" size={30} />
      </button>
    {/if}
  </div>
  <div class="controls">
    <button class="ghost icon" onclick={() => (playing ? pause() : play())} disabled={empty || loading} aria-label={playing ? m.pausePreview : m.resumePreview}>
      <Icon name={playing ? 'pause' : 'play'} />
    </button>
    <input
      type="range"
      min="0"
      max={timeline.duration}
      step={1 / timeline.fps}
      value={position}
      disabled={empty}
      aria-label={m.previewPosition}
      oninput={(e) => seek(e.currentTarget.valueAsNumber)}
    />
    <span class="meta time" data-testid="preview-time">{formatDuration(position)} / {formatDuration(timeline.duration)}</span>
    {#if timeline.audio.length}
      <span class="volume">
        <Icon name="volume" size={18} />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          aria-label={m.previewVolume}
          oninput={(e) => setVolume(e.currentTarget.valueAsNumber)}
        />
      </span>
    {/if}
  </div>
  {#if loading}<p class="meta" role="status">{m.loadingMusic}</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  .preview {
    padding: 0.6rem;
    display: grid;
    gap: 0.4rem;
  }
  .screen {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: var(--radius-small);
    overflow: hidden;
    display: grid;
    place-items: center;
  }
  canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .placeholder {
    color: #9a9aa6;
    display: grid;
    justify-items: center;
    gap: 0.5rem;
    padding: 1rem;
    text-align: center;
    font-size: 0.9rem;
  }
  .big {
    position: absolute;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    border: none;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
    backdrop-filter: blur(4px);
  }
  .big:hover:not(:disabled) {
    background: var(--accent);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .volume {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--muted);
    flex: 0 0 6.5rem;
  }
  .time {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
</style>
