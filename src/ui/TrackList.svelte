<script lang="ts">
  import { SAMPLE_RATE, decodeAudio, toMono } from '../lib/audio/decode'
  import { analyseInWorker } from '../lib/beats'
  import { beatOptions } from '../lib/beats/grid'
  import { trackBeatsPerImage, trackBpm } from '../lib/project/timeline'
  import type { Project, ProjectTrack } from '../lib/project/types'
  import { removeBlob, writeBlob } from '../lib/storage'
  import { formatDuration, formatSeconds } from './format'
  import { storageError } from './messages'

  let { project = $bindable(), pending = $bindable() }: { project: Project; pending: number } = $props()

  let error = $state('')
  let status = $state('')

  async function add(files: File[]) {
    error = ''
    pending = pending + 1
    try {
      for (const file of files) {
        status = `${file.name} wird analysiert …`
        const buffer = await decodeAudio(file).catch(() => null)
        if (!buffer) {
          error = `${file.name} konnte nicht als Audiodatei gelesen werden.`
          continue
        }
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
    } catch (e) {
      error = storageError(e)
    } finally {
      status = ''
      pending = pending - 1
    }
  }

  async function remove(track: ProjectTrack) {
    project.tracks = project.tracks.filter((t) => t.id !== track.id)
    if (!project.tracks.length) project.settings.beatSync = false
    await removeBlob(project.id, track.id)
  }

  function move(index: number, by: number) {
    project.tracks.splice(index + by, 0, ...project.tracks.splice(index, 1))
  }

  function scaleTempo(track: ProjectTrack, factor: number) {
    if (track.adjust.manualBpm) track.adjust.manualBpm = Number((track.adjust.manualBpm * factor).toFixed(2))
    else track.adjust.factor = Math.min(4, Math.max(0.25, track.adjust.factor * factor))
  }

  const bpmText = (bpm: number | null) => (bpm ? bpm.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–')
</script>

<section aria-label="Musik">
  <h3>Musik <span class="meta">({project.tracks.length})</span></h3>
  <div class="row">
    <label class="button">
      Musik hinzufügen
      <input type="file" multiple accept=".mp3,audio/*" onchange={(e) => {
        add([...e.currentTarget.files!])
        e.currentTarget.value = ''
      }} />
    </label>
  </div>
  <p class="meta">Die Stücke werden in dieser Reihenfolge mit 1 s Überblendung gespielt und bei Bedarf wiederholt.</p>
  {#if status}<p role="status">{status}</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <ol class="tracks">
    {#each project.tracks as track, index (track.id)}
      {@const bpm = trackBpm(track)}
      <li aria-label={track.name}>
        <div class="row head">
          <strong>{track.name}</strong>
          <span class="meta">{formatDuration(track.duration)} min · <span data-testid="bpm">{bpmText(bpm)}</span> BPM</span>
          <span class="spacer"></span>
          <button onclick={() => move(index, -1)} disabled={index === 0} aria-label="{track.name} nach oben">↑</button>
          <button onclick={() => move(index, 1)} disabled={index === project.tracks.length - 1} aria-label="{track.name} nach unten">↓</button>
          <button class="danger" onclick={() => remove(track)} aria-label="{track.name} entfernen">✕</button>
        </div>
        {#if !bpm}
          <p class="error">Kein Tempo erkannt. Bitte BPM von Hand eintragen, sonst gilt für dieses Stück die feste Zeit pro Bild.</p>
        {/if}
        <div class="row">
          <button onclick={() => scaleTempo(track, 0.5)} disabled={!bpm} aria-label="BPM halbieren">BPM ×½</button>
          <button onclick={() => scaleTempo(track, 2)} disabled={!bpm} aria-label="BPM verdoppeln">BPM ×2</button>
          <label>
            BPM von Hand
            <input
              type="number"
              min="20"
              max="400"
              step="0.1"
              placeholder="automatisch"
              value={track.adjust.manualBpm}
              onchange={(e) => {
                const entered = e.currentTarget.valueAsNumber
                track.adjust.manualBpm = entered >= 20 && entered <= 400 ? entered : null
                track.targetBeats = null
              }}
            />
          </label>
          <label>
            Beat-Versatz (ms)
            <input type="number" step="10" min="-2000" max="2000" value={track.adjust.offsetMs} onchange={(e) => (track.adjust.offsetMs = e.currentTarget.valueAsNumber || 0)} />
          </label>
        </div>
        {#if project.settings.beatSync && bpm}
          {#if project.settings.beatMode === 'beats'}
            <div class="row">
              <label>
                Beats pro Bild
                <input type="number" min="1" max="64" step="1" value={track.beatsPerImage} onchange={(e) => (track.beatsPerImage = Math.min(64, Math.max(1, Math.round(e.currentTarget.valueAsNumber) || 4)))} />
              </label>
              <span class="meta">= {formatSeconds((track.beatsPerImage * 60) / bpm)} pro Bild</span>
            </div>
          {:else}
            <fieldset class="row">
              <legend>Beats pro Bild</legend>
              {#each beatOptions(bpm) as option (option.beats)}
                <label class="choice">
                  <input type="radio" name="beats-{track.id}" checked={trackBeatsPerImage(track, project.settings) === option.beats} onchange={() => (track.targetBeats = option.beats)} />
                  {option.beats} ({formatSeconds(option.seconds)})
                </label>
              {/each}
            </fieldset>
          {/if}
        {/if}
      </li>
    {/each}
  </ol>
</section>

<style>
  .tracks {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .tracks > li {
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    padding: 0.6rem;
    display: grid;
    gap: 0.5rem;
  }
  .head strong {
    overflow-wrap: anywhere;
  }
  .spacer {
    flex: 1;
  }
  input[type='number'] {
    width: 6.5rem;
  }
</style>
