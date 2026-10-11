import { toFramePlan, type FramePlan } from '../timeline/frames'
import type { Timeline } from '../timeline/types'
import { WATERMARK_OFFSET, letterbox, watermarkRect } from './layout'
import { drawTransition } from './transitions'

/** Draws timeline frames, keeping at most two composed images in memory. Fastest when frames ascend. */
export class Compositor {
  private plan: FramePlan
  private g: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D
  private slides = new Map<string, ImageBitmap>()
  private segment = 0
  private transition = 0
  private last = 0

  constructor(
    private canvas: OffscreenCanvas | HTMLCanvasElement,
    timeline: Timeline,
    private images: Map<string, Blob>,
    private watermark: ImageBitmap | null,
    private watermarkOffset = WATERMARK_OFFSET,
  ) {
    this.plan = toFramePlan(timeline)
    this.g = canvas.getContext('2d', { alpha: false }) as typeof this.g
  }

  get totalFrames() {
    return this.plan.totalFrames
  }

  dispose() {
    for (const slide of this.slides.values()) slide.close()
    this.slides.clear()
  }

  private async slide(id: string) {
    let slide = this.slides.get(id)
    if (!slide) {
      const { width, height } = this.canvas
      const image = await createImageBitmap(this.images.get(id)!)
      const canvas = new OffscreenCanvas(width, height)
      const g = canvas.getContext('2d', { alpha: false })!
      g.imageSmoothingQuality = 'high'
      g.fillStyle = 'black'
      g.fillRect(0, 0, width, height)
      const r = letterbox(image.width, image.height, width, height)
      g.drawImage(image, r.x, r.y, r.width, r.height)
      image.close()
      if (this.watermark) {
        const w = watermarkRect(this.watermark.width, this.watermark.height, width, height, this.watermarkOffset)
        g.drawImage(this.watermark, w.x, w.y, w.width, w.height)
      }
      slide = canvas.transferToImageBitmap()
      this.slides.set(id, slide)
    }
    return slide
  }

  async draw(frame: number) {
    const { plan, g } = this
    const { width, height } = this.canvas
    if (frame < this.last) {
      this.segment = 0
      this.transition = 0
    }
    this.last = frame
    while (plan.segments[this.segment]!.end <= frame && this.segment < plan.segments.length - 1) this.segment++
    while (this.transition < plan.transitions.length && plan.transitions[this.transition]!.end <= frame) this.transition++
    const candidate = plan.transitions[this.transition]
    const transition = candidate && candidate.start <= frame ? candidate : null
    const needed = transition ? [transition.from, transition.to] : [plan.segments[this.segment]!.imageId]
    for (const [id, slide] of this.slides)
      if (!needed.includes(id)) {
        slide.close()
        this.slides.delete(id)
      }

    const from = await this.slide(needed[0]!)
    const to = transition && (await this.slide(transition.to))
    g.globalAlpha = 1
    if (transition && to) {
      const progress = (frame - transition.start) / (transition.end - transition.start)
      drawTransition(g, transition.type, from, to, progress, width, height)
    } else g.drawImage(from, 0, 0)

    const fadeOutStart = plan.totalFrames - plan.fadeOutFrames
    let black = 0
    if (frame < plan.fadeInFrames) black = 1 - frame / plan.fadeInFrames
    if (frame >= fadeOutStart) black = Math.max(black, (frame - fadeOutStart) / plan.fadeOutFrames)
    if (black > 0) {
      g.globalAlpha = black
      g.fillStyle = 'black'
      g.fillRect(0, 0, width, height)
    }
  }
}
