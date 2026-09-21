'use client'

import {useCallback, useEffect, useRef, useState,} from 'react'

import {ArrowLeftRight, Camera, Check, ImageIcon, Loader2, Upload, X,} from 'lucide-react'
import {useTranslations} from 'next-intl'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import imageCompression from 'browser-image-compression'
import loadImage from 'blueimp-load-image'

import {fileSchema, uploadFormSchema, type UploadFormValues,} from '@/schemas'
import {cn, formatBytes} from '@/lib/utils'

type UploadState =
    | 'idle'
    | 'compressing'
    | 'uploading'
    | 'done'
    | 'error'

const filterOptions = [
    {
        id: 'none',
        css: 'none',
    },
    {
        id: 'grayscale',
        css: 'grayscale(100%)',
    },
    {
        id: 'sepia',
        css: 'sepia(85%)',
    },
    {
        id: 'warm',
        css: 'brightness(108%) contrast(108%) saturate(125%) hue-rotate(8deg)',
    },
    {
        id: 'cool',
        css: 'brightness(105%) contrast(110%) saturate(115%) hue-rotate(-15deg)',
    },
    {
        id: 'vintage',
        css: 'sepia(45%) contrast(112%) brightness(92%)',
    },
    {
        id: 'dramatic',
        css: 'contrast(125%) brightness(88%) saturate(75%)',
    },
    {
        id: 'soft',
        css: 'brightness(110%) contrast(95%) saturate(90%)',
    },
] as const

