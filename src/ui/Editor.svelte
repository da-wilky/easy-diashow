<script lang="ts">
  import { SAMPLE_RATE, decodeAudio, toMono } from '../lib/audio/decode'
  import { analyseInWorker } from '../lib/beats'
  import { projectTimeline } from '../lib/project/timeline'
  import type { Project } from '../lib/project/types'
  import { makeThumbnail, thumbnailName } from '../lib/render/thumbnail'
  import { readBlob, saveProject, writeBlob } from '../lib/storage'
  import type { TransitionType } from '../lib/timeline/types'

  let { initial, onclose }: { initial: Project; onclose: () => void } = $props()

  // svelte-ignore state_referenced_locally
  let project = $state($state.snapshot(initial))
  let status = $state('')
  let pending = $state(0)
  let busy = $derived(pending > 0)
  let saved = $state(true)

  let firstRun = true
  $effect(() => {
    const snapshot = $state.snapshot(project)
    if (firstRun) {
      firstRun = false
      return
    }
    saved = false
    saveProject({ ...snapshot, modified: Date.now() }).then(() => (saved = true))
  })

  const collator = new Intl.Collator(undefined, { numeric: true })

  async function addImages(files: FileList) {
    pending++
    for (const file of files) {
      const id = crypto.randomUUID()
      await writeBlob(project.id, thumbnailName(id), await makeThumbnail(file))
      await writeBlob(project.id, id, file)
      project.images.push({ id, name: file.name })
    }
    project.images.sort((a, b) => collator.compare(a.name, b.name))
    pending--
  }

  async function addTracks(files: FileList) {
    pending++
    for (const file of files) {
      status = `Analysiere ${file.name}`
      const buffer = await decodeAudio(file)
      const analysis = await analyseInWorker(toMono(buffer), SAMPLE_RATE).catch(() => null)
      const id = crypto.randomUUID()
      await writeBlob(project.id, id, file)
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
    pending--
  }

  async function create() {
    pending++
    const { exportVideo } = await import('../lib/export')
    const load = async (ids: string[]) =>
      new Map(await Promise.all(ids.map(async (id) => [id, await readBlob(project.id, id)] as const)))
    const video = await exportVideo(
      {
        timeline: projectTimeline($state.snapshot(project)),
        images: await load(project.images.map((i) => i.id)),
        tracks: await load(project.tracks.map((t) => t.id)),
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
    pending--
  }
</script>

<button onclick={onclose}>Zur Projektliste</button>
<h2>{project.name}</h2>
<p>{saved ? 'Alle Änderungen gespeichert' : 'Speichert …'}</p>
<label>Bilder <input type="file" multiple accept="image/png,image/jpeg" onchange={(e) => addImages(e.currentTarget.files!)} /></label>
<ul>
  {#each project.images as image (image.id)}
    <li>{image.name}</li>
  {/each}
</ul>
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
