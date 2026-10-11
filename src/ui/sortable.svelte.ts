import { tick } from 'svelte'

const LONG_PRESS_MS = 350
const MOVE_THRESHOLD = 6
/** matches the flip animation, so an item sliding under the pointer does not swap straight back */
export const SETTLE_MS = 200
const SCROLL_EDGE = 90
const SCROLL_STEP = 12

/**
 * Reordering for a list whose items carry `data-sort={id}`:
 * drag with the mouse, long-press then drag on touch, arrow keys on a focused item.
 */
export class Sortable {
  dragging = $state<string>()
  private lockedUntil = 0
  private pointer = { x: 0, y: 0 }

  constructor(
    private ids: () => string[],
    private reorder: (from: number, to: number) => void,
  ) {}

  private hit() {
    if (!this.dragging || performance.now() < this.lockedUntil) return
    const over = document.elementFromPoint(this.pointer.x, this.pointer.y)?.closest<HTMLElement>('[data-sort]')?.dataset.sort
    const ids = this.ids()
    const from = ids.indexOf(this.dragging)
    const to = over ? ids.indexOf(over) : -1
    if (from === -1 || to === -1 || from === to) return
    this.reorder(from, to)
    this.lockedUntil = performance.now() + SETTLE_MS
  }

  pointerdown = (event: PointerEvent, id: string) => {
    if (event.button !== 0 || (event.target as Element).closest('button, a, input, select, label, summary')) return
    const start = { x: event.clientX, y: event.clientY }
    const touch = event.pointerType !== 'mouse'
    let timer: ReturnType<typeof setTimeout> | undefined
    let frame = 0

    const autoScroll = () => {
      if (this.pointer.y < SCROLL_EDGE) window.scrollBy(0, -SCROLL_STEP)
      else if (this.pointer.y > window.innerHeight - SCROLL_EDGE) window.scrollBy(0, SCROLL_STEP)
      this.hit()
      frame = requestAnimationFrame(autoScroll)
    }
    const begin = () => {
      this.dragging = id
      this.pointer = start
      if (touch) navigator.vibrate?.(10)
      frame = requestAnimationFrame(autoScroll)
    }
    const move = (e: PointerEvent) => {
      this.pointer = { x: e.clientX, y: e.clientY }
      if (this.dragging) return this.hit()
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) <= MOVE_THRESHOLD) return
      // a finger that moves before the long press completes is scrolling
      if (touch) end()
      else begin()
    }
    const keepPage = (e: TouchEvent) => {
      if (this.dragging) e.preventDefault()
    }
    const end = () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      this.dragging = undefined
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('touchmove', keepPage)
    }

    if (touch) timer = setTimeout(begin, LONG_PRESS_MS)
    else {
      event.preventDefault()
      ;(event.currentTarget as HTMLElement).focus()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('touchmove', keepPage, { passive: false })
  }

  keydown = (event: KeyboardEvent, id: string) => {
    if (event.target !== event.currentTarget) return
    const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key]
    if (!by) return
    event.preventDefault()
    const ids = this.ids()
    const from = ids.indexOf(id)
    if (from + by < 0 || from + by >= ids.length) return
    this.reorder(from, from + by)
    const element = event.currentTarget as HTMLElement
    tick().then(() => element.focus())
  }
}
