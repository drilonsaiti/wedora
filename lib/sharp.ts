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

    const optimizedBuffer = await image
        .clone()
        .resize({width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true})
        .webp({quality: 85})
        .toBuffer()


    const thumbnailBuffer = await image
        .clone()
        .resize({width: 300, height: 300, fit: 'cover', position: 'attention'})
        .webp({quality: 55})
        .toBuffer()

    return {optimizedBuffer, thumbnailBuffer, width, height}
}
