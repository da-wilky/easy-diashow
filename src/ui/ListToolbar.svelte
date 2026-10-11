<script lang="ts">
  import { i18n } from './i18n.svelte'
  import Icon from './Icon.svelte'
  import { toEnd, toStart } from './reorder'
  import type { Selection } from './selection.svelte'

  let {
    selection,
    ids,
    setOrder,
    onremove,
    onremoveall,
    removeAllLabel,
    onsort,
  }: {
    selection: Selection
    ids: () => string[]
    setOrder: (order: string[]) => void
    onremove: () => void
    onremoveall: () => void
    removeAllLabel: string
    onsort?: () => void
  } = $props()

  const m = $derived(i18n.m)
  const count = $derived(selection.ids.size)
  const total = $derived(ids().length)
</script>

{#if selection.active}
  <div class="toolbar selecting" role="toolbar" aria-label={m.selection}>
    <button class="quiet done" onclick={() => selection.stop()}><Icon name="check" size={16} /> {m.doneSelecting}</button>
    <strong>{m.selected(count)}</strong>
    <button class="quiet" onclick={() => ids().forEach((id) => selection.ids.add(id))} disabled={count === total}>{m.selectAll}</button>
    <span class="spacer"></span>
    <button class="quiet" onclick={() => setOrder(toStart(ids(), selection.block(ids())))} disabled={!count}>{m.toStart}</button>
    <button class="quiet" onclick={() => setOrder(toEnd(ids(), selection.block(ids())))} disabled={!count}>{m.toEnd}</button>
    <button class="quiet danger" onclick={onremove} disabled={!count} aria-label={m.removeSelection}>
      <Icon name="trash" size={16} />
      {m.removeAction}
    </button>
  </div>
{:else}
  <div class="toolbar">
    <button class="quiet" onclick={() => (selection.active = true)}>{m.selectMode}</button>
    <span class="spacer"></span>
    {#if onsort}
      <button class="quiet" onclick={onsort} disabled={total < 2}><Icon name="sort" size={16} /> {m.sortByName}</button>
    {/if}
    <button class="quiet danger" onclick={onremoveall} aria-label={removeAllLabel}><Icon name="trash" size={16} /> {m.removeAllAction}</button>
  </div>
{/if}

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    min-height: 2.25rem;
    margin: -0.25rem -0.5rem 0.6rem;
    font-size: 0.875rem;
  }
  .selecting {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--surface);
  }
  strong {
    margin-inline: 0.5rem;
  }
  .done {
    color: var(--accent);
  }
</style>