export function UploadFormDemo() {
    const t = useTranslations('wedding.upload')

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null)

    const [preview, setPreview] =
        useState<string | null>(null)

    const [isFlipped, setIsFlipped] =
        useState(false)

    const [selectedFilter, setSelectedFilter] =
        useState('none')

    const [uploadState, setUploadState] =
        useState<UploadState>('idle')

    const [progress, setProgress] =
        useState(0)

    const [fileError, setFileError] =
        useState<string | null>(null)

    const cameraRef =
        useRef<HTMLInputElement>(null)

    const galleryRef =
        useRef<HTMLInputElement>(null)

    const {
        register,
        handleSubmit,
        formState: {errors},
        reset,
    } = useForm<UploadFormValues>({
        resolver: zodResolver(
            uploadFormSchema
        ),
        defaultValues: {
            isPublic: false,
        },
    })

    /*
     * Revoke the preview URL when
     * the component unmounts.
     */
    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(
                    preview
                )
            }
        }
    }, [preview])

    /*
     * Prepare selected image.
     *
     * 1. Validate file
     * 2. Correct EXIF orientation
     * 3. Resize to max 2048px
     * 4. Compress to JPEG
     */
    const handleFileSelect = useCallback(
        async (file: File) => {
            setFileError(null)
            setIsFlipped(false)
            setSelectedFilter('none')

            const result =
                fileSchema.safeParse(file)

            if (!result.success) {
                setFileError(
                    result.error.errors[0]
                        ?.message ??
                    t(
                        'errors.invalidFile'
                    )
                )

                return
            }

            try {
                const orientedBlob =
                    await new Promise<Blob>(
                        (
                            resolve,
                            reject
                        ) => {
                            loadImage(
                                file,
                                (
                                    canvas
                                ) => {
                                    if (
                                        !(
                                            canvas instanceof
                                            HTMLCanvasElement
                                        )
                                    ) {
                                        reject(
                                            new Error(
                                                'Failed to create oriented canvas'
                                            )
                                        )

                                        return
                                    }

                                    canvas.toBlob(
                                        (
                                            blob
                                        ) => {
                                            if (
                                                blob
                                            ) {
                                                resolve(
                                                    blob
                                                )
                                            } else {
                                                reject(
                                                    new Error(
                                                        'Failed to create image blob'
                                                    )
                                                )
                                            }
                                        },
                                        'image/jpeg',
                                        0.92
                                    )
                                },
                                {
                                    orientation:
                                        true,
                                    canvas: true,
                                    maxWidth:
                                        2048,
                                    maxHeight:
                                        2048,
                                }
                            )
                        }
                    )

                const orientedFile =
                    new File(
                        [
                            orientedBlob,
                        ],
                        'photo.jpg',
                        {
                            type: 'image/jpeg',
                        }
                    )

                const corrected =
                    await imageCompression(
                        orientedFile,
                        {
                            maxSizeMB: 3,
                            maxWidthOrHeight:
                                2048,
                            useWebWorker:
                                true,
                            fileType:
                                'image/jpeg',
                            initialQuality:
                                0.92,
                            exifOrientation:
                                1,
                        }
                    )

                if (preview) {
                    URL.revokeObjectURL(
                        preview
                    )
                }

                const previewUrl =
                    URL.createObjectURL(
                        corrected
                    )

                setSelectedFile(
                    corrected
                )
                setPreview(previewUrl)
            } catch {
                if (preview) {
                    URL.revokeObjectURL(
                        preview
                    )
                }

                const previewUrl =
                    URL.createObjectURL(
                        file
                    )

                setSelectedFile(file)
                setPreview(previewUrl)
            }
        },
        [preview, t]
    )

    /*
     * Remove selected image
     */
    const clearFile =
        useCallback(() => {
            if (preview) {
                URL.revokeObjectURL(
                    preview
                )
            }

            setSelectedFile(null)
            setPreview(null)
            setIsFlipped(false)
            setSelectedFilter('none')
            setFileError(null)

            if (cameraRef.current) {
                cameraRef.current.value =
                    ''
            }

            if (galleryRef.current) {
                galleryRef.current.value =
                    ''
            }
        }, [preview])

    /*
     * Mirror image
     */
    const toggleFlip =
        useCallback(() => {
            setIsFlipped(
                (current) =>
                    !current
            )
        }, [])

    /*
     * Demo upload simulation
     */
    const onSubmit = async (
        _values: UploadFormValues
    ) => {
        if (!selectedFile) {
            setFileError(
                t(
                    'errors.selectPhoto'
                )
            )

            return
        }

        setUploadState(
            'compressing'
        )
        setProgress(15)

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    500
                )
        )

        setProgress(45)
        setUploadState('uploading')

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    700
                )
        )

        setProgress(80)

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    400
                )
        )

        setProgress(100)
        setUploadState('done')
    }

    /*
     * Reset after demo upload
     */
    const handleReset = () => {
        clearFile()
        reset()
        setUploadState('idle')
        setProgress(0)
    }

    const isLoading =
        uploadState ===
        'compressing' ||
        uploadState ===
        'uploading'

    /*
     * SUCCESS
     */
    if (uploadState === 'done') {
        return (
            <div className="py-7 text-center sm:py-9">
                <div
                    className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[hsl(var(--primary))]/15 bg-[hsl(var(--accent))]">
                    <Check
                        className="h-6 w-6 text-[hsl(var(--primary))]"
                        strokeWidth={
                            1.7
                        }
                    />
                </div>

                <h2 className="font-serif text-3xl font-light tracking-[-0.02em] text-foreground">
                    {t(
                        'success.title'
                    )}
                </h2>

                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                    {t(
                        'success.description'
                    )}
                </p>

                <button
                    type="button"
                    onClick={
                        handleReset
                    }
                    className="btn-secondary mt-7 w-full justify-center"
                >
                    <Camera className="h-4 w-4"/>

                    {t(
                        'success.tryAgain'
                    )}
                </button>
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSubmit(
                onSubmit
            )}
            className="space-y-7"
        >
            {/* IMAGE SELECTION */}
            {!selectedFile ? (
                <div>
                    <div className="text-center">
                        <div
                            className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                            <ImageIcon
                                className="h-5 w-5 text-[hsl(var(--primary))]"
                                strokeWidth={
                                    1.5
                                }
                            />
                        </div>

                        <p className="mx-auto max-w-xs text-sm leading-6 text-muted-foreground">
                            {t(
                                'selectMethod'
                            )}
                        </p>

                        {/* Source selection */}
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    cameraRef.current?.click()
                                }
                                className="group flex min-h-[112px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-background px-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary))]/25 hover:shadow-sm"
                            >
                                <div
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))] transition-transform duration-200 group-hover:scale-105">
                                    <Camera
                                        className="h-4 w-4 text-[hsl(var(--primary))]"
                                        strokeWidth={
                                            1.6
                                        }
                                    />
                                </div>

                                <span className="text-xs font-medium text-foreground">
                                    {t(
                                        'camera'
                                    )}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    galleryRef.current?.click()
                                }
                                className="group flex min-h-[112px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-background px-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary))]/25 hover:shadow-sm"
                            >
                                <div
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))] transition-transform duration-200 group-hover:scale-105">
                                    <Upload
                                        className="h-4 w-4 text-[hsl(var(--primary))]"
                                        strokeWidth={
                                            1.6
                                        }
                                    />
                                </div>

                                <span className="text-xs font-medium text-foreground">
                                    {t(
                                        'gallery'
                                    )}
                                </span>
                            </button>
                        </div>
                    </div>

                    {fileError && (
                        <p className="mt-4 text-center text-xs leading-5 text-destructive">
                            {fileError}
                        </p>
                    )}
                </div>
            ) : (
                <>
                    {/* PHOTO PREVIEW */}
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-[#111] shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview!}
                            alt={t(
                                'preview'
                            )}
                            className="h-full w-full object-contain transition-all duration-300"
                            style={{
                                filter:
                                selectedFilter,
                                transform:
                                    isFlipped
                                        ? 'scaleX(-1)'
                                        : 'none',
                            }}
                        />

                        {/* Subtle overlay */}
                        <div
                            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"/>

                        {!isLoading && (
                            <>
                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={
                                        clearFile
                                    }
                                    aria-label="Remove photo"
                                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/55"
                                >
                                    <X className="h-4 w-4"/>
                                </button>

                                {/* Flip */}
                                <button
                                    type="button"
                                    onClick={
                                        toggleFlip
                                    }
                                    className="absolute left-3 top-3 flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 text-[10px] font-medium text-white backdrop-blur-md transition hover:bg-black/55"
                                >
                                    <ArrowLeftRight className="h-3.5 w-3.5"/>

                                    {isFlipped
                                        ? t(
                                            'flip.normal'
                                        )
                                        : t(
                                            'flip.flip'
                                        )}
                                </button>
                            </>
                        )}

                        {/* File size */}
                        <div
                            className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1.5 text-[9px] font-medium tracking-wide text-white/80 backdrop-blur-md">
                            {formatBytes(
                                selectedFile.size
                            )}
                        </div>
                    </div>

                    {/* FILTERS */}
                    <div>
                        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {t(
                                'filters.title'
                            )}
                        </p>

                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                            {filterOptions.map(
                                (
                                    filter
                                ) => (
                                    <button
                                        key={
                                            filter.id
                                        }
                                        type="button"
                                        disabled={
                                            isLoading
                                        }
                                        onClick={() =>
                                            setSelectedFilter(
                                                filter.css
                                            )
                                        }
                                        className={cn(
                                            'shrink-0 rounded-full border px-4 py-2 text-[11px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50',
                                            selectedFilter ===
                                            filter.css
                                                ? 'border-foreground bg-foreground text-background shadow-sm'
                                                : 'border-border/70 bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                                        )}
                                    >
                                        {t(
                                            `filters.${filter.id}`
                                        )}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* CAMERA INPUT */}
            <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                    const file =
                        event.target
                            .files?.[0]

                    if (file) {
                        void handleFileSelect(
                            file
                        )
                    }
                }}
            />

            {/* GALLERY INPUT */}
            <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    const file =
                        event.target
                            .files?.[0]

                    if (file) {
                        void handleFileSelect(
                            file
                        )
                    }
                }}
            />

            {/* DETAILS */}
            <div className="space-y-5 border-t border-border/60 pt-6">
                {/* Guest name */}
                <div>
                    <label
                        htmlFor="guestName"
                        className="label-wedding"
                    >
                        {t(
                            'guestName.label'
                        )}
                    </label>

                    <input
                        {...register(
                            'guestName'
                        )}
                        id="guestName"
                        type="text"
                        placeholder={t(
                            'guestName.placeholder'
                        )}
                        className="input-wedding"
                        maxLength={100}
                        disabled={
                            isLoading
                        }
                    />

                    {errors.guestName && (
                        <p className="mt-1.5 text-xs text-destructive">
                            {
                                errors
                                    .guestName
                                    .message
                            }
                        </p>
                    )}
                </div>

                {/* Message */}
                <div>
                    <label
                        htmlFor="message"
                        className="label-wedding"
                    >
                        {t(
                            'message.label'
                        )}
                    </label>

                    <textarea
                        {...register(
                            'message'
                        )}
                        id="message"
                        placeholder={t(
                            'message.placeholder'
                        )}
                        className="input-wedding resize-none"
                        rows={3}
                        maxLength={500}
                        disabled={
                            isLoading
                        }
                    />

                    {errors.message && (
                        <p className="mt-1.5 text-xs text-destructive">
                            {
                                errors
                                    .message
                                    .message
                            }
                        </p>
                    )}
                </div>

                {/* Privacy */}
                <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-4">
                    <input
                        {...register(
                            'isPublic'
                        )}
                        type="checkbox"
                        id="isPublic"
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-[hsl(var(--primary))]"
                        disabled={
                            isLoading
                        }
                    />

                    <label
                        htmlFor="isPublic"
                        className="cursor-pointer select-none text-xs leading-5 text-muted-foreground"
                    >
                        {t('privacy')}
                    </label>
                </div>
            </div>

            {/* UPLOAD PROGRESS */}
            {isLoading && (
                <div className="space-y-3">
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-300 ease-out"
                            style={{
                                width: `${progress}%`,
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {uploadState ===
                            'compressing'
                                ? t(
                                    'progress.optimizing'
                                )
                                : t(
                                    'progress.uploading'
                                )}
                        </p>

                        <span className="text-[10px] tabular-nums text-muted-foreground">
                            {progress}%
                        </span>
                    </div>
                </div>
            )}

            {/* SUBMIT */}
            <button
                type="submit"
                disabled={
                    isLoading ||
                    !selectedFile
                }
                className="btn-primary w-full justify-center py-3.5"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin"/>

                        {uploadState ===
                        'compressing'
                            ? t(
                                'progress.optimizing'
                            )
                            : t(
                                'progress.uploading'
                            )}
                    </>
                ) : (
                    <>
                        <Upload className="h-4 w-4"/>

                        {t('submit')}
                    </>
                )}
            </button>
        </form>
    )
}