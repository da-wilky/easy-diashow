import { SvelteSet } from 'svelte/reactivity'

export class Selection {
  /** selecting is a mode the user switches on; outside it items are only dragged */
  active = $state(false)
  ids = new SvelteSet<string>()
  private last?: string

  /** `range` extends from the previously toggled item to `id` within `order` */
  toggle(id: string, order: string[], range: boolean) {
    const from = range && this.last ? order.indexOf(this.last) : -1
    if (from !== -1) {
      const to = order.indexOf(id)
      for (const each of order.slice(Math.min(from, to), Math.max(from, to) + 1)) this.ids.add(each)
    } else if (!this.ids.delete(id)) this.ids.add(id)
    this.last = id
  }

  stop() {
    this.active = false
    this.ids.clear()
    this.last = undefined
  }

  /** selected ids in list order */
  block(order: string[]) {
    return order.filter((id) => this.ids.has(id))
  }
}
