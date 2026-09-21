import sharp from 'sharp'
import heicConvert from 'heic-convert'

export interface ProcessedImage {
    optimizedBuffer: Buffer
    thumbnailBuffer: Buffer
    width: number
    height: number
}

/*
 * ============================================================
 * HEIC / HEIF DETECTION
 * ============================================================
 *
 * iPhones shoot HEIC by default. The upload form tries to convert it to
 * JPEG client-side before it ever reaches here (see lib/compress.ts /
 * components/upload-form.tsx), but that conversion silently falls back to
 * sending the ORIGINAL, unconverted file if it fails -- and in-browser HEIC
 * decoding is known to be inconsistent on some iOS Safari/WebKit versions,
 * and simply unsupported on most non-Safari browsers. So a raw HEIC/HEIF
 * buffer showing up here is an expected, not exceptional, case.
 *
 * We don't trust the client-reported MIME type for this (it can be wrong
 * or missing), so this checks the actual file bytes: HEIC/HEIF containers
 * are ISO base media files with an `ftyp` box at offset 4 and a brand at
 * offset 8, e.g. "heic", "heix", "hevc", "mif1", "msf1".
 */
const HEIC_BRANDS = new Set([
    'heic',
    'heix',
    'hevc',
    'hevx',
    'heim',
    'heis',
    'hevm',
    'hevs',
    'mif1',
    'msf1',
])

function isHeicBuffer(buffer: Buffer): boolean {
    if (buffer.length < 12) {
        return false
    }

    if (buffer.toString('ascii', 4, 8) !== 'ftyp') {
        return false
    }

    const brand = buffer.toString('ascii', 8, 12).toLowerCase()

    return HEIC_BRANDS.has(brand)
}

/*
 * Decodes a HEIC/HEIF buffer into a plain JPEG buffer using `heic-convert`
 * (a pure JS/WASM decoder, no native libheif binary required) so this
 * doesn't depend on whether the deployed Sharp build happens to have HEIC
 * support compiled in -- that's not guaranteed across hosting providers
 * and Sharp prebuilt binaries have, at times, shipped without it.
 */
async function decodeHeicToJpeg(buffer: Buffer): Promise<Buffer> {
    const output = await heicConvert({
        buffer,
        format: 'JPEG',
        quality: 0.92,
    })

    return Buffer.from(output)
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
    let sourceBuffer = buffer

    if (isHeicBuffer(buffer)) {
        try {
            sourceBuffer = await decodeHeicToJpeg(buffer)
        } catch (error) {
            console.error('HEIC decode failed:', error)

            throw new Error('Unable to decode HEIC/HEIF image')
        }
    }

    const image = sharp(sourceBuffer).rotate() // auto-rotate based on EXIF

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