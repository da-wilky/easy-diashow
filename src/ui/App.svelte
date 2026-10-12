<script lang="ts">
  import type { Project } from '../lib/project/types'
  import Editor from './Editor.svelte'
  import { i18n, type Language } from './i18n.svelte'
  import Logo from './Logo.svelte'
  import Privacy from './Privacy.svelte'
  import ProjectList from './ProjectList.svelte'

  const LANGUAGES: { id: Language; name: string }[] = [
    { id: 'de', name: 'Deutsch' },
    { id: 'en', name: 'English' },
  ]

  let open = $state<Project>()
  let hash = $state(location.hash)
  const privacy = $derived(hash === '#datenschutz')
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

<header>
  <h1><Logo /> Easy Diashow</h1>
  <div class="row">
    <div class="languages" role="group" aria-label={i18n.m.language}>
      {#each LANGUAGES as { id, name } (id)}
        <button class="ghost" lang={id} aria-label={name} aria-pressed={i18n.language === id} onclick={() => (i18n.language = id)}>
          {id.toUpperCase()}
        </button>
      {/each}
    </div>
    <a class="meta" href="#datenschutz">{i18n.m.privacy}</a>
    <a class="meta" href="https://github.com/da-wilky/easy-diashow" rel="noopener">{i18n.m.source}</a>
  </div>
</header>
<main>
  {#if privacy}<Privacy />{/if}
  {#if open}
    <!-- stays mounted behind the privacy page: it holds the current state of the project and running uploads -->
    <div hidden={privacy}><Editor initial={open} onclose={() => (open = undefined)} /></div>
  {:else if !privacy}
    <ProjectList onopen={(project) => (open = project)} />
  {/if}
</main>

<style>
  header {
    max-width: 76rem;
    margin: 0 auto;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  h1 {
    font-size: 1.15rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  }
  .languages {
    display: flex;
    background: var(--surface-2);
    border-radius: var(--radius-small);
    padding: 2px;
  }
  .languages button {
    min-height: 2rem;
    padding: 0 0.6rem;
    font-size: 0.8rem;
    border-radius: 7px;
    color: var(--muted);
  }
  .languages button[aria-pressed='true'] {
    background: var(--surface);
    color: var(--accent);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.18);
  }
</style>
