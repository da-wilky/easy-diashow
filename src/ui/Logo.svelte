<script lang="ts">
  let { size = 28 }: { size?: number } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
  <rect width="32" height="32" rx="7" fill="var(--accent)" />
  <g fill="var(--on-accent)" opacity="0.85">
    <rect x="3.5" y="5.5" width="3" height="3" rx="0.8" /><rect x="3.5" y="11.5" width="3" height="3" rx="0.8" />
    <rect x="3.5" y="17.5" width="3" height="3" rx="0.8" /><rect x="3.5" y="23.5" width="3" height="3" rx="0.8" />
    <rect x="25.5" y="5.5" width="3" height="3" rx="0.8" /><rect x="25.5" y="11.5" width="3" height="3" rx="0.8" />
    <rect x="25.5" y="17.5" width="3" height="3" rx="0.8" /><rect x="25.5" y="23.5" width="3" height="3" rx="0.8" />
  </g>
  <path
    d="M14.5 11h-4.5v10h4.5M10 16h3.5M17.5 11v10h1a5 5 0 0 0 0-10z"
    fill="none"
    stroke="var(--on-accent)"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
