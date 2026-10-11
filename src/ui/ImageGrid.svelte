<script lang="ts">
  import { onDestroy } from 'svelte'
  import { flip } from 'svelte/animate'
  import { SvelteMap } from 'svelte/reactivity'
  import type { Project, ProjectImage } from '../lib/project/types'
  import { makeThumbnail, thumbnailName } from '../lib/render/thumbnail'
  import { readBlob, removeBlob, writeBlob } from '../lib/storage'
  import Icon from './Icon.svelte'
  import { storageError } from './messages'
  import { SETTLE_MS, Sortable } from './sortable.svelte'

  let { project = $bindable(), pending = $bindable() }: { project: Project; pending: number } = $props()

  const thumbnails = new SvelteMap<string, string>()
  const collator = new Intl.Collator(undefined, { numeric: true })
  const byName = (a: ProjectImage, b: ProjectImage) => collator.compare(a.name, b.name)
  const sortable = new Sortable(
    () => project.images.map((i) => i.id),
    (from, to) => project.images.splice(to, 0, ...project.images.splice(from, 1)),
  )
  let error = $state('')
  let adding = $state(0)

  for (const { id } of project.images)
    readBlob(project.id, thumbnailName(id)).then((blob) => thumbnails.set(id, URL.createObjectURL(blob)))
  onDestroy(() => thumbnails.forEach((url) => URL.revokeObjectURL(url)))

  export async function add(files: File[]) {
    error = ''
    pending = pending + 1
    adding += files.length
    const added: ProjectImage[] = []
    try {
      for (const file of files) {
        adding--
        if (!/\.(png|jpe?g)$/i.test(file.name)) {
          error = `${file.name}: Nur PNG- und JPG-Bilder werden unterstützt.`
          continue
        }
        const thumbnail = await makeThumbnail(file).catch(() => null)
        if (!thumbnail) {
          error = `${file.name} konnte nicht als Bild gelesen werden.`
          continue
        }
        const id = crypto.randomUUID()
        await writeBlob(project.id, thumbnailName(id), thumbnail)
        await writeBlob(project.id, id, file)
        thumbnails.set(id, URL.createObjectURL(thumbnail))
        added.push({ id, name: file.name })
      }
    } catch (e) {
      error = storageError(e)
    } finally {
      adding = 0
      project.images.push(...added.sort(byName))
      pending = pending - 1
    }
  }

  async function remove(image: ProjectImage) {
    project.images = project.images.filter((i) => i.id !== image.id)
    URL.revokeObjectURL(thumbnails.get(image.id) ?? '')
    thumbnails.delete(image.id)
    await removeBlob(project.id, image.id)
    await removeBlob(project.id, thumbnailName(image.id))
  }
</script>

{#snippet picker(primary: boolean)}
  <label class="button" class:primary>
    <Icon name="plus" />
    Bilder hinzufügen
    <input
      type="file"
      multiple
      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
      onchange={(e) => {
        add([...e.currentTarget.files!])
        e.currentTarget.value = ''
      }}
    />
  </label>
{/snippet}

<section class="card" aria-label="Bilder">
  <div class="step">
    <span class="number">1</span>
    <h3>Bilder</h3>
    {#if project.images.length}<span class="meta">{project.images.length}</span>{/if}
    <span class="spacer"></span>
    {#if project.images.length}
      <button class="ghost" onclick={() => project.images.sort(byName)} disabled={project.images.length < 2}>
        <Icon name="sort" />
        Nach Name sortieren
      </button>
      {@render picker(false)}
    {/if}
  </div>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if !project.images.length && !adding}
    <div class="empty">
      <Icon name="image" size={40} />
      <p>Zieh deine Fotos hierher oder wähle sie aus.<br />PNG und JPG, sortiert nach Dateiname.</p>
      {@render picker(true)}
    </div>
  {:else}
    <ol class="grid">
      {#each project.images as image, index (image.id)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
        <li
          data-sort={image.id}
          tabindex="0"
          aria-label="{index + 1}. {image.name}"
          class:dragging={sortable.dragging === image.id}
          animate:flip={{ duration: SETTLE_MS }}
          onpointerdown={(e) => sortable.pointerdown(e, image.id)}
          onkeydown={(e) => sortable.keydown(e, image.id)}
          oncontextmenu={(e) => e.preventDefault()}
        >
          <img src={thumbnails.get(image.id)} alt={image.name} draggable="false" />
          <span class="index">{index + 1}</span>
          <button class="remove" onclick={() => remove(image)} aria-label="{image.name} entfernen"><Icon name="x" size={16} /></button>
          <span class="caption">{image.name}</span>
        </li>
      {/each}
      {#each { length: adding }, i (i)}
        <li class="placeholder" aria-hidden="true"></li>
      {/each}
    </ol>
    <p class="meta hint">Zum Umsortieren ziehen · am Touchscreen kurz gedrückt halten · mit Tastatur: Pfeiltasten</p>
  {/if}
</section>

<style>
  .grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: 0.6rem;
  }
  li {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #000;
    border-radius: var(--radius-small);
    overflow: hidden;
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
    z-index: 1;
    scale: 1.06;
    box-shadow:
      0 0 0 3px var(--accent),
      0 12px 30px rgb(0 0 0 / 0.4);
  }
  li.placeholder {
    cursor: default;
    background: var(--surface-2);
    animation: pulse 1.2s infinite alternate;
  }
  @keyframes pulse {
    to {
      opacity: 0.4;
    }
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
  .index {
    position: absolute;
    top: 0.35rem;
    left: 0.35rem;
    min-width: 1.5rem;
    height: 1.5rem;
    padding: 0 0.35rem;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.65);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    display: grid;
    place-items: center;
  }
  .caption {
    position: absolute;
    inset: auto 0 0 0;
    padding: 1.2rem 0.5rem 0.3rem;
    background: linear-gradient(transparent, rgb(0 0 0 / 0.75));
    color: #fff;
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .remove {
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
    width: 2rem;
    min-height: 2rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgb(0 0 0 / 0.65);
    color: #fff;
    opacity: 0;
  }
  li:hover .remove,
  li:focus-within .remove {
    opacity: 1;
  }
  @media (hover: none) {
    .remove {
      opacity: 1;
    }
  }
  .hint {
    margin-top: 0.75rem;
  }
</style>
