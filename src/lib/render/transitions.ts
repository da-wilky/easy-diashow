import type { Transition } from '../timeline/types'

type Context = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

const BLINDS = 8
const ZOOM = 0.12
const ease = (p: number) => p * p * (3 - 2 * p)

/** Draws the frame of a transition at `progress` (0 = only `from`, 1 = only `to`). Both images fill the canvas. */
export function drawTransition(
  g: Context,
  type: Transition['type'],
  from: ImageBitmap,
  to: ImageBitmap,
  progress: number,
  width: number,
  height: number,
) {
  /** copies the part of `to` that lies in the given rectangle, in place */
  const uncover = (x: number, y: number, w: number, h: number) => {
    const left = Math.floor(x)
    const top = Math.floor(y)
    const right = Math.floor(x + w)
    const bottom = Math.floor(y + h)
    if (right > left && bottom > top) g.drawImage(to, left, top, right - left, bottom - top, left, top, right - left, bottom - top)
  }
  const black = (alpha: number) => {
    g.globalAlpha = alpha
    g.fillStyle = 'black'
    g.fillRect(0, 0, width, height)
  }

  g.globalAlpha = 1
  if (type === 'push' || type === 'pushUp') {
    const moved = ease(progress)
    const dx = type === 'push' ? Math.round(width * moved) : 0
    const dy = type === 'pushUp' ? Math.round(height * moved) : 0
    g.drawImage(from, -dx, -dy)
    g.drawImage(to, type === 'push' ? width - dx : 0, type === 'pushUp' ? height - dy : 0)
    return
  }
  if (type === 'fadeBlack') {
    g.drawImage(progress < 0.5 ? from : to, 0, 0)
    black(1 - Math.abs(progress * 2 - 1))
    return
  }

  g.drawImage(from, 0, 0)
  switch (type) {
    case 'crossfade':
      g.globalAlpha = progress
      g.drawImage(to, 0, 0)
      break
    case 'zoom': {
      const scale = 1 + ZOOM * (1 - ease(progress))
      g.globalAlpha = progress
      g.drawImage(to, (width * (1 - scale)) / 2, (height * (1 - scale)) / 2, width * scale, height * scale)
      break
    }
    case 'wipe':
      uncover(0, 0, width * progress, height)
      break
    case 'wipeLeft':
      uncover(width * (1 - progress), 0, width * progress, height)
      break
    case 'wipeDown':
      uncover(0, 0, width, height * progress)
      break
    case 'wipeUp':
      uncover(0, height * (1 - progress), width, height * progress)
      break
    case 'slide':
      g.drawImage(to, Math.round(width * (1 - ease(progress))), 0)
      break
    case 'reveal':
      uncover((width / 2) * (1 - progress), 0, width * progress, height)
      break
    case 'circle':
      g.save()
      g.beginPath()
      g.arc(width / 2, height / 2, (Math.hypot(width, height) / 2) * progress, 0, Math.PI * 2)
      g.clip()
      g.drawImage(to, 0, 0)
      g.restore()
      break
    case 'blinds':
      for (let i = 0; i < BLINDS; i++) uncover((width / BLINDS) * i, 0, (width / BLINDS) * progress, height)
      break
  }
}
