export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const WATERMARK_FRACTION = 10
export const WATERMARK_OFFSET = 30

function fit(srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
  return { width: Math.round(srcWidth * scale), height: Math.round(srcHeight * scale) }
}

export function letterbox(srcWidth: number, srcHeight: number, width: number, height: number): Rect {
  const size = fit(srcWidth, srcHeight, width, height)
  return { x: Math.floor((width - size.width) / 2), y: Math.floor((height - size.height) / 2), ...size }
}

export function watermarkRect(srcWidth: number, srcHeight: number, width: number, height: number, offset = WATERMARK_OFFSET): Rect {
  const size = fit(srcWidth, srcHeight, Math.floor(width / WATERMARK_FRACTION), Math.floor(height / WATERMARK_FRACTION))
  return { x: width - size.width - offset, y: height - size.height - offset, ...size }
}
