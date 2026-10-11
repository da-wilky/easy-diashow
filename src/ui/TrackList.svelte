<script lang="ts">
  import { flip } from 'svelte/animate'
  import { SAMPLE_RATE, decodeAudio, toMono } from '../lib/audio/decode'
  import { analyseInWorker } from '../lib/beats'
  import { beatOptions } from '../lib/beats/grid'
  import { trackBeatsPerImage, trackBpm } from '../lib/project/timeline'
  import type { Project, ProjectTrack } from '../lib/project/types'
  import { removeBlob, writeBlob } from '../lib/storage'
  import { formatDuration, formatSeconds } from './format'
  import Icon from './Icon.svelte'
  import { storageError } from './messages'
  import Segmented from './Segmented.svelte'
  import { SETTLE_MS, Sortable } from './sortable.svelte'

  let { project = $bindable(), pending = $bindable() }: { project: Project; pending: number } = $props()

  const sortable = new Sortable(
    () => project.tracks.map((t) => t.id),
    (from, to) => project.tracks.splice(to, 0, ...project.tracks.splice(from, 1)),
  )
  let error = $state('')
  let status = $state('')

  export async function add(files: File[]) {
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

  function scaleTempo(track: ProjectTrack, factor: number) {
    if (track.adjust.manualBpm) track.adjust.manualBpm = Number((track.adjust.manualBpm * factor).toFixed(2))
    else track.adjust.factor = Math.min(4, Math.max(0.25, track.adjust.factor * factor))
  }

  const bpmText = (bpm: number | null) => (bpm ? bpm.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–')
</script>

{#snippet picker(primary: boolean)}
  <label class="button" class:primary>
    <Icon name="plus" />
    Musik hinzufügen
    <input
      type="file"
      multiple
      accept=".mp3,audio/*"
      onchange={(e) => {
        add([...e.currentTarget.files!])
        e.currentTarget.value = ''
      }}
    />
  </label>
{/snippet}

<section class="card" aria-label="Musik">
  <div class="step">
    <span class="number">2</span>
    <h3>Musik</h3>
    {#if project.tracks.length}<span class="meta">{project.tracks.length}</span>{/if}
    <span class="spacer"></span>
    {#if project.tracks.length}{@render picker(false)}{/if}
  </div>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if !project.tracks.length && !status}
    <div class="empty">
      <Icon name="music" size={40} />
      <p>Optional: MP3-Dateien hierher ziehen oder auswählen.<br />Dann können die Bilder im Takt wechseln.</p>
      {@render picker(true)}
    </div>
  {:else}
    <ol class="tracks">
      {#each project.tracks as track, index (track.id)}
        {@const bpm = trackBpm(track)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
        <li
          data-sort={track.id}
          tabindex="0"
          aria-label={track.name}
          class:dragging={sortable.dragging === track.id}
          animate:flip={{ duration: SETTLE_MS }}
          onpointerdown={(e) => sortable.pointerdown(e, track.id)}
          onkeydown={(e) => sortable.keydown(e, track.id)}
          oncontextmenu={(e) => e.preventDefault()}
        >
          <div class="head">
            <span class="badge">{index + 1}</span>
            <div class="title">
              <strong>{track.name}</strong>
              <span class="meta">{formatDuration(track.duration)} min · <span data-testid="bpm">{bpmText(bpm)}</span> BPM</span>
            </div>
            <button class="ghost icon danger" onclick={() => remove(track)} aria-label="{track.name} entfernen"><Icon name="trash" /></button>
          </div>

          {#if project.settings.beatSync && bpm}
            {#if project.settings.beatMode === 'beats'}
              <div class="row">
                <label class="inline">
                  Beats pro Bild
                  <input
                    type="number"
                    min="1"
                    max="64"
                    step="1"
                    value={track.beatsPerImage}
                    onchange={(e) => (track.beatsPerImage = Math.min(64, Math.max(1, Math.round(e.currentTarget.valueAsNumber) || 4)))}
                  />
                </label>
                <span class="meta">= {formatSeconds((track.beatsPerImage * 60) / bpm)} pro Bild</span>
              </div>
            {:else}
              <Segmented
                label="Beats pro Bild"
                options={beatOptions(bpm).map((o) => ({ value: o.beats, label: String(o.beats), hint: formatSeconds(o.seconds) }))}
                value={trackBeatsPerImage(track, project.settings)}
                onchange={(beats) => (track.targetBeats = beats)}
              />
            {/if}
          {/if}

          {#if !bpm}
            <p class="error">Kein Tempo erkannt. Trag die BPM unten von Hand ein, sonst gilt für dieses Stück die feste Zeit pro Bild.</p>
          {/if}
          <details open={!bpm}>
            <summary>Tempo korrigieren</summary>
            <div class="row tempo">
              <button onclick={() => scaleTempo(track, 0.5)} disabled={!bpm} aria-label="BPM halbieren">×½</button>
              <button onclick={() => scaleTempo(track, 2)} disabled={!bpm} aria-label="BPM verdoppeln">×2</button>
              <label class="inline">
                BPM von Hand
                <input
                  type="number"
                  min="20"
                  max="400"
                  step="0.1"
                  placeholder="auto"
                  value={track.adjust.manualBpm}
                  onchange={(e) => {
                    const entered = e.currentTarget.valueAsNumber
                    track.adjust.manualBpm = entered >= 20 && entered <= 400 ? entered : null
                    track.targetBeats = null
                  }}
                />
              </label>
              <label class="inline">
                Beat-Versatz (ms)
                <input type="number" step="10" min="-2000" max="2000" value={track.adjust.offsetMs} onchange={(e) => (track.adjust.offsetMs = e.currentTarget.valueAsNumber || 0)} />
              </label>
            </div>
            <p class="meta">Erkennt die Analyse das doppelte oder halbe Tempo, hilft ×½ oder ×2. Der Versatz verschiebt alle Beats.</p>
          </details>
        </li>
      {/each}
    </ol>
    {#if status}<p class="meta analysing" role="status">{status}</p>{/if}
    <p class="meta hint">Die Stücke laufen in dieser Reihenfolge mit 1 s Überblendung und wiederholen sich bei Bedarf. Zum Umsortieren ziehen.</p>
  {/if}
</section>

<style>
  .tracks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.6rem;
  }
  li {
    border: 1px solid var(--border);
    border-radius: var(--radius-small);
    background: var(--surface);
    padding: 0.75rem;
    display: grid;
    gap: 0.75rem;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    transition:
      box-shadow 0.15s,
      scale 0.15s;
  }
  li.dragging {
    cursor: grabbing;
    position: relative;
    z-index: 1;
    scale: 1.02;
    box-shadow:
      0 0 0 3px var(--accent),
      0 12px 30px rgb(0 0 0 / 0.3);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .badge {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    display: grid;
    place-items: center;
    font-weight: 700;
    flex: none;
  }
  .title {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .title strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .inline {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  input[type='number'] {
    width: 5.5rem;
    min-height: 2.5rem;
  }
  details {
    cursor: default;
  }
  summary {
    cursor: pointer;
    color: var(--muted);
    font-size: 0.875rem;
    width: fit-content;
    padding-block: 0.25rem;
  }
  .tempo {
    margin-block: 0.6rem;
  }
  .hint,
  .analysing {
    margin-top: 0.75rem;
  }
</style>
