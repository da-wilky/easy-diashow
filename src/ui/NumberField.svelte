<script lang="ts">
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
  <label for={id}>{label}</label>
  <input type="range" {min} {max} {step} bind:value aria-label="{label} (Regler)" />
  <span class="number">
    <input {id} type="number" {min} {max} {step} {value} onchange={(e) => commit(e.currentTarget)} />
    {unit}
  </span>
</div>
