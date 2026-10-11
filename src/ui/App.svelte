<script lang="ts">
  import type { Project } from '../lib/project/types'
  import Editor from './Editor.svelte'
  import Icon from './Icon.svelte'
  import Privacy from './Privacy.svelte'
  import ProjectList from './ProjectList.svelte'

  let open = $state<Project>()
  let hash = $state(location.hash)
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

<header>
  <h1><Icon name="film" size={22} /> Diashow</h1>
  <a class="meta" href="#datenschutz">Datenschutz</a>
</header>
<main>
  {#if hash === '#datenschutz'}
    <Privacy />
  {:else if open}
    <Editor initial={open} onclose={() => (open = undefined)} />
  {:else}
    <ProjectList onopen={(project) => (open = project)} />
  {/if}
</main>

<style>
  header {
    max-width: 76rem;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h1 {
    font-size: 1.15rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--accent);
  }
</style>
