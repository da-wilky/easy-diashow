<script lang="ts" module>
  const PATHS = {
    plus: 'M12 5v14M5 12h14',
    x: 'M6 6l12 12M18 6L6 18',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    play: 'M8 5v14l11-7z',
    pause: 'M8 5v14M16 5v14',
    music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M8.5 9.5h.01',
    back: 'M15 5l-7 7 7 7',
    pencil: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
    download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
    check: 'M5 12.5l4.5 4.5L19 7',
    film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4',
    sort: 'M4 7h11M4 12h8M4 17h5M18 6v12M15 15l3 3 3-3',
    sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  }
  export type IconName = keyof typeof PATHS
</script>

<script lang="ts">
  let { name, size = 20 }: { name: IconName; size?: number } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={name === 'play' ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={PATHS[name]} />
</svg>
