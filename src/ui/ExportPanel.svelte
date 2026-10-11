<script lang="ts">
  import { i18n } from './i18n.svelte'
  import type { ExportStage } from '../lib/export'
  import type { Project } from '../lib/project/types'
  import { readBlob } from '../lib/storage'
  import type { Timeline } from '../lib/timeline/types'
  import Icon from './Icon.svelte'

  let { project, timeline, disabled }: { project: Project; timeline: Timeline; disabled: boolean } = $props()

  const m = $derived(i18n.m)

  let dialog: HTMLDialogElement
  let running = $state<{ stage: ExportStage | 'prepare'; fraction: number; abort: AbortController }>()
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
        error = m.unsupported
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
      else error = m.exportError(e instanceof Error ? e.message : String(e))
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
  {m.create}
</button>

<dialog bind:this={dialog} onclose={closed} aria-label={m.create}>
  <div class="stack">
    {#if running}
      <h3>{m.exporting}</h3>
      <p role="status">{m.stages[running.stage]} … {Math.round(running.fraction * 100)} %</p>
      <progress max="1" value={running.fraction}></progress>
      <p class="meta">{m.keepOpen}</p>
      <div class="row">
        <span class="spacer"></span>
        <button onclick={() => running?.abort.abort()}>{m.cancel}</button>
      </div>
    {:else if result}
      <h3>{m.done}</h3>
      <!-- svelte-ignore a11y_media_has_caption -->
      <video src={result} controls playsinline></video>
      <p class="meta" role="status">{m.downloadStarted}</p>
      <div class="row">
        <span class="spacer"></span>
        <button onclick={() => dialog.close()}>{m.close}</button>
        <a class="button primary" href={result} download="diashow.mp4"><Icon name="download" /> {m.download}</a>
      </div>
    {:else if error}
      <h3>{m.failed}</h3>
      <p class="error" role="alert">{error}</p>
      <div class="row">
        <span class="spacer"></span>
        <button onclick={() => dialog.close()}>{m.close}</button>
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
