<script lang="ts">
  import { i18n } from './i18n.svelte'
  import { onDestroy } from 'svelte'
  import { flip } from 'svelte/animate'
  import { SvelteMap } from 'svelte/reactivity'
  import type { Project } from '../lib/project/types'
  import { makeThumbnail, thumbnailName } from '../lib/render/thumbnail'
  import { readBlob, removeBlob, writeBlob } from '../lib/storage'
  import Icon from './Icon.svelte'
  import ListToolbar from './ListToolbar.svelte'
  import { storageError } from './messages'
  import { Selection } from './selection.svelte'
  import { SETTLE_MS, Sortable } from './sortable.svelte'

  const m = $derived(i18n.m)

  let {
    project = $bindable(),
    pending = $bindable(),
    confirm,
  }: { project: Project; pending: number; confirm: (text: string, action: string) => Promise<boolean> } = $props()

  const thumbnails = new SvelteMap<string, string>()
  const collator = new Intl.Collator(undefined, { numeric: true })
  const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name)
  const ids = () => project.images.map((i) => i.id)
  const setOrder = (order: string[]) => {
    const byId = new Map(project.images.map((i) => [i.id, i]))
    project.images = order.map((id) => byId.get(id)!)
  }
  const selection = new Selection()
  const sortable = new Sortable(ids, selection, setOrder)
  let error = $state('')
  let adding = $state(0)

  for (const { id } of project.images)
    readBlob(project.id, thumbnailName(id)).then((blob) => thumbnails.set(id, URL.createObjectURL(blob)))
  onDestroy(() => thumbnails.forEach((url) => URL.revokeObjectURL(url)))

  export async function add(files: File[]) {
    error = ''
    pending = pending + 1
    adding += files.length
    let id = ''
    try {
      for (const file of files.toSorted(byName)) {
        adding--
        if (!/\.(png|jpe?g)$/i.test(file.name)) {
          error = m.onlyImages(file.name)
          continue
        }
        const thumbnail = await makeThumbnail(file).catch(() => null)
        if (!thumbnail) {
          error = m.unreadableImage(file.name)
          continue
        }
        id = crypto.randomUUID()
        await writeBlob(project.id, thumbnailName(id), thumbnail)
        await writeBlob(project.id, id, file)
        thumbnails.set(id, URL.createObjectURL(thumbnail))
        // recorded at once, so a reload during a long upload leaves no files without an entry
        project.images.push({ id, name: file.name })
      }
    } catch (e) {
      error = storageError(e)
      await Promise.allSettled([removeBlob(project.id, id), removeBlob(project.id, thumbnailName(id))])
    } finally {
      adding = 0
      pending = pending - 1
    }
  }

  async function remove(removed: string[]) {
    project.images = project.images.filter((i) => !removed.includes(i.id))
    for (const id of removed) {
      selection.ids.delete(id)
      URL.revokeObjectURL(thumbnails.get(id) ?? '')
      thumbnails.delete(id)
      await removeBlob(project.id, id)
      await removeBlob(project.id, thumbnailName(id))
    }
  }

  async function removeSelected() {
    const block = selection.block(ids())
    if (!(await confirm(m.confirmRemove(m.images(block.length)), m.removeAction))) return
    await remove(block)
    selection.stop()
  }

  async function removeAll() {
    if (await confirm(m.confirmRemoveAll(m.images(project.images.length)), m.removeAllAction)) await remove(ids())
  }

  async function sortByName() {
    if (await confirm(m.confirmSort, m.sortAction))
      project.images.sort(byName)
  }
</script>

{#snippet picker(primary: boolean)}
  <label class="button" class:primary>
    <Icon name="plus" />
    {m.addImages}
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

<section class="card" data-section="images" aria-label={m.stepImages}>
  <div class="step">
    <span class="number">1</span>
    <h3>{m.stepImages}</h3>
    {#if project.images.length}<span class="meta">{project.images.length}</span>{/if}
    <span class="spacer"></span>
    {#if project.images.length}{@render picker(false)}{/if}
  </div>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if !project.images.length && !adding}
    <div class="empty">
      <Icon name="image" size={40} />
      <p>{m.imagesEmpty}<br />{m.imagesEmptyNote}</p>
      {@render picker(true)}
    </div>
  {:else}
    <ListToolbar {selection} {ids} {setOrder} onremove={removeSelected} onremoveall={removeAll} removeAllLabel={m.removeAllImages} onsort={sortByName} />
    <ol class="grid" class:selecting={selection.active}>
      {#each project.images as image, index (image.id)}
        {@const selected = selection.ids.has(image.id)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
        <li
          data-sort={image.id}
          tabindex="0"
          aria-label="{index + 1}. {image.name}"
          class:selected
          class:dragging={sortable.isDragging(image.id)}
          animate:flip={{ duration: SETTLE_MS }}
          onpointerdown={(e) => sortable.pointerdown(e, image.id)}
          onkeydown={(e) => sortable.keydown(e, image.id)}
          onclick={(e) => sortable.click(e, image.id)}
          oncontextmenu={(e) => e.preventDefault()}
        >
          <img src={thumbnails.get(image.id)} alt={image.name} draggable="false" />
          {#if selection.active}
            <button
              class="select"
              role="checkbox"
              aria-checked={selected}
              aria-label={m.select(image.name)}
              onclick={(e) => selection.toggle(image.id, ids(), e.shiftKey)}
            >
              {#if selected}<Icon name="check" size={16} />{/if}
            </button>
          {:else}
            <button class="remove" onclick={() => remove([image.id])} aria-label={m.remove(image.name)}><Icon name="x" size={16} /></button>
          {/if}
          <span class="caption">{index + 1} · {image.name}</span>
        </li>
      {/each}
      {#each { length: adding }, i (i)}
        <li class="placeholder" aria-hidden="true"></li>
      {/each}
    </ol>
    <p class="meta hint">
      {selection.active ? m.selectHint : m.imagesHint}
    </p>
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
  .selecting li {
    cursor: pointer;
  }
  li.selected {
    box-shadow: 0 0 0 3px var(--accent);
  }
  li.selected img {
    opacity: 0.75;
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
    pointer-events: none;
  }
  .select,
  .remove {
    position: absolute;
    top: 0.3rem;
    width: 2rem;
    min-height: 2rem;
    padding: 0;
    border-radius: 50%;
    color: #fff;
  }
  .select {
    left: 0.3rem;
    border: 2px solid #fff;
    background: rgb(0 0 0 / 0.35);
  }
  .select[aria-checked='true'] {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .remove {
    right: 0.3rem;
    border: none;
    background: rgb(0 0 0 / 0.65);
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
