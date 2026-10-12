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
        <span class="demo {type}" aria-hidden="true"><span class="layer first"></span><span class="layer second"></span></span>
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
    /* above the demo layers, which swap between z-index 1 and 2 */
    z-index: 3;
  }
  .demo {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: 5px;
    overflow: hidden;
    background: #000;
  }
  /*
   * The two pictures take turns: each one enters with the transition during the first half of its loop, lying on top,
   * then stays underneath while the other one, half a loop behind, does the same.
   */
  .layer {
    position: absolute;
    inset: 0;
    /* longhands: the build minifies an animation shorthand without a name to `animation: none` */
    animation-duration: 6s;
    animation-iteration-count: infinite;
    animation-fill-mode: both;
    animation-timing-function: ease, step-end;
  }
  /* shapes in the pictures make movement and scaling visible, not only the colour change */
  .first {
    animation-delay: -3s;
    background:
      radial-gradient(circle at 28% 34%, #fff7d6 0 13%, transparent 14%),
      linear-gradient(to top right, #7c2d12 0 38%, transparent 39%),
      linear-gradient(135deg, #f59e0b, #ef4444);
  }
  .second {
    background:
      radial-gradient(circle at 70% 58%, #e0f2fe 0 18%, transparent 19%),
      radial-gradient(circle at 26% 30%, #e0f2fe 0 8%, transparent 9%),
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.16) 0 4px, transparent 4px 12px),
      linear-gradient(135deg, #22d3ee, #6366f1);
  }

  .none .layer {
    animation-name: cut, front;
    animation-timing-function: step-end;
  }
  .fadeBlack .layer {
    animation-name: through-black, front;
  }
  .push .layer {
    animation-name: push, front;
  }
  .pushUp .layer {
    animation-name: push-up, front;
  }
  .crossfade .layer {
    animation-name: crossfade, front;
  }
  .zoom .layer {
    animation-name: zoom, front;
  }
  .wipe .layer {
    animation-name: wipe, front;
  }
  .wipeLeft .layer {
    animation-name: wipe-left, front;
  }
  .wipeDown .layer {
    animation-name: wipe-down, front;
  }
  .wipeUp .layer {
    animation-name: wipe-up, front;
  }
  .slide .layer {
    animation-name: slide, front;
  }
  .reveal .layer {
    animation-name: reveal, front;
  }
  .circle .layer {
    animation-name: circle, front;
  }
  .blinds .layer {
    animation-name: blinds, front;
  }

  @keyframes front {
    0% {
      z-index: 2;
    }
    50%,
    100% {
      z-index: 1;
    }
  }
  @keyframes cut {
    0% {
      opacity: 0;
    }
    22%,
    100% {
      opacity: 1;
    }
  }
  /* the picture underneath darkens first (its 60-72 %), then this one comes up from black */
  @keyframes through-black {
    0%,
    22% {
      opacity: 0;
      filter: brightness(0);
    }
    23% {
      opacity: 1;
      filter: brightness(0);
    }
    35%,
    60% {
      opacity: 1;
      filter: brightness(1);
    }
    72%,
    100% {
      opacity: 1;
      filter: brightness(0);
    }
  }
  /* pushed pictures also leave while the other one enters */
  @keyframes push {
    0%,
    10% {
      translate: 100% 0;
    }
    35%,
    60% {
      translate: 0 0;
    }
    85%,
    100% {
      translate: -100% 0;
    }
  }
  @keyframes push-up {
    0%,
    10% {
      translate: 0 100%;
    }
    35%,
    60% {
      translate: 0 0;
    }
    85%,
    100% {
      translate: 0 -100%;
    }
  }
  @keyframes crossfade {
    0%,
    10% {
      opacity: 0;
    }
    35%,
    100% {
      opacity: 1;
    }
  }
  @keyframes zoom {
    0%,
    10% {
      opacity: 0;
      scale: 2.2;
    }
    35%,
    100% {
      opacity: 1;
      scale: 1;
    }
  }
  @keyframes wipe {
    0%,
    10% {
      clip-path: inset(0 100% 0 0);
    }
    35%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes wipe-left {
    0%,
    10% {
      clip-path: inset(0 0 0 100%);
    }
    35%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes wipe-down {
    0%,
    10% {
      clip-path: inset(0 0 100% 0);
    }
    35%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes wipe-up {
    0%,
    10% {
      clip-path: inset(100% 0 0 0);
    }
    35%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes slide {
    0%,
    10% {
      translate: 100% 0;
    }
    35%,
    100% {
      translate: 0 0;
    }
  }
  @keyframes reveal {
    0%,
    10% {
      clip-path: inset(0 50%);
    }
    35%,
    100% {
      clip-path: inset(0);
    }
  }
  @keyframes circle {
    0%,
    10% {
      clip-path: circle(0% at center);
    }
    35%,
    100% {
      clip-path: circle(75% at center);
    }
  }
  @keyframes blinds {
    0%,
    10% {
      clip-path: polygon(0 100%, 0 0, 0 0, 0 100%, 25% 100%, 25% 0, 25% 0, 25% 100%, 50% 100%, 50% 0, 50% 0, 50% 100%, 75% 100%, 75% 0, 75% 0, 75% 100%);
    }
    35%,
    100% {
      clip-path: polygon(0 100%, 0 0, 25% 0, 25% 100%, 25% 100%, 25% 0, 50% 0, 50% 100%, 50% 100%, 50% 0, 75% 0, 75% 100%, 75% 100%, 75% 0, 100% 0, 100% 100%);
    }
  }
</style>
