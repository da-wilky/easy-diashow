<script lang="ts">
  import type { Project } from '../lib/project/types'
  import {
    createProject,
    deleteEverything,
    deleteProject,
    listProjects,
    loadProject,
    projectSize,
    saveProject,
    storageStatus,
  } from '../lib/storage'
  import { formatBytes, formatDate } from './format'

  let { onopen }: { onopen: (project: Project) => void } = $props()

  let projects = $state<(Project & { size: number })[]>([])
  let storage = $state<Awaited<ReturnType<typeof storageStatus>>>()
  let newName = $state('')

  async function refresh() {
    projects = await Promise.all((await listProjects()).map(async (p) => ({ ...p, size: await projectSize(p.id) })))
    storage = await storageStatus()
  }
  refresh()

  async function create(event: SubmitEvent) {
    event.preventDefault()
    onopen(await createProject(newName.trim() || 'Neues Projekt'))
  }

  async function rename(project: Project) {
    const name = prompt('Neuer Name', project.name)?.trim()
    if (!name) return
    await saveProject({ ...(await loadProject(project.id))!, name, modified: Date.now() })
    await refresh()
  }

  async function remove(project: Project) {
    if (!confirm(`Projekt „${project.name}“ mit allen Bildern und Musikstücken löschen?`)) return
    await deleteProject(project.id)
    await refresh()
  }

  async function removeAll() {
    if (!confirm('Wirklich alle Projekte und alle gespeicherten Daten löschen?')) return
    await deleteEverything()
    await refresh()
  }
</script>

<section>
  <h2>Projekte</h2>
  <form onsubmit={create} class="row">
    <input bind:value={newName} placeholder="Name des Projekts" aria-label="Name des Projekts" />
    <button type="submit" class="primary">Neues Projekt</button>
  </form>

  {#if projects.length}
    <ul class="projects">
      {#each projects as project (project.id)}
        <li>
          <button class="open" onclick={() => onopen(project)}>
            <strong>{project.name}</strong>
            <span class="meta">
              {project.images.length} Bilder · {project.tracks.length} Musikstücke · {formatBytes(project.size)} · geändert {formatDate(project.modified)}
            </span>
          </button>
          <button onclick={() => rename(project)} aria-label="{project.name} umbenennen">Umbenennen</button>
          <button class="danger" onclick={() => remove(project)} aria-label="{project.name} löschen">Löschen</button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="meta">Noch keine Projekte.</p>
  {/if}

  {#if storage}
    <p class="meta">
      Speicher auf diesem Gerät: {formatBytes(storage.usage)} von {formatBytes(storage.quota)} belegt.
      {#if storage.persisted}
        Der Browser hat dauerhaften Speicher zugesagt.
      {:else}
        Der Browser kann lokale Daten von sich aus löschen, etwa bei Speichermangel oder (Safari) wenn die Seite länger nicht besucht wurde.
      {/if}
    </p>
  {/if}
  <button class="danger" onclick={removeAll}>Alle Daten löschen</button>
</section>

<style>
  .projects {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .projects li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .open {
    flex: 1 1 16rem;
    text-align: left;
    display: grid;
    gap: 0.2rem;
  }
</style>
