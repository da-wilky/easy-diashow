<script lang="ts" generics="T extends string | number">
  let {
    label,
    options,
    value = $bindable(),
    onchange,
  }: {
    label: string
    options: readonly { value: T; label: string; hint?: string }[]
    value: T
    onchange?: (value: T) => void
  } = $props()

  const name = $props.id()
</script>

<fieldset>
  <legend class="label">{label}</legend>
  <div class="segmented">
    {#each options as option (option.value)}
      <label class:selected={option.value === value}>
        <input
          type="radio"
          {name}
          checked={option.value === value}
          onchange={() => {
            value = option.value
            onchange?.(option.value)
          }}
        />
        <span>{option.label}</span>
        {#if option.hint}<small>{option.hint}</small>{/if}
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .segmented {
    display: flex;
    background: var(--surface-2);
    border-radius: var(--radius-small);
    padding: 3px;
    gap: 2px;
  }
  label {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    min-height: 2.5rem;
    padding: 0.3rem 0.4rem;
    border-radius: 7px;
    display: grid;
    place-content: center;
    justify-items: center;
    text-align: center;
    font-weight: 550;
    cursor: pointer;
    transition: background 0.15s;
  }
  label.selected {
    background: var(--surface);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.18);
    color: var(--accent);
  }
  label:has(:focus-visible) {
    outline: 2px solid var(--accent);
  }
  input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
    z-index: 1;
  }
  small {
    font-weight: normal;
    font-size: 0.72rem;
    color: var(--muted);
    white-space: nowrap;
  }
</style>
