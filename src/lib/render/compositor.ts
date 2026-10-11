import { toFramePlan, type FramePlan } from '../timeline/frames'
import type { Timeline } from '../timeline/types'
import { letterbox, watermarkRect } from './layout'

/** Draws timeline frames in ascending order, keeping at most two composed images in memory. */
export class Compositor {
  private plan: FramePlan
  private g: OffscreenCanvasRenderingContext2D
  private slides = new Map<string, ImageBitmap>()
  private segment = 0
  private transition = 0

  constructor(
    private canvas: OffscreenCanvas,
    timeline: Timeline,
    private images: Map<string, Blob>,
    private watermark: ImageBitmap | null,
  ) {
    this.plan = toFramePlan(timeline)
    this.g = canvas.getContext('2d', { alpha: false })!
  }

  get totalFrames() {
    return this.plan.totalFrames
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
        const w = watermarkRect(this.watermark.width, this.watermark.height, width, height)
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

    g.globalAlpha = 1
    g.drawImage(await this.slide(needed[0]!), 0, 0)
    if (transition) {
      const to = await this.slide(transition.to)
      const progress = (frame - transition.start) / (transition.end - transition.start)
      if (transition.type === 'crossfade') {
        g.globalAlpha = progress
        g.drawImage(to, 0, 0)
      } else {
        const left = transition.type === 'wipe' ? 0 : Math.floor((width / 2) * (1 - progress))
        const right = transition.type === 'wipe' ? Math.floor(width * progress) : Math.floor((width / 2) * (1 + progress))
        if (right > left) g.drawImage(to, left, 0, right - left, height, left, 0, right - left, height)
      }
    }

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
