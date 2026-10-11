<script lang="ts">
  import { onDestroy } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import type { Project, ProjectImage } from '../lib/project/types'
  import { makeThumbnail, thumbnailName } from '../lib/render/thumbnail'
  import { readBlob, removeBlob, writeBlob } from '../lib/storage'
  import { storageError } from './messages'

  let { project = $bindable(), pending = $bindable() }: { project: Project; pending: number } = $props()

  const thumbnails = new SvelteMap<string, string>()
  const collator = new Intl.Collator(undefined, { numeric: true })
  const byName = (a: ProjectImage, b: ProjectImage) => collator.compare(a.name, b.name)
  let error = $state('')
  let dragging = $state<string>()
  let dropTarget = $state(false)

  for (const { id } of project.images)
    readBlob(project.id, thumbnailName(id)).then((blob) => thumbnails.set(id, URL.createObjectURL(blob)))
  onDestroy(() => thumbnails.forEach((url) => URL.revokeObjectURL(url)))

  async function add(files: Iterable<File>) {
    error = ''
    pending = pending + 1
    const added: ProjectImage[] = []
    try {
      for (const file of files) {
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

  function startDrag(event: PointerEvent, id: string) {
    const target = event.target as Element
    if (event.button !== 0 || target.closest('button')) return
    // touches outside the handle must keep scrolling the page
    if (event.pointerType === 'touch' && !target.closest('.handle')) return
    event.preventDefault()
    dragging = id
  }

  function drag(event: PointerEvent) {
    if (!dragging) return
    const over = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-image]')?.dataset.image
    if (!over || over === dragging) return
    const from = project.images.findIndex((i) => i.id === dragging)
    const to = project.images.findIndex((i) => i.id === over)
    project.images.splice(to, 0, ...project.images.splice(from, 1))
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    dropTarget = false
    if (event.dataTransfer?.files.length) add(event.dataTransfer.files)
  }
</script>

<svelte:window onpointermove={drag} onpointerup={() => (dragging = undefined)} onpointercancel={() => (dragging = undefined)} />

<section
  class:dropTarget
  aria-label="Bilder"
  ondragover={(e) => {
    e.preventDefault()
    dropTarget = true
  }}
  ondragleave={() => (dropTarget = false)}
  ondrop={drop}
>
  <h3>Bilder <span class="meta">({project.images.length})</span></h3>
  <div class="row">
    <label class="button">
      Bilder hinzufügen
      <input type="file" multiple accept=".png,.jpg,.jpeg,image/png,image/jpeg" onchange={(e) => {
        add([...e.currentTarget.files!])
        e.currentTarget.value = ''
      }} />
    </label>
    <button onclick={() => project.images.sort(byName)} disabled={project.images.length < 2}>Nach Name sortieren</button>
  </div>
  <p class="meta">PNG oder JPG, auch per Ziehen und Ablegen. Reihenfolge durch Ziehen der Bilder ändern (am Touchscreen am Griff ⠿).</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <ol class="grid">
    {#each project.images as image, index (image.id)}
      <li data-image={image.id} class:dragging={dragging === image.id} onpointerdown={(e) => startDrag(e, image.id)}>
        <img src={thumbnails.get(image.id)} alt={image.name} draggable="false" />
        <span class="handle" aria-hidden="true">⠿</span>
        <button class="remove" onclick={() => remove(image)} aria-label="{image.name} entfernen">✕</button>
        <span class="caption">{index + 1}. {image.name}</span>
      </li>
    {/each}
  </ol>
</section>

<style>
  .dropTarget {
    outline: 2px dashed var(--accent);
    outline-offset: 0.25rem;
  }
  .grid {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: 0.5rem;
  }
  li {
    position: relative;
    background: black;
    border-radius: 0.4rem;
    overflow: hidden;
    cursor: grab;
    user-select: none;
  }
  li.dragging {
    outline: 3px solid var(--accent);
    opacity: 0.7;
  }
  img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: contain;
  }
  .caption {
    display: block;
    padding: 0.15rem 0.4rem;
    font-size: 0.75rem;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .handle,
  .remove {
    position: absolute;
    top: 0.25rem;
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    border-radius: 0.3rem;
    background: rgb(0 0 0 / 0.6);
    color: white;
  }
  .handle {
    left: 0.25rem;
    touch-action: none;
  }
  .remove {
    right: 0.25rem;
  }
</style>
