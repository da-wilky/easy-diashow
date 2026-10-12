<script lang="ts">
  import { i18n } from './i18n.svelte'
  import { LIMITS, type Project } from '../lib/project/types'
  import { removeBlob, writeBlob } from '../lib/storage'
  import Icon from './Icon.svelte'
  import { storageError } from './messages'
  import NumberField from './NumberField.svelte'
  import Segmented from './Segmented.svelte'
  import TransitionPicker from './TransitionPicker.svelte'

  const WATERMARK_FILE = 'watermark'

  let { project = $bindable() }: { project: Project } = $props()

  const m = $derived(i18n.m)
  const beatModes = $derived([
    { value: 'beats', label: m.beatsPerImage },
    { value: 'seconds', label: m.targetTime },
  ] as const)
  const resolutions = $derived([
    { value: '1080', label: '1080p', hint: 'Full HD' },
    { value: '720', label: '720p', hint: 'HD' },
    { value: '480', label: '480p', hint: m.small },
  ] as const)
  let error = $state('')
  const hasMusic = $derived(project.tracks.length > 0)

  async function setWatermark(file: File | undefined) {
    if (!file) return
    error = ''
    if (!(await createImageBitmap(file).then((b) => (b.close(), true), () => false))) {
      error = m.unreadableImage(file.name)
      return
    }
    const previous = project.watermark
    // cleared first so that a file of the same name still counts as a change
    project.watermark = null
    try {
      await writeBlob(project.id, WATERMARK_FILE, file)
      project.watermark = file.name
    } catch (e) {
      project.watermark = previous
      error = storageError(e)
    }
  }

  async function removeWatermark() {
    project.watermark = null
    await removeBlob(project.id, WATERMARK_FILE)
  }
</script>

<section class="card stack" aria-label={m.stepStyle}>
  <div class="step">
    <span class="number">3</span>
    <h3>{m.stepStyle}</h3>
  </div>

  <label class="switch" class:disabled={!hasMusic}>
    <input type="checkbox" role="switch" bind:checked={project.settings.beatSync} disabled={!hasMusic} />
    <span class="track" aria-hidden="true"></span>
    <span>
      {m.beatSync}
      <small class="meta">{hasMusic ? m.beatSyncHint : m.needMusic}</small>
    </span>
  </label>

  {#if project.settings.beatSync}
    <Segmented label={m.durationVia} options={beatModes} bind:value={project.settings.beatMode} />
    {#if project.settings.beatMode === 'seconds'}
      <NumberField
        label={m.targetTimePerImage}
        bind:value={
          () => project.settings.targetSeconds,
          (v) => {
            project.settings.targetSeconds = v
            for (const track of project.tracks) track.targetBeats = null
          }
        }
        {...LIMITS.secondsPerImage}
      />
      <p class="meta">{m.targetHint}</p>
    {:else}
      <p class="meta">{m.beatsHint}</p>
    {/if}
  {:else}
    <NumberField label={m.secondsPerImage} bind:value={project.settings.secondsPerImage} {...LIMITS.secondsPerImage} />
  {/if}

  <TransitionPicker bind:value={project.settings.transition} />
  {#if project.settings.transition !== 'none'}
    <NumberField label={m.transitionDuration} bind:value={project.settings.transitionDuration} {...LIMITS.transitionDuration} />
  {/if}
  <NumberField label={m.fadeIn} bind:value={project.settings.fadeIn} {...LIMITS.fadeIn} />
  <NumberField label={m.fadeOut} bind:value={project.settings.fadeOut} {...LIMITS.fadeOut} />
  {#if hasMusic}
    <NumberField label={m.audioCrossfade} bind:value={project.settings.audioCrossfade} {...LIMITS.audioCrossfade} />
  {/if}

  <Segmented label={m.resolution} options={resolutions} bind:value={project.settings.resolution} />

  <div>
    <p class="label">{m.watermark}</p>
    <div class="row">
      <label class="button">
        <Icon name="image" />
        {project.watermark ? m.replaceWatermark : m.chooseWatermark}
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
        <button class="ghost icon danger" onclick={removeWatermark} aria-label={m.removeWatermark}><Icon name="trash" /></button>
        <span class="meta">{project.watermark}</span>
      {/if}
    </div>
    <p class="meta note">{m.watermarkHint}</p>
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
