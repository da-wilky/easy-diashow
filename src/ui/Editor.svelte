<script lang="ts">
  import { projectTimeline } from '../lib/project/timeline'
  import type { Project } from '../lib/project/types'
  import { saveProject } from '../lib/storage'
  import { MAX_VIDEO_SECONDS } from '../lib/timeline/types'
  import ExportPanel from './ExportPanel.svelte'
  import { formatDuration } from './format'
  import ImageGrid from './ImageGrid.svelte'
  import { storageError } from './messages'
  import SettingsPanel from './SettingsPanel.svelte'
  import TrackList from './TrackList.svelte'

  let { initial, onclose }: { initial: Project; onclose: () => void } = $props()

  // svelte-ignore state_referenced_locally
  let project = $state($state.snapshot(initial))
  let pending = $state(0)
  let saved = $state(true)
  let saveError = $state('')

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
  const musicSeconds = $derived(project.tracks.reduce((sum, t) => sum + t.duration, 0))
  const tooLong = $derived(timeline.duration > MAX_VIDEO_SECONDS)
</script>

<div class="row">
  <button onclick={onclose}>Zur Projektliste</button>
  <span class="meta" role="status">{saveError || (saved ? 'Alle Änderungen gespeichert' : 'Speichert …')}</span>
</div>
<h2>{project.name}</h2>

<ImageGrid bind:project bind:pending />
<TrackList bind:project bind:pending />
<SettingsPanel bind:project />

<section aria-label="Zusammenfassung" class="summary">
  <p>
    Länge des Videos: <strong data-testid="video-duration">{formatDuration(timeline.duration)} min</strong>
    {#if project.tracks.length}· Länge der Musik: <strong>{formatDuration(musicSeconds)} min</strong>{/if}
  </p>
  {#if tooLong}
    <p class="error" role="alert">
      Das Video wäre länger als {MAX_VIDEO_SECONDS / 60} Minuten. Bitte weniger Bilder oder eine kürzere Zeit pro Bild wählen.
    </p>
  {/if}
  <ExportPanel {project} {timeline} disabled={pending > 0 || !project.images.length || tooLong} />
</section>

<style>
  .summary {
    position: sticky;
    bottom: 0;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding-block: 0.75rem;
  }
</style>
