import { tick } from 'svelte'
import { gather, moveOnto, shift } from './reorder'
import type { Selection } from './selection.svelte'

const LONG_PRESS_MS = 350
const MOVE_THRESHOLD = 6
/** matches the flip animation, so an item sliding under the pointer does not swap straight back */
export const SETTLE_MS = 200
const SCROLL_EDGE = 90
const SCROLL_STEP = 12

/**
 * Reordering for a list whose items carry `data-sort={id}`:
 * drag with the mouse, long-press then drag on touch, arrow keys on a focused item.
 * A selected item takes the whole selection along.
 */
export class Sortable {
  private grabbed = $state<string>()
  private lockedUntil = 0
  private pointer = { x: 0, y: 0 }
  private releasedAt = 0

  constructor(
    private ids: () => string[],
    private selection: Selection,
    private setOrder: (ids: string[]) => void,
  ) {}

  private block(id: string) {
    return this.selection.ids.has(id) ? this.selection.block(this.ids()) : [id]
  }

  isDragging(id: string) {
    return this.grabbed !== undefined && (this.grabbed === id || (this.selection.ids.has(this.grabbed) && this.selection.ids.has(id)))
  }

  private apply(order: string[]) {
    if (order.every((id, i) => id === this.ids()[i])) return
    this.setOrder(order)
    this.lockedUntil = performance.now() + SETTLE_MS
  }

  private hit() {
    if (!this.grabbed || performance.now() < this.lockedUntil) return
    const over = document.elementFromPoint(this.pointer.x, this.pointer.y)?.closest<HTMLElement>('[data-sort]')?.dataset.sort
    if (over && this.ids().includes(over)) this.apply(moveOnto(this.ids(), this.block(this.grabbed), over))
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
      this.grabbed = id
      this.pointer = start
      // no settle lock: the grabbed item stays under the pointer while the others fly in
      this.setOrder(gather(this.ids(), this.block(id), id))
      if (touch) navigator.vibrate?.(10)
      frame = requestAnimationFrame(autoScroll)
    }
    const move = (e: PointerEvent) => {
      this.pointer = { x: e.clientX, y: e.clientY }
      if (this.grabbed) return this.hit()
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) <= MOVE_THRESHOLD) return
      // a finger that moves before the long press completes is scrolling
      if (touch) end()
      else begin()
    }
    const keepPage = (e: TouchEvent) => {
      if (this.grabbed) e.preventDefault()
    }
    const end = () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      if (this.grabbed) this.releasedAt = performance.now()
      this.grabbed = undefined
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

  /** while selecting, a click on an item toggles it, unless the click ends a drag or hits a control inside */
  click = (event: MouseEvent, id: string) => {
    if (!this.selection.active || performance.now() - this.releasedAt < 100) return
    if ((event.target as Element).closest('button, a, input, select, label, summary')) return
    this.selection.toggle(id, this.ids(), event.shiftKey)
  }

  keydown = (event: KeyboardEvent, id: string) => {
    if (event.target !== event.currentTarget) return
    if (event.key === ' ') {
      event.preventDefault()
      this.selection.active = true
      this.selection.toggle(id, this.ids(), event.shiftKey)
      return
    }
    const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key]
    if (!by) return
    event.preventDefault()
    this.setOrder(shift(this.ids(), this.block(id), by))
    const element = event.currentTarget as HTMLElement
    tick().then(() => element.focus())
  }
}
