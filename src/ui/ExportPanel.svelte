<script lang="ts">
  import type { ExportStage } from '../lib/export'
  import type { Project } from '../lib/project/types'
  import { readBlob } from '../lib/storage'
  import type { Timeline } from '../lib/timeline/types'

  let { project, timeline, disabled }: { project: Project; timeline: Timeline; disabled: boolean } = $props()

  const STAGES: Record<ExportStage | 'prepare', string> = {
    prepare: 'Export wird vorbereitet',
    decode: 'Musik wird dekodiert',
    video: 'Bilder werden gerendert',
    audio: 'Ton wird kodiert',
    finalize: 'Datei wird fertiggestellt',
  }

  let running = $state<{ stage: keyof typeof STAGES; fraction: number; abort: AbortController }>()
  let error = $state('')
  let result = $state<string>()

  async function create() {
    error = ''
    if (result) URL.revokeObjectURL(result)
    result = undefined
    const abort = new AbortController()
    running = { stage: 'prepare', fraction: 0, abort }
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
      if (!abort.signal.aborted) error = `Die Diashow konnte nicht erstellt werden: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      running = undefined
    }
  }
</script>

<section aria-label="Export">
  {#if running}
    <p role="status">{STAGES[running.stage]} … {Math.round(running.fraction * 100)} %</p>
    <progress max="1" value={running.fraction}></progress>
    <button onclick={() => running?.abort.abort()}>Abbrechen</button>
  {:else}
    <button class="primary" onclick={create} {disabled}>Diashow erstellen</button>
  {/if}
  {#if result}
    <p role="status">Fertig. <a href={result} download="diashow.mp4">diashow.mp4 herunterladen</a></p>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  progress {
    width: 100%;
  }
</style>
