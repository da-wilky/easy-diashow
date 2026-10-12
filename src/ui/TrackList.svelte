<script lang="ts">
  import { i18n } from './i18n.svelte'
  import { flip } from 'svelte/animate'
  import { SAMPLE_RATE, decodeAudio, toMono } from '../lib/audio/decode'
  import { detectSilence } from '../lib/audio/silence'
  import { analyseInWorker } from '../lib/beats'
  import { beatOptions } from '../lib/beats/grid'
  import { trackBeatsPerImage, trackBpm, trackDuration } from '../lib/project/timeline'
  import type { Project, ProjectTrack } from '../lib/project/types'
  import { removeBlob, writeBlob } from '../lib/storage'
  import { formatBpm, formatDuration, formatSeconds } from './format'
  import Icon from './Icon.svelte'
  import ListToolbar from './ListToolbar.svelte'
  import { storageError } from './messages'
  import Segmented from './Segmented.svelte'
  import { Selection } from './selection.svelte'
  import { SETTLE_MS, Sortable } from './sortable.svelte'

  const m = $derived(i18n.m)

  let {
    project = $bindable(),
    pending = $bindable(),
    confirm,
  }: { project: Project; pending: number; confirm: (text: string, action: string) => Promise<boolean> } = $props()

  const ids = () => project.tracks.map((t) => t.id)
  const setOrder = (order: string[]) => {
    const byId = new Map(project.tracks.map((t) => [t.id, t]))
    project.tracks = order.map((id) => byId.get(id)!)
  }
  const selection = new Selection()
  const sortable = new Sortable(ids, selection, setOrder)
  let error = $state('')
  let status = $state('')

  export async function add(files: File[]) {
    error = ''
    pending = pending + 1
    try {
      for (const file of files) {
        status = m.analysing(file.name)
        const buffer = await decodeAudio(file).catch(() => null)
        if (!buffer) {
          error = m.unreadableAudio(file.name)
          continue
        }
        const silence = detectSilence(
          Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c)),
          buffer.sampleRate,
        )
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
          silence,
        })
      }
    } catch (e) {
      error = storageError(e)
    } finally {
      status = ''
      pending = pending - 1
    }
  }

  async function remove(removed: string[]) {
    project.tracks = project.tracks.filter((t) => !removed.includes(t.id))
    if (!project.tracks.length) project.settings.beatSync = false
    for (const id of removed) {
      selection.ids.delete(id)
      await removeBlob(project.id, id)
    }
  }

  async function removeSelected() {
    const block = selection.block(ids())
    if (!(await confirm(m.confirmRemove(m.songs(block.length)), m.removeAction))) return
    await remove(block)
    selection.stop()
  }

  async function removeAll() {
    if (await confirm(m.confirmRemoveAll(m.songs(project.tracks.length)), m.removeAllAction)) await remove(ids())
  }

  function scaleTempo(track: ProjectTrack, factor: number) {
    if (track.adjust.manualBpm) track.adjust.manualBpm = Math.min(400, Math.max(20, Number((track.adjust.manualBpm * factor).toFixed(2))))
    else track.adjust.factor = Math.min(4, Math.max(0.25, track.adjust.factor * factor))
  }
</script>

