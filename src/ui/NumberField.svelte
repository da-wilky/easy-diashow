<script lang="ts">
  import { i18n } from './i18n.svelte'
  let {
    label,
    value = $bindable(),
    min,
    max,
    step,
    unit = 's',
  }: { label: string; value: number; min: number; max: number; step: number; unit?: string } = $props()

  const id = $props.id()

  function commit(input: HTMLInputElement) {
    const entered = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : value
    value = Number(Math.min(max, Math.max(min, Math.round(entered / step) * step)).toFixed(3))
    input.value = String(value)
  }
</script>

<div class="field">
  <label class="label" for={id}>{label}</label>
  <span class="number">
    <input {id} type="number" {min} {max} {step} {value} onchange={(e) => commit(e.currentTarget)} />
    {unit}
  </span>
  <input type="range" {min} {max} {step} bind:value aria-label={i18n.m.slider(label)} />
</div>

<style>
  .field {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0 0.75rem;
  }
  .label {
    margin: 0;
  }
  .number {
    color: var(--muted);
    font-size: 0.875rem;
  }
  .number input {
    width: 4.75rem;
    min-height: 2.25rem;
    text-align: right;
    color: var(--text);
  }
  input[type='range'] {
    grid-column: 1 / -1;
  }
</style>
