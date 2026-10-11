<script lang="ts">
  import type { Project } from '../lib/project/types'
  import Editor from './Editor.svelte'
  import ProjectList from './ProjectList.svelte'

  let open = $state<Project>()
</script>

<main>
  <h1>Diashow</h1>
  {#if open}
    <Editor initial={open} onclose={() => (open = undefined)} />
  {:else}
    <ProjectList onopen={(project) => (open = project)} />
  {/if}
</main>
