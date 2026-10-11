import { describe, expect, it } from 'vitest'
import { gather, moveOnto, shift, toEnd, toStart } from '../../src/ui/reorder'

const ids = ['a', 'b', 'c', 'd', 'e', 'f']

describe('reorder', () => {
  it('moves a single item like a splice', () => {
    expect(moveOnto(ids, ['b'], 'e')).toEqual(['a', 'c', 'd', 'e', 'b', 'f'])
    expect(moveOnto(ids, ['e'], 'b')).toEqual(['a', 'e', 'b', 'c', 'd', 'f'])
    expect(moveOnto(ids, ['b'], 'b')).toBe(ids)
  })

  it('gathers a scattered selection at the grabbed item, keeping its order', () => {
    expect(gather(ids, ['a', 'c', 'f'], 'c')).toEqual(['b', 'a', 'c', 'f', 'd', 'e'])
    expect(gather(ids, ['b', 'e'], 'e')).toEqual(['a', 'c', 'd', 'b', 'e', 'f'])
  })

  it('moves a block before or behind the target', () => {
    const gathered = ['a', 'b', 'c', 'd', 'e', 'f']
    expect(moveOnto(gathered, ['b', 'c'], 'e')).toEqual(['a', 'd', 'e', 'b', 'c', 'f'])
    expect(moveOnto(gathered, ['d', 'e'], 'a')).toEqual(['d', 'e', 'a', 'b', 'c', 'f'])
  })

  it('shifts a block by steps and stops at the ends', () => {
    expect(shift(ids, ['b', 'd'], 1)).toEqual(['a', 'c', 'b', 'd', 'e', 'f'])
    expect(shift(ids, ['b', 'd'], -1)).toEqual(['b', 'd', 'a', 'c', 'e', 'f'])
    expect(shift(ids, ['a'], -1)).toEqual(ids)
    expect(shift(ids, ['e', 'f'], 1)).toEqual(ids)
  })

  it('sends a block to the start or the end', () => {
    expect(toStart(ids, ['c', 'e'])).toEqual(['c', 'e', 'a', 'b', 'd', 'f'])
    expect(toEnd(ids, ['a', 'c'])).toEqual(['b', 'd', 'e', 'f', 'a', 'c'])
  })
})
