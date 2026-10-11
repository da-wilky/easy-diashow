<script lang="ts">
  import type { TransitionType } from '../lib/timeline/types'
  import { i18n } from './i18n.svelte'

  let { value = $bindable() }: { value: TransitionType } = $props()

  const TYPES: TransitionType[] = ['none', 'crossfade', 'wipe', 'reveal']
</script>

<fieldset>
  <legend class="label">{i18n.m.transition}</legend>
  <div class="tiles">
    {#each TYPES as type (type)}
      <label class:selected={type === value}>
        <input type="radio" name="transition" checked={type === value} onchange={() => (value = type)} />
        <span class="demo" aria-hidden="true"><span class="next {type}"></span></span>
        <span>{i18n.m.transitions[type]}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
    gap: 0.5rem;
  }
  label {
    position: relative;
    display: grid;
    gap: 0.4rem;
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
    background: linear-gradient(135deg, #f59e0b, #ef4444);
  }
  .next {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #22d3ee, #6366f1);
    animation: 2.8s infinite both;
  }
  .none {
    animation-name: cut;
    animation-timing-function: step-end;
  }
  .crossfade {
    animation-name: fade;
  }
  .wipe {
    animation-name: wipe;
  }
  .reveal {
    animation-name: reveal;
  }
  @keyframes cut {
    0%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }
  @keyframes fade {
    0%,
    30%,
    100% {
      opacity: 0;
    }
    55%,
    85% {
      opacity: 1;
    }
  }
  @keyframes wipe {
    0%,
    30% {
      clip-path: inset(0 100% 0 0);
    }
    55%,
    85% {
      clip-path: inset(0);
      opacity: 1;
    }
    100% {
      clip-path: inset(0);
      opacity: 0;
    }
  }
  @keyframes reveal {
    0%,
    30% {
      clip-path: inset(0 50%);
    }
    55%,
    85% {
      clip-path: inset(0);
      opacity: 1;
    }
    100% {
      clip-path: inset(0);
      opacity: 0;
    }
  }
</style>
