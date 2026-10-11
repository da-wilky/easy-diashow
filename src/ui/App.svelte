<script lang="ts">
  import { SAMPLE_RATE, decodeAudio, toMono } from '../lib/audio/decode'
  import { analyseInWorker } from '../lib/beats'
  import { projectTimeline } from '../lib/project/timeline'
  import { DEFAULT_SETTINGS, type Project } from '../lib/project/types'
  import type { TransitionType } from '../lib/timeline/types'

  const blobs: Record<string, Blob> = {}
  let project = $state<Project>({
    id: crypto.randomUUID(),
    name: '',
    modified: Date.now(),
    images: [],
    tracks: [],
    watermark: null,
    settings: { ...DEFAULT_SETTINGS },
  })
  let status = $state('')
  let busy = $state(false)

  const collator = new Intl.Collator(undefined, { numeric: true })

  function addImages(files: FileList) {
    for (const file of files) {
      const id = crypto.randomUUID()
      blobs[id] = file
      project.images.push({ id, name: file.name })
    }
    project.images.sort((a, b) => collator.compare(a.name, b.name))
  }

  async function addTracks(files: FileList) {
    busy = true
    for (const file of files) {
      status = `Analysiere ${file.name}`
      const buffer = await decodeAudio(file)
      const analysis = await analyseInWorker(toMono(buffer), SAMPLE_RATE).catch(() => null)
      const id = crypto.randomUUID()
      blobs[id] = file
      project.tracks.push({
        id,
        name: file.name,
        duration: buffer.duration,
        analysis,
        adjust: { factor: 1, manualBpm: null, offsetMs: 0 },
        beatsPerImage: 4,
        targetBeats: null,
      })
    }
    status = ''
    busy = false
  }

  async function create() {
    busy = true
    const { exportVideo } = await import('../lib/export')
    const pick = (ids: string[]) => new Map(ids.map((id) => [id, blobs[id]!]))
    const video = await exportVideo(
      {
        timeline: projectTimeline($state.snapshot(project)),
        images: pick(project.images.map((i) => i.id)),
        tracks: pick(project.tracks.map((t) => t.id)),
        watermark: null,
      },
      (stage, fraction) => (status = `${stage} ${Math.round(fraction * 100)} %`),
      new AbortController().signal,
    )
    const link = document.createElement('a')
    link.href = URL.createObjectURL(video)
    link.download = 'diashow.mp4'
    link.click()
    status = 'Fertig'
    busy = false
  }
</script>

<main>
  <h1>Diashow</h1>
  <label>Bilder <input type="file" multiple accept="image/png,image/jpeg" onchange={(e) => addImages(e.currentTarget.files!)} /></label>
  <label>Musik <input type="file" multiple accept="audio/*" onchange={(e) => addTracks(e.currentTarget.files!)} /></label>
  <ul>
    {#each project.tracks as track (track.id)}
      <li>{track.name}: {track.analysis?.bpm.toFixed(1) ?? '–'} BPM</li>
    {/each}
  </ul>
  <label><input type="checkbox" bind:checked={project.settings.beatSync} disabled={!project.tracks.length} /> Übergänge auf den Beat legen</label>
  <label for="transition">Übergang</label>
    <select id="transition" bind:value={project.settings.transition as TransitionType}>
      <option value="none">Kein Übergang</option>
      <option value="crossfade">Überblenden</option>
      <option value="wipe">Wischen von links nach rechts</option>
      <option value="reveal">Aufdecken von der Mitte</option>
    </select>
  <button onclick={create} disabled={busy || !project.images.length}>Diashow erstellen</button>
  <p role="status">{status}</p>
</main>
