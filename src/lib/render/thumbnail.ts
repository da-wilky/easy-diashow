const THUMBNAIL_EDGE = 640

export const thumbnailName = (imageId: string) => `${imageId}.thumb`

/** Rejects when the blob is not a decodable image. */
export async function makeThumbnail(image: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image)
  const scale = Math.min(1, THUMBNAIL_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
}