{#snippet picker(primary: boolean)}
  <label class="button" class:primary>
    <Icon name="plus" />
    {m.addMusic}
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

<section class="card" data-section="music" aria-label={m.stepMusic}>
  <div class="step">
    <span class="number">2</span>
    <h3>{m.stepMusic}</h3>
    {#if project.tracks.length}<span class="meta">{project.tracks.length}</span>{/if}
    <span class="spacer"></span>
    {#if project.tracks.length}{@render picker(false)}{/if}
  </div>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if !project.tracks.length && !status}
    <div class="empty">
      <Icon name="music" size={40} />
      <p>{m.musicEmpty}<br />{m.musicEmptyNote}</p>
      {@render picker(true)}
    </div>
  {:else}
    {#if project.tracks.length}
      <ListToolbar {selection} {ids} {setOrder} onremove={removeSelected} onremoveall={removeAll} removeAllLabel={m.removeAllSongs} />
    {/if}
    <ol class="tracks">
      {#each project.tracks as track, index (track.id)}
        {@const bpm = trackBpm(track)}
        {@const selected = selection.ids.has(track.id)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
        <li
          data-sort={track.id}
          tabindex="0"
          aria-label={track.name}
          class:selected
          class:dragging={sortable.isDragging(track.id)}
          animate:flip={{ duration: SETTLE_MS }}
          onpointerdown={(e) => sortable.pointerdown(e, track.id)}
          onkeydown={(e) => sortable.keydown(e, track.id)}
          onclick={(e) => sortable.click(e, track.id)}
          oncontextmenu={(e) => e.preventDefault()}
        >
          <div class="head">
            {#if selection.active}
              <button
                class="select"
                role="checkbox"
                aria-checked={selected}
                aria-label={m.select(track.name)}
                onclick={(e) => selection.toggle(track.id, ids(), e.shiftKey)}
              >
                {#if selected}<Icon name="check" size={18} />{/if}
              </button>
            {:else}
              <span class="badge">{index + 1}</span>
            {/if}
            <div class="title">
              <strong>{track.name}</strong>
              <span class="meta">{formatDuration(trackDuration(track))} min · <span data-testid="bpm">{formatBpm(bpm)}</span> BPM</span>
            </div>
            <button class="ghost icon danger" onclick={() => remove([track.id])} aria-label={m.remove(track.name)}><Icon name="trash" /></button>
          </div>

          {#if project.settings.beatSync && bpm}
            {#if project.settings.beatMode === 'beats'}
              <div class="row">
                <label class="inline">
                  {m.beatsPerImage}
                  <input
                    type="number"
                    min="1"
                    max="64"
                    step="1"
                    value={track.beatsPerImage}
                    onchange={(e) => (track.beatsPerImage = Math.min(64, Math.max(1, Math.round(e.currentTarget.valueAsNumber) || 4)))}
                  />
                </label>
                <span class="meta">{m.perImage(formatSeconds((track.beatsPerImage * 60) / bpm))}</span>
              </div>
            {:else}
              <Segmented
                label={m.beatsPerImage}
                options={beatOptions(bpm).map((o) => ({ value: o.beats, label: String(o.beats), hint: formatSeconds(o.seconds) }))}
                value={trackBeatsPerImage(track, project.settings)}
                onchange={(beats) => (track.targetBeats = beats)}
              />
            {/if}
            {#if trackBeatsPerImage(track, project.settings) > 1}
              <div class="row">
                <label class="inline">
                  {m.downbeatShift}
                  <input
                    type="number"
                    min="0"
                    max="63"
                    step="1"
                    value={track.adjust.downbeat ?? 0}
                    onchange={(e) => (track.adjust.downbeat = Math.min(63, Math.max(0, Math.round(e.currentTarget.valueAsNumber) || 0)))}
                  />
                  {m.beats}
                </label>
                <span class="meta">{m.downbeatHint}</span>
              </div>
            {/if}
          {/if}

          {#if track.silence && track.silence.start + track.silence.end > 0}
            <label class="inline trim">
              <input type="checkbox" checked={track.trimSilence !== false} onchange={(e) => (track.trimSilence = e.currentTarget.checked)} />
              {m.trimSilence(formatSeconds(track.silence.start), formatSeconds(track.silence.end))}
            </label>
          {/if}

          {#if !bpm}
            <p class="error">{m.noTempo}</p>
          {/if}
          <details open={!bpm}>
            <summary>{m.fixTempo}</summary>
            <div class="row tempo">
              <button onclick={() => scaleTempo(track, 0.5)} disabled={!bpm} aria-label={m.halveBpm}>×½</button>
              <button onclick={() => scaleTempo(track, 2)} disabled={!bpm} aria-label={m.doubleBpm}>×2</button>
              <label class="inline">
                {m.manualBpm}
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
                {m.beatOffset}
                <input type="number" step="10" min="-2000" max="2000" value={track.adjust.offsetMs} onchange={(e) => (track.adjust.offsetMs = Math.min(2000, Math.max(-2000, e.currentTarget.valueAsNumber || 0)))} />
              </label>
            </div>
            <p class="meta">{m.tempoHint}</p>
          </details>
        </li>
      {/each}
    </ol>
    {#if status}<p class="meta analysing" role="status">{status}</p>{/if}
    <p class="meta hint">{selection.active ? m.selectHint : m.musicHint}</p>
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
  .badge,
  .select {
    width: 2.5rem;
    height: 2.5rem;
    min-height: 2.5rem;
    padding: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 700;
    flex: none;
  }
  .badge {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .select {
    border: 2px solid var(--muted);
    background: transparent;
  }
  .select[aria-checked='true'] {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  li.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
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
  .trim {
    color: var(--muted);
    cursor: pointer;
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
