<script lang="ts">
  import { LIMITS, type Project } from '../lib/project/types'
  import { removeBlob, writeBlob } from '../lib/storage'
  import Icon from './Icon.svelte'
  import { storageError } from './messages'
  import NumberField from './NumberField.svelte'
  import Segmented from './Segmented.svelte'
  import TransitionPicker from './TransitionPicker.svelte'

  const WATERMARK_FILE = 'watermark'
  const BEAT_MODES = [
    { value: 'beats', label: 'Beats pro Bild' },
    { value: 'seconds', label: 'Wunschzeit' },
  ] as const
  const RESOLUTION_OPTIONS = [
    { value: '1080', label: '1080p', hint: 'Full HD' },
    { value: '720', label: '720p', hint: 'HD' },
    { value: '480', label: '480p', hint: 'klein' },
  ] as const

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

<section class="card stack" aria-label="Stil und Timing">
  <div class="step">
    <span class="number">3</span>
    <h3>Stil &amp; Timing</h3>
  </div>

  <label class="switch" class:disabled={!hasMusic}>
    <input type="checkbox" role="switch" bind:checked={project.settings.beatSync} disabled={!hasMusic} />
    <span class="track" aria-hidden="true"></span>
    <span>
      Übergänge auf den Beat legen
      <small class="meta">{hasMusic ? 'Jeder Bildwechsel fällt genau auf einen Schlag der Musik.' : 'Füge zuerst Musik hinzu.'}</small>
    </span>
  </label>

  {#if project.settings.beatSync}
    <Segmented label="Dauer pro Bild festlegen über" options={BEAT_MODES} bind:value={project.settings.beatMode} />
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
      <p class="meta">Die Beat-Anzahl stellst du bei jedem Musikstück ein.</p>
    {/if}
  {:else}
    <NumberField label="Sekunden pro Bild" bind:value={project.settings.secondsPerImage} {...LIMITS.secondsPerImage} />
  {/if}

  <TransitionPicker bind:value={project.settings.transition} />
  {#if project.settings.transition !== 'none'}
    <NumberField label="Dauer des Übergangs" bind:value={project.settings.transitionDuration} {...LIMITS.transitionDuration} />
  {/if}
  <NumberField label="Einblenden aus Schwarz" bind:value={project.settings.fadeIn} {...LIMITS.fadeIn} />
  <NumberField label="Ausblenden nach Schwarz" bind:value={project.settings.fadeOut} {...LIMITS.fadeOut} />

  <Segmented label="Auflösung" options={RESOLUTION_OPTIONS} bind:value={project.settings.resolution} />

  <div>
    <p class="label">Wasserzeichen</p>
    <div class="row">
      <label class="button">
        <Icon name="image" />
        {project.watermark ? 'Wasserzeichen ersetzen' : 'Wasserzeichen wählen'}
        <input
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onchange={(e) => {
            setWatermark(e.currentTarget.files?.[0])
            e.currentTarget.value = ''
          }}
        />
      </label>
      {#if project.watermark}
        <button class="ghost icon danger" onclick={removeWatermark} aria-label="Wasserzeichen entfernen"><Icon name="trash" /></button>
        <span class="meta">{project.watermark}</span>
      {/if}
    </div>
    <p class="meta note">Erscheint klein unten rechts in jedem Bild.</p>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  .switch {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    position: relative;
  }
  .switch.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .switch small {
    display: block;
  }
  .switch input {
    position: absolute;
    opacity: 0;
    width: 3rem;
    height: 1.75rem;
    margin: 0;
    cursor: inherit;
    z-index: 1;
  }
  .track {
    flex: none;
    width: 3rem;
    height: 1.75rem;
    border-radius: 999px;
    background: var(--border);
    position: relative;
    transition: background 0.2s;
  }
  .track::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: calc(1.75rem - 6px);
    height: calc(1.75rem - 6px);
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
    transition: translate 0.2s;
  }
  input:checked + .track {
    background: var(--accent);
  }
  input:checked + .track::after {
    translate: 1.25rem;
  }
  input:focus-visible + .track {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .note {
    margin-top: 0.4rem;
  }
</style>
