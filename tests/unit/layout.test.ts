import { describe, expect, it } from 'vitest'
import { letterbox, watermarkRect } from '../../src/lib/render/layout'

describe('letterbox', () => {
  it('fills the frame for matching aspect ratios, scaling up or down', () => {
    expect(letterbox(3840, 2160, 1920, 1080)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
    expect(letterbox(640, 360, 1920, 1080)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
  })

  it('centres portrait images with bars left and right', () => {
    expect(letterbox(1000, 2000, 1920, 1080)).toEqual({ x: 690, y: 0, width: 540, height: 1080 })
  })

  it('centres wide images with bars above and below', () => {
    expect(letterbox(4000, 1000, 1920, 1080)).toEqual({ x: 0, y: 300, width: 1920, height: 480 })
  })
})

describe('watermarkRect', () => {
  it('fits within a tenth of the frame, 30 px from the bottom-right corner', () => {
    expect(watermarkRect(500, 500, 1920, 1080)).toEqual({ x: 1782, y: 942, width: 108, height: 108 })
    expect(watermarkRect(1000, 100, 1920, 1080)).toEqual({ x: 1698, y: 1031, width: 192, height: 19 })
  })
})
