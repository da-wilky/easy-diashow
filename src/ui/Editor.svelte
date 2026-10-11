<script lang="ts">
  import { i18n } from './i18n.svelte'
  import { projectTimeline, trackDuration } from '../lib/project/timeline'
  import { DEFAULT_SETTINGS, type Project } from '../lib/project/types'
  import { saveProject } from '../lib/storage'
  import { MAX_VIDEO_SECONDS } from '../lib/timeline/types'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import ExportPanel from './ExportPanel.svelte'
  import { formatDuration } from './format'
  import Icon from './Icon.svelte'
  import ImageGrid from './ImageGrid.svelte'
  import { storageError } from './messages'
  import Preview from './Preview.svelte'
  import SettingsPanel from './SettingsPanel.svelte'
  import TrackList from './TrackList.svelte'

  const m = $derived(i18n.m)

  let { initial, onclose }: { initial: Project; onclose: () => void } = $props()

  // svelte-ignore state_referenced_locally
  let project = $state({ ...$state.snapshot(initial), settings: { ...DEFAULT_SETTINGS, ...$state.snapshot(initial).settings } })
  let pending = $state(0)
  let saved = $state(true)
  let saveError = $state('')
  let fileDrag = $state(false)
  let images: ImageGrid
  let tracks: TrackList
  let dialog: ConfirmDialog
  const confirm = (text: string, action: string) => dialog.ask(text, action)

  let loaded = false
  $effect(() => {
    const snapshot = $state.snapshot(project)
    if (!loaded) {
      loaded = true
      return
    }
    saved = false
    saveProject({ ...snapshot, modified: Date.now() }).then(
      () => {
        saved = true
        saveError = ''
      },
      (e) => (saveError = storageError(e)),
    )
  })

  const timeline = $derived(projectTimeline(project))
  const musicSeconds = $derived(project.tracks.reduce((sum, t) => sum + trackDuration(t), 0))
  const tooLong = $derived(timeline.duration > MAX_VIDEO_SECONDS)

  const carriesFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

  function drop(event: DragEvent) {
    if (!carriesFiles(event)) return
    event.preventDefault()
    fileDrag = false
    const files = [...event.dataTransfer!.files]
    const isAudio = (file: File) => file.type.startsWith('audio/') || /\.mp3$/i.test(file.name)
    const audio = files.filter(isAudio)
    const rest = files.filter((f) => !isAudio(f))
    if (audio.length) tracks.add(audio)
    if (rest.length) images.add(rest)
  }
</script>

<svelte:window
  ondragenter={(e) => (fileDrag ||= carriesFiles(e))}
  ondragover={(e) => {
    if (carriesFiles(e)) e.preventDefault()
  }}
  ondragleave={(e) => {
    if (!e.relatedTarget) fileDrag = false
  }}
  ondrop={drop}
/>

<div class="titlebar">
  <button class="ghost icon" onclick={onclose} aria-label={m.backToProjects}><Icon name="back" /></button>
  <h2>{project.name}</h2>
  <span class="meta saved" class:error={saveError} role="status">
    {#if saveError}
      {saveError}
    {:else if saved}
      <Icon name="check" size={16} /> <span class="text">{m.saved}</span>
    {:else}
      {m.saving}
    {/if}
  </span>
</div>

<div class="layout">
  <div class="stack">
    <ImageGrid bind:this={images} bind:project bind:pending {confirm} />
    <TrackList bind:this={tracks} bind:project bind:pending {confirm} />
  </div>
  <aside>
    <Preview {project} {timeline} />
    <div class="settings"><SettingsPanel bind:project /></div>
  </aside>
</div>

<div class="bar">
  <div class="inner">
    <div class="stats">
      <span>{m.video} <strong data-testid="video-duration">{formatDuration(timeline.duration)} min</strong></span>
      {#if project.tracks.length}
        <span>{m.music} <strong>{formatDuration(musicSeconds)} min</strong></span>
        {#if musicSeconds < timeline.duration}<span class="meta">{m.musicRepeats}</span>{/if}
      {/if}
      {#if tooLong}
        <span class="error" role="alert">{m.tooLong(MAX_VIDEO_SECONDS / 60)}</span>
      {/if}
    </div>
    <ExportPanel {project} {timeline} disabled={pending > 0 || !project.images.length || tooLong} />
  </div>
</div>

<ConfirmDialog bind:this={dialog} />

{#if fileDrag}
  <div class="veil" aria-hidden="true">
    <div><Icon name="plus" size={40} /> {m.dropHere}</div>
  </div>
{/if}

<style>
  .titlebar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .titlebar h2 {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .saved {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  @media (max-width: 40rem) {
    .saved .text {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  }
  .layout {
    display: grid;
    gap: 1rem;
    padding-bottom: calc(var(--bar-height) + 1.5rem);
    align-items: start;
  }
  .layout > * {
    min-width: 0;
  }
  aside {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .settings {
    min-height: 0;
  }
  @media (min-width: 62rem) {
    .layout {
      grid-template-columns: minmax(0, 1fr) 24rem;
    }
    aside {
      position: sticky;
      top: 0.75rem;
      max-height: calc(100vh - var(--bar-height) - 1.5rem);
    }
    .settings {
      overflow-y: auto;
      border-radius: var(--radius);
    }
  }
  .bar {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 3;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
  }
  .inner {
    max-width: 76rem;
    margin: 0 auto;
    min-height: var(--bar-height);
    padding: 0.6rem 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .stats {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 1rem;
  }
  .veil {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--accent) 30%, transparent);
    backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .veil div {
    background: var(--surface);
    border: 2px dashed var(--accent);
    border-radius: var(--radius);
    padding: 2rem 2.5rem;
    display: grid;
    justify-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }
</style>
