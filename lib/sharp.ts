import sharp from 'sharp'

export interface ProcessedImage {
  optimizedBuffer: Buffer
  thumbnailBuffer: Buffer
  width: number
  height: number
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const image = sharp(buffer).rotate() // auto-rotate based on EXIF

  const metadata = await image.metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  // Optimized version: max 2048px, WebP
  const optimizedBuffer = await image
    .clone()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()

  // Thumbnail: 400x400 cover crop, WebP
  const thumbnailBuffer = await image
    .clone()
    .resize({ width: 400, height: 400, fit: 'cover', position: 'attention' })
    .webp({ quality: 80 })
    .toBuffer()

  return { optimizedBuffer, thumbnailBuffer, width, height }
}
