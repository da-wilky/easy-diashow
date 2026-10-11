<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { Project } from '../lib/project/types'
  import { thumbnailName } from '../lib/render/thumbnail'
  import {
    createProject,
    deleteEverything,
    deleteProject,
    listProjects,
    loadProject,
    projectSize,
    readBlob,
    saveProject,
    storageStatus,
  } from '../lib/storage'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import { formatBytes, formatDate } from './format'
  import Icon from './Icon.svelte'

  const COVER_IMAGES = 3

  let { onopen }: { onopen: (project: Project) => void } = $props()

  let projects = $state<{ project: Project; size: number; covers: string[] }[]>([])
  let storage = $state<Awaited<ReturnType<typeof storageStatus>>>()
  let newName = $state('')
  let renaming = $state<{ id: string; name: string }>()
  let confirm: ConfirmDialog

  const revokeCovers = () => projects.forEach((p) => p.covers.forEach((url) => URL.revokeObjectURL(url)))
  onDestroy(revokeCovers)

  async function refresh() {
    const loaded = await Promise.all(
      (await listProjects()).map(async (project) => ({
        project,
        size: await projectSize(project.id),
        covers: await Promise.all(
          project.images.slice(0, COVER_IMAGES).map(async (i) => URL.createObjectURL(await readBlob(project.id, thumbnailName(i.id)))),
        ),
      })),
    )
    revokeCovers()
    projects = loaded
    storage = await storageStatus()
  }
  refresh()

  async function create(event: SubmitEvent) {
    event.preventDefault()
    onopen(await createProject(newName.trim() || 'Neues Projekt'))
  }

  async function rename(event: SubmitEvent) {
    event.preventDefault()
    const { id, name } = renaming!
    renaming = undefined
    if (!name.trim()) return
    await saveProject({ ...(await loadProject(id))!, name: name.trim(), modified: Date.now() })
    await refresh()
  }

  async function remove(project: Project) {
    if (!(await confirm.ask(`Projekt „${project.name}“ mit allen Bildern und Musikstücken löschen?`, 'Löschen'))) return
    await deleteProject(project.id)
    await refresh()
  }

  async function removeAll() {
    if (!(await confirm.ask('Wirklich alle Projekte und alle auf diesem Gerät gespeicherten Daten löschen?', 'Alles löschen'))) return
    await deleteEverything()
    await refresh()
  }

  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
</script>

<section class="hero">
  <h2>Aus Fotos und Musik wird ein Video</h2>
  <p class="meta">Bilder im Takt der Musik, fertig als MP4. Alles bleibt auf deinem Gerät.</p>
  <form onsubmit={create} class="row">
    <input bind:value={newName} placeholder="Name des Projekts" aria-label="Name des Projekts" />
    <button type="submit" class="primary"><Icon name="plus" /> Neues Projekt</button>
  </form>
</section>

<section>
  <h2 class="heading">Projekte</h2>
  {#if projects.length}
    <ul class="projects">
      {#each projects as { project, size, covers } (project.id)}
        <li class="card">
          <button class="cover" onclick={() => onopen(project)} aria-label="{project.name} öffnen">
            {#each covers as url (url)}
              <img src={url} alt="" />
            {:else}
              <Icon name="image" size={36} />
            {/each}
          </button>
          <div class="info">
            <div class="name">
              {#if renaming?.id === project.id}
                <form onsubmit={rename}>
                  <input
                    bind:value={renaming.name}
                    aria-label="Neuer Name"
                    onblur={() => (renaming = undefined)}
                    onkeydown={(e) => e.key === 'Escape' && (renaming = undefined)}
                    {@attach (input) => input.select()}
                  />
                </form>
              {:else}
                <strong>{project.name}</strong>
              {/if}
              <div class="actions">
                <button class="ghost icon" onclick={() => (renaming = { id: project.id, name: project.name })} aria-label="{project.name} umbenennen">
                  <Icon name="pencil" />
                </button>
                <button class="ghost icon danger" onclick={() => remove(project)} aria-label="{project.name} löschen"><Icon name="trash" /></button>
              </div>
            </div>
            <span class="meta">
              {count(project.images.length, 'Bild', 'Bilder')} · {count(project.tracks.length, 'Musikstück', 'Musikstücke')} · {formatBytes(size)}
            </span>
            <span class="meta">Geändert {formatDate(project.modified)}</span>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="empty">
      <Icon name="film" size={40} />
      <p>Noch keine Projekte.</p>
    </div>
  {/if}
</section>

<section class="storage meta">
  {#if storage}
    <p>
      Speicher auf diesem Gerät: {formatBytes(storage.usage)} von {formatBytes(storage.quota)} belegt.
      {#if storage.persisted}
        Der Browser hat dauerhaften Speicher zugesagt.
      {:else}
        Der Browser kann lokale Daten von sich aus löschen, etwa bei Speichermangel oder (Safari) wenn die Seite länger nicht besucht wurde.
      {/if}
    </p>
  {/if}
  <button class="danger" onclick={removeAll} disabled={!projects.length}>Alle Daten löschen</button>
</section>

<ConfirmDialog bind:this={confirm} />

<style>
  section {
    margin-bottom: 2rem;
  }
  .hero {
    display: grid;
    gap: 0.75rem;
    padding: 2.5rem 1.5rem;
    border-radius: var(--radius);
    background: linear-gradient(135deg, var(--accent-soft), var(--surface));
    border: 1px solid var(--border);
  }
  .hero h2 {
    font-size: clamp(1.5rem, 4vw, 2.2rem);
  }
  .hero input {
    flex: 1 1 14rem;
    max-width: 24rem;
  }
  .heading {
    margin-bottom: 1rem;
  }
  .projects {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: 1rem;
  }
  li {
    padding: 0;
    overflow: hidden;
  }
  .cover {
    width: 100%;
    aspect-ratio: 16 / 8;
    min-height: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    background: var(--surface-2);
    color: var(--muted);
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 2px;
    overflow: hidden;
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: scale 0.3s;
  }
  .cover:hover img {
    scale: 1.05;
  }
  .cover :global(svg) {
    place-self: center;
  }
  .info {
    padding: 0.5rem 0.5rem 0.9rem 1rem;
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }
  .info strong {
    font-size: 1.05rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .info input {
    width: 100%;
    min-height: 2.25rem;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .name > :first-child {
    flex: 1;
    min-width: 0;
  }
  .actions {
    display: flex;
  }
  .storage {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }
</style>
