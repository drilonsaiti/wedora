/**
 * Reads the EXIF orientation tag from a JPEG file.
 * Returns 1 (normal) if not found or not a JPEG.
 *
 * EXIF orientation values:
 *  1 = 0°   normal
 *  2 = 0°   flip horizontal
 *  3 = 180°
 *  4 = 180° flip horizontal
 *  5 = 90°  flip horizontal
 *  6 = 90°  CW  (phone held upright, back camera)
 *  7 = 270° flip horizontal
 *  8 = 270° CW
 */
function readExifOrientation(buffer: ArrayBuffer): number {
    const view = new DataView(buffer)

    // Must start with JPEG SOI marker FF D8
    if (view.getUint16(0) !== 0xffd8) return 1

    let offset = 2
    const length = view.byteLength

    while (offset < length) {
        if (view.getUint8(offset) !== 0xff) break
        const marker = view.getUint8(offset + 1)

        // APP1 marker = 0xE1
        if (marker === 0xe1) {
            const app1Length = view.getUint16(offset + 2)
            // "Exif\0\0"
            if (view.getUint32(offset + 4) !== 0x45786966) break

            const tiffOffset = offset + 10
            const littleEndian = view.getUint16(tiffOffset) === 0x4949

            const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian)
            const ifdEntries = view.getUint16(tiffOffset + ifdOffset, littleEndian)

            for (let i = 0; i < ifdEntries; i++) {
                const entryOffset = tiffOffset + ifdOffset + 2 + i * 12
                const tag = view.getUint16(entryOffset, littleEndian)
                // Orientation tag = 0x0112
                if (tag === 0x0112) {
                    return view.getUint16(entryOffset + 8, littleEndian)
                }
            }
            break
        }

        // Skip this segment
        offset += 2 + view.getUint16(offset + 2)
    }

    return 1
}

/**
 * Takes a File (any image), reads its EXIF orientation,
 * draws it correctly onto a canvas (baking in rotation/flip),
 * and returns a new File with orientation = 1 (no transforms needed).
 *
 * This ensures the image looks correct in ALL contexts:
 * - Browser <img> preview
 * - After browser-image-compression (which strips EXIF)
 * - After Sharp server-side processing
 */
export async function normalizeOrientation(file: File): Promise<File> {
    const buffer = await file.arrayBuffer()
    const orientation = readExifOrientation(buffer)

    // Orientation 1 = already correct, no work needed
    if (orientation === 1) return file

    return new Promise((resolve, reject) => {
        const blob = new Blob([buffer], { type: file.type })
        const url = URL.createObjectURL(blob)
        const img = new Image()

        img.onload = () => {
            URL.revokeObjectURL(url)

            const { naturalWidth: w, naturalHeight: h } = img
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')!

            // Orientations 5-8 swap width/height
            const swapped = orientation >= 5
            canvas.width = swapped ? h : w
            canvas.height = swapped ? w : h

            // Apply the transform that undoes the EXIF orientation
            switch (orientation) {
                case 2: ctx.transform(-1, 0, 0, 1, w, 0); break          // flip H
                case 3: ctx.transform(-1, 0, 0, -1, w, h); break         // 180°
                case 4: ctx.transform(1, 0, 0, -1, 0, h); break          // flip V
                case 5: ctx.transform(0, 1, 1, 0, 0, 0); break           // 90° + flip H
                case 6: ctx.transform(0, 1, -1, 0, h, 0); break          // 90° CW
                case 7: ctx.transform(0, -1, -1, 0, h, w); break         // 270° + flip H
                case 8: ctx.transform(0, -1, 1, 0, 0, w); break          // 270° CW
                default: break
            }

            ctx.drawImage(img, 0, 0)

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Canvas toBlob failed'))
                        return
                    }
                    resolve(
                        new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                            type: 'image/jpeg',
                        })
                    )
                },
                'image/jpeg',
                0.95 // high quality — compression happens afterwards
            )
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            resolve(file) // fall back to original on error
        }

        img.src = url
    })
}