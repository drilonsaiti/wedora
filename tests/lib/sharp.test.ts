import { describe, expect, it } from 'vitest'

import { isHeicBuffer } from '@/lib/sharp'

/*
 * isHeicBuffer() is the gate that decides whether an uploaded photo goes
 * through the heic-convert fallback path before Sharp ever sees it (see
 * README's "HEIC/HEIF uploads" section for why: the client-reported MIME
 * type can't be trusted, and letting a HEIC buffer reach Sharp directly on
 * a deployment without libheif support fails the whole upload). A false
 * negative here silently reopens that gap; a false positive wastes a
 * decode pass on a non-HEIC file and likely breaks it. Both are worth
 * pinning down explicitly.
 */
describe('isHeicBuffer', () => {
    function ftypBuffer(brand: string, extra = 12): Buffer {
        return Buffer.concat([
            Buffer.from([0, 0, 0, 24]), // box size (arbitrary, unused by the check)
            Buffer.from('ftyp', 'ascii'),
            Buffer.from(brand, 'ascii'),
            Buffer.alloc(extra),
        ])
    }

    it.each([
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
    ])('recognizes the %s brand as HEIC/HEIF', (brand) => {
        expect(isHeicBuffer(ftypBuffer(brand))).toBe(true)
    })

    it('is case-insensitive on the brand', () => {
        expect(isHeicBuffer(ftypBuffer('HEIC'))).toBe(true)
    })

    it('rejects a JPEG buffer (starts with the JPEG magic bytes, no ftyp box)', () => {
        const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])

        expect(isHeicBuffer(jpeg)).toBe(false)
    })

    it('rejects a PNG buffer', () => {
        const png = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
        ])

        expect(isHeicBuffer(png)).toBe(false)
    })

    it('rejects another ISO-base-media container that is not HEIC (e.g. an MP4)', () => {
        // Same `ftyp` box shape, but a video brand rather than a HEIC one --
        // this is exactly the case the brand allowlist exists to reject.
        expect(isHeicBuffer(ftypBuffer('isom'))).toBe(false)
    })

    it('rejects a buffer too short to contain an ftyp box', () => {
        expect(isHeicBuffer(Buffer.from([0, 0, 0, 1]))).toBe(false)
    })

    it('rejects an empty buffer', () => {
        expect(isHeicBuffer(Buffer.alloc(0))).toBe(false)
    })
})
