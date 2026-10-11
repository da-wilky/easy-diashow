<script lang="ts">
  import type { Project } from '../lib/project/types'
  import Editor from './Editor.svelte'
  import Privacy from './Privacy.svelte'
  import ProjectList from './ProjectList.svelte'

  let open = $state<Project>()
  let hash = $state(location.hash)
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

<main>
  <h1>Diashow</h1>
  {#if hash === '#datenschutz'}
    <Privacy />
  {:else if open}
    <Editor initial={open} onclose={() => (open = undefined)} />
  {:else}
    <ProjectList onopen={(project) => (open = project)} />
  {/if}
</main>
<footer class="meta">
  Alle Daten bleiben auf diesem Gerät. <a href="#datenschutz">Datenschutz</a>
</footer>
