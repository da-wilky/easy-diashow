<script lang="ts">
  import type { ExportStage } from '../lib/export'
  import type { Project } from '../lib/project/types'
  import { readBlob } from '../lib/storage'
  import type { Timeline } from '../lib/timeline/types'
  import Icon from './Icon.svelte'

  let { project, timeline, disabled }: { project: Project; timeline: Timeline; disabled: boolean } = $props()

  const STAGES: Record<ExportStage | 'prepare', string> = {
    prepare: 'Export wird vorbereitet',
    decode: 'Musik wird dekodiert',
    video: 'Bilder werden gerendert',
    audio: 'Ton wird kodiert',
    finalize: 'Datei wird fertiggestellt',
  }

  let dialog: HTMLDialogElement
  let running = $state<{ stage: keyof typeof STAGES; fraction: number; abort: AbortController }>()
  let error = $state('')
  let result = $state<string>()

  async function create() {
    error = ''
    const abort = new AbortController()
    running = { stage: 'prepare', fraction: 0, abort }
    dialog.showModal()
    try {
      const { checkExportSupport } = await import('../lib/export/support')
      const support = await checkExportSupport(timeline.width, timeline.height)
      if (!support.video || !support.audio) {
        error =
          'Dieser Browser kann kein MP4-Video (H.264/AAC) erzeugen. Bitte eine aktuelle Version von Chrome, Edge, Safari oder Firefox auf einem Computer verwenden.'
        return
      }
      const { exportVideo } = await import('../lib/export')
      const load = async (ids: string[]) =>
        new Map(await Promise.all(ids.map(async (id) => [id, await readBlob(project.id, id)] as const)))
      const video = await exportVideo(
        {
          timeline,
          images: await load(project.images.map((i) => i.id)),
          tracks: await load(project.tracks.map((t) => t.id)),
          watermark: project.watermark ? await readBlob(project.id, 'watermark') : null,
        },
        (stage, fraction) => (running = { stage, fraction, abort }),
        abort.signal,
      )
      result = URL.createObjectURL(video)
      const link = document.createElement('a')
      link.href = result
      link.download = 'diashow.mp4'
      link.click()
    } catch (e) {
      if (abort.signal.aborted) dialog.close()
      else error = `Die Diashow konnte nicht erstellt werden: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      running = undefined
    }
  }

  function closed() {
    running?.abort.abort()
    if (result) URL.revokeObjectURL(result)
    result = undefined
    error = ''
  }
</script>

<button class="primary create" onclick={create} {disabled}>
  <Icon name="film" />
  Diashow erstellen
</button>

<dialog bind:this={dialog} onclose={closed} aria-label="Diashow erstellen">
  <div class="stack">
    {#if running}
      <h3>Deine Diashow entsteht …</h3>
      <p role="status">{STAGES[running.stage]} … {Math.round(running.fraction * 100)} %</p>
      <progress max="1" value={running.fraction}></progress>
      <p class="meta">Alles wird auf diesem Gerät berechnet. Lass dieses Fenster so lange geöffnet.</p>
      <div class="row">
        <span class="spacer"></span>
        <button onclick={() => running?.abort.abort()}>Abbrechen</button>
      </div>
    {:else if result}
      <h3>Fertig!</h3>
      <!-- svelte-ignore a11y_media_has_caption -->
      <video src={result} controls playsinline></video>
      <p class="meta" role="status">Der Download wurde gestartet.</p>
      <div class="row">
        <span class="spacer"></span>
        <button onclick={() => dialog.close()}>Schließen</button>
        <a class="button primary" href={result} download="diashow.mp4"><Icon name="download" /> diashow.mp4 herunterladen</a>
      </div>
    {:else if error}
      <h3>Das hat nicht geklappt</h3>
      <p class="error" role="alert">{error}</p>
      <div class="row">
        <span class="spacer"></span>
        <button onclick={() => dialog.close()}>Schließen</button>
      </div>
    {/if}
  </div>
</dialog>

<style>
  .create {
    min-height: 3rem;
    padding-inline: 1.4rem;
  }
  video {
    width: 100%;
    border-radius: var(--radius-small);
    background: #000;
  }
  a.button {
    text-decoration: none;
  }
</style>
