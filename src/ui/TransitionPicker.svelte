<script lang="ts">
  import { TRANSITION_GROUPS, type TransitionGroup, type TransitionType } from '../lib/timeline/types'
  import { i18n } from './i18n.svelte'

  const BASIC: TransitionType[] = ['none', 'crossfade', 'wipe', 'reveal']

  let { value = $bindable() }: { value: TransitionType } = $props()

  let expanded = $state(false)
  const m = $derived(i18n.m)
  // a choice from the full list stays visible after collapsing
  const shortlist = $derived(BASIC.includes(value) ? BASIC : [...BASIC, value])
  const groups = Object.entries(TRANSITION_GROUPS) as [TransitionGroup, readonly TransitionType[]][]
</script>

{#snippet tiles(types: readonly TransitionType[])}
  <div class="tiles">
    {#each types as type (type)}
      <label class:selected={type === value}>
        <input type="radio" name="transition" checked={type === value} onchange={() => (value = type)} />
        <span class="demo {type}" aria-hidden="true"><span class="prev"></span><span class="next"></span></span>
        <span>{m.transitions[type]}</span>
      </label>
    {/each}
  </div>
{/snippet}

<fieldset>
  <legend class="label">{m.transition}</legend>
  {#if expanded}
    {#each groups as [group, types] (group)}
      <p class="group">{m.transitionGroups[group]}</p>
      {@render tiles(types)}
    {/each}
  {:else}
    {@render tiles(shortlist)}
  {/if}
  <button class="quiet toggle" aria-expanded={expanded} onclick={() => (expanded = !expanded)}>
    {expanded ? m.fewerTransitions : m.allTransitions}
  </button>
</fieldset>

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.25rem, 1fr));
    gap: 0.5rem;
  }
  .group {
    margin: 0.75rem 0 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .group:first-of-type {
    margin-top: 0;
  }
  .toggle {
    margin: 0.4rem 0 0 -0.6rem;
  }
  label {
    position: relative;
    display: grid;
    align-content: start;
    gap: 0.4rem;
    min-width: 0;
    padding: 0.5rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-small);
    font-size: 0.85rem;
    font-weight: 550;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  label.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  label:has(:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
    z-index: 1;
  }
  .demo {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: 5px;
    overflow: hidden;
    background: #000;
  }
  .prev,
  .next {
    position: absolute;
    inset: 0;
    animation: 2.8s infinite both;
  }
  .prev {
    background: linear-gradient(135deg, #f59e0b, #ef4444);
  }
  .next {
    background: linear-gradient(135deg, #22d3ee, #6366f1);
  }

  /* every demo holds the first image until 30 %, changes until 55 % and holds the second */
  .none .next {
    animation-name: cut;
    animation-timing-function: step-end;
  }
  .crossfade .next {
    animation-name: fade;
  }
  .fadeBlack .prev {
    animation-name: to-black;
  }
  .fadeBlack .next {
    animation-name: from-black;
  }
  .zoom .next {
    animation-name: zoom;
  }
  .wipe .next {
    animation-name: wipe;
  }
  .wipeLeft .next {
    animation-name: wipe-left;
  }
  .wipeDown .next {
    animation-name: wipe-down;
  }
  .wipeUp .next {
    animation-name: wipe-up;
  }
  .slide .next,
  .push .next {
    animation-name: in-from-right;
  }
  .push .prev {
    animation-name: out-to-left;
  }
  .pushUp .next {
    animation-name: in-from-below;
  }
  .pushUp .prev {
    animation-name: out-to-top;
  }
  .reveal .next {
    animation-name: reveal;
  }
  .circle .next {
    animation-name: circle;
  }
  .blinds .next {
    mask-image: repeating-linear-gradient(90deg, #000 0 var(--blind), transparent var(--blind) 25%);
    animation-name: blinds;
  }

  @keyframes cut {
    0% {
      opacity: 0;
    }
    45%,
    100% {
      opacity: 1;
    }
  }
  @keyframes fade {
    0%,
    30% {
      opacity: 0;
    }
    55%,
    100% {
      opacity: 1;
    }
  }
  @keyframes to-black {
    0%,
    30% {
      filter: brightness(1);
    }
    42%,
    100% {
      filter: brightness(0);
    }
  }
  @keyframes from-black {
    0%,
    42% {
      opacity: 0;
      filter: brightness(0);
    }
    43% {
      opacity: 1;
      filter: brightness(0);
    }
    55%,
    100% {
      opacity: 1;
      filter: brightness(1);
    }
  }
  @keyframes zoom {
    0%,
    30% {
      opacity: 0;
      scale: 1.5;
    }
    55%,
    100% {
      opacity: 1;
      scale: 1;
    }
  }
  @keyframes wipe {
    0%,
    30% {
      clip-path: inset(0 100% 0 0);
    }
    55%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes wipe-left {
    0%,
    30% {
      clip-path: inset(0 0 0 100%);
    }
    55%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes wipe-down {
    0%,
    30% {
      clip-path: inset(0 0 100% 0);
    }
    55%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes wipe-up {
    0%,
    30% {
      clip-path: inset(100% 0 0 0);
    }
    55%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes in-from-right {
    0%,
    30% {
      translate: 100% 0;
    }
    55%,
    100% {
      translate: 0 0;
    }
  }
  @keyframes out-to-left {
    0%,
    30% {
      translate: 0 0;
    }
    55%,
    100% {
      translate: -100% 0;
    }
  }
  @keyframes in-from-below {
    0%,
    30% {
      translate: 0 100%;
    }
    55%,
    100% {
      translate: 0 0;
    }
  }
  @keyframes out-to-top {
    0%,
    30% {
      translate: 0 0;
    }
    55%,
    100% {
      translate: 0 -100%;
    }
  }
  @keyframes reveal {
    0%,
    30% {
      clip-path: inset(0 50%);
    }
    55%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes circle {
    0%,
    30% {
      clip-path: circle(0% at center);
    }
    55%,
    100% {
      clip-path: circle(75% at center);
    }
  }
  @keyframes blinds {
    0%,
    30% {
      --blind: 0%;
    }
    55%,
    100% {
      --blind: 25%;
    }
  }
</style>
