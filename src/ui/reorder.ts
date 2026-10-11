/** All functions take `block` in list order and return a new order of `ids`. */

const without = (ids: string[], block: string[]) => ids.filter((id) => !block.includes(id))

/** pulls the block together at the position of `anchor`, one of its members */
export function gather(ids: string[], block: string[], anchor: string) {
  const at = without(ids.slice(0, ids.indexOf(anchor)), block).length
  return without(ids, block).toSpliced(at, 0, ...block)
}

/** moves the block to the place of `over`: behind it when coming from the front, before it otherwise */
export function moveOnto(ids: string[], block: string[], over: string) {
  if (block.includes(over)) return ids
  const rest = without(ids, block)
  const behind = ids.indexOf(over) > ids.indexOf(block[0]!)
  return rest.toSpliced(rest.indexOf(over) + (behind ? 1 : 0), 0, ...block)
}

/** moves the block `by` places, pulling it together at its first member */
export function shift(ids: string[], block: string[], by: number) {
  const rest = without(ids, block)
  const at = without(ids.slice(0, ids.indexOf(block[0]!)), block).length
  return rest.toSpliced(Math.max(0, Math.min(rest.length, at + by)), 0, ...block)
}

export const toStart = (ids: string[], block: string[]) => [...block, ...without(ids, block)]
export const toEnd = (ids: string[], block: string[]) => [...without(ids, block), ...block]
