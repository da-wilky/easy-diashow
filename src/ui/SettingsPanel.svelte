<script lang="ts">
  import { LIMITS, RESOLUTIONS, type Project } from '../lib/project/types'
  import { removeBlob, writeBlob } from '../lib/storage'
  import { storageError } from './messages'
  import NumberField from './NumberField.svelte'

  const WATERMARK_FILE = 'watermark'

  let { project = $bindable() }: { project: Project } = $props()

  let error = $state('')
  const hasMusic = $derived(project.tracks.length > 0)

  async function setWatermark(file: File | undefined) {
    if (!file) return
    error = ''
    if (!(await createImageBitmap(file).then((b) => (b.close(), true), () => false))) {
      error = `${file.name} konnte nicht als Bild gelesen werden.`
      return
    }
    try {
      await writeBlob(project.id, WATERMARK_FILE, file)
      project.watermark = file.name
    } catch (e) {
      error = storageError(e)
    }
  }

  async function removeWatermark() {
    project.watermark = null
    await removeBlob(project.id, WATERMARK_FILE)
  }
</script>

<section aria-label="Einstellungen">
  <h3>Einstellungen</h3>

  <label class="choice">
    <input type="checkbox" bind:checked={project.settings.beatSync} disabled={!hasMusic} />
    Übergänge auf den Beat legen
  </label>
  {#if !hasMusic}
    <p class="meta">Dafür wird Musik benötigt.</p>
  {/if}

  {#if project.settings.beatSync}
    <fieldset class="row">
      <legend>Dauer pro Bild festlegen über</legend>
      <label class="choice"><input type="radio" bind:group={project.settings.beatMode} value="beats" /> Beats pro Bild</label>
      <label class="choice"><input type="radio" bind:group={project.settings.beatMode} value="seconds" /> Wunschzeit</label>
    </fieldset>
    {#if project.settings.beatMode === 'seconds'}
      <NumberField
        label="Wunschzeit pro Bild"
        bind:value={
          () => project.settings.targetSeconds,
          (v) => {
            project.settings.targetSeconds = v
            for (const track of project.tracks) track.targetBeats = null
          }
        }
        {...LIMITS.secondsPerImage}
      />
      <p class="meta">Bei jedem Musikstück ist die Beat-Anzahl vorgewählt, die der Wunschzeit am nächsten kommt.</p>
    {:else}
      <p class="meta">Die Beat-Anzahl wird bei jedem Musikstück eingestellt.</p>
    {/if}
  {:else}
    <NumberField label="Sekunden pro Bild" bind:value={project.settings.secondsPerImage} {...LIMITS.secondsPerImage} />
  {/if}

  <div class="field">
    <label for="transition">Übergang</label>
    <select id="transition" bind:value={project.settings.transition}>
      <option value="none">Kein Übergang</option>
      <option value="crossfade">Überblenden</option>
      <option value="wipe">Wischen von links nach rechts</option>
      <option value="reveal">Aufdecken von der Mitte nach außen</option>
    </select>
  </div>
  {#if project.settings.transition !== 'none'}
    <NumberField label="Dauer des Übergangs" bind:value={project.settings.transitionDuration} {...LIMITS.transitionDuration} />
  {/if}
  <NumberField label="Einblenden aus Schwarz" bind:value={project.settings.fadeIn} {...LIMITS.fadeIn} />
  <NumberField label="Ausblenden nach Schwarz" bind:value={project.settings.fadeOut} {...LIMITS.fadeOut} />

  <div class="field">
    <label for="resolution">Auflösung</label>
    <select id="resolution" bind:value={project.settings.resolution}>
      {#each Object.entries(RESOLUTIONS) as [id, { width, height }] (id)}
        <option value={id}>{width} × {height}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <span>Wasserzeichen</span>
    <div class="row">
      <label class="button">
        {project.watermark ? 'Wasserzeichen ersetzen' : 'Wasserzeichen wählen'}
        <input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onchange={(e) => {
          setWatermark(e.currentTarget.files?.[0])
          e.currentTarget.value = ''
        }} />
      </label>
      {#if project.watermark}
        <span>{project.watermark}</span>
        <button class="danger" onclick={removeWatermark}>Wasserzeichen entfernen</button>
      {/if}
    </div>
  </div>
  <p class="meta">Das Wasserzeichen erscheint unten rechts, höchstens ein Zehntel der Videobreite und -höhe groß.</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>
