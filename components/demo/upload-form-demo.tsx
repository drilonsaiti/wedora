'use client'

import {useCallback, useRef, useState} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {ArrowLeftRight, Camera, CheckCircle2, ImageIcon, Loader2, MessageSquare, Upload, User, X} from 'lucide-react'
import imageCompression from 'browser-image-compression'
import loadImage from 'blueimp-load-image'
import {fileSchema, uploadFormSchema, type UploadFormValues} from '@/schemas'
import {cn, formatBytes} from '@/lib/utils'

type UploadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'

const filterOptions = [
    {id: 'none', label: 'Normale', css: 'none'},
    {id: 'grayscale', label: 'Bardhë e zi', css: 'grayscale(100%)'},
    {id: 'sepia', label: 'Sepia', css: 'sepia(85%)'},
    {id: 'warm', label: 'E ngrohtë', css: 'brightness(108%) contrast(108%) saturate(125%) hue-rotate(8deg)'},
    {id: 'cool', label: 'E ftohtë', css: 'brightness(105%) contrast(110%) saturate(115%) hue-rotate(-15deg)'},
    {id: 'vintage', label: 'Vintage', css: 'sepia(45%) contrast(112%) brightness(92%)'},
    {id: 'dramatic', label: 'Dramatike', css: 'contrast(125%) brightness(88%) saturate(75%)'},
    {id: 'soft', label: 'E butë', css: 'brightness(110%) contrast(95%) saturate(90%)'},
] as const

export function UploadFormDemo() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isFlipped, setIsFlipped] = useState(false)
    const [selectedFilter, setSelectedFilter] = useState<string>('none')
    const [uploadState, setUploadState] = useState<UploadState>('idle')
    const [progress, setProgress] = useState(0)
    const [fileError, setFileError] = useState<string | null>(null)
    const cameraRef = useRef<HTMLInputElement>(null)
    const galleryRef = useRef<HTMLInputElement>(null)

    const {
        register,
        handleSubmit,
        formState: {errors},
        reset,
    } = useForm<UploadFormValues>({
        resolver: zodResolver(uploadFormSchema),
        defaultValues: {isPublic: false},
    })

    const handleFileSelect = useCallback(async (file: File) => {
        setFileError(null)
        setIsFlipped(false)
        setSelectedFilter('none')

        const result = fileSchema.safeParse(file)
        if (!result.success) {
            setFileError(result.error.errors[0]?.message ?? 'Skedar i pavlefshëm')
            return
        }

        try {
            const orientedBlob = await new Promise<Blob>((resolve, reject) => {
                loadImage(
                    file,
                    (canvas) => {
                        if (!(canvas instanceof HTMLCanvasElement)) {
                            reject(new Error('Failed to create oriented canvas'))
                            return
                        }
                        canvas.toBlob((blob) => (blob ? resolve(blob) : reject()), 'image/jpeg', 0.92)
                    },
                    {orientation: true, canvas: true, maxWidth: 2048, maxHeight: 2048}
                )
            })

            const orientedFile = new File([orientedBlob], 'photo.jpg', {type: 'image/jpeg'})
            const corrected = await imageCompression(orientedFile, {
                maxSizeMB: 3,
                maxWidthOrHeight: 2048,
                useWebWorker: true,
                fileType: 'image/jpeg',
                initialQuality: 0.92,
                exifOrientation: 1,
            })

            setSelectedFile(corrected)
            setPreview(URL.createObjectURL(corrected))
        } catch {
            setSelectedFile(file)
            setPreview(URL.createObjectURL(file))
        }
    }, [])

    const clearFile = useCallback(() => {
        if (preview) URL.revokeObjectURL(preview)
        setSelectedFile(null)
        setPreview(null)
        setIsFlipped(false)
        setSelectedFilter('none')
        setFileError(null)
        if (cameraRef.current) cameraRef.current.value = ''
        if (galleryRef.current) galleryRef.current.value = ''
    }, [preview])

    const toggleFlip = useCallback(() => setIsFlipped((prev) => !prev), [])

    // ── SIMULIM, jo upload real — s'ka fetch, s'ka Supabase, s'ka storage ──
    const onSubmit = async (_values: UploadFormValues) => {
        if (!selectedFile) {
            setFileError('Ju lutem zgjidhni një foto së pari')
            return
        }

        setUploadState('compressing')
        setProgress(15)
        await new Promise((r) => setTimeout(r, 500))

        setProgress(45)
        setUploadState('uploading')
        await new Promise((r) => setTimeout(r, 700))

        setProgress(80)
        await new Promise((r) => setTimeout(r, 400))

        setProgress(100)
        setUploadState('done')
    }

    const handleReset = () => {
        clearFile()
        reset()
        setUploadState('idle')
        setProgress(0)
    }

    const isLoading = uploadState === 'compressing' || uploadState === 'uploading'

    if (uploadState === 'done') {
        return (
            <div className="text-center py-16 space-y-4">
                <div
                    className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-[hsl(var(--primary))]"/>
                </div>
                <h2 className="font-serif text-2xl font-light text-foreground">Foto u dërgua!</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Ky është vetëm një demonstrim — asnjë foto s&apos;u ngarkua në të vërtetë.
                </p>
                <button onClick={handleReset} className="btn-ghost mt-2">
                    Provo Sërish
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {!selectedFile ? (
                <div className="space-y-4">
                    <div className="card-wedding p-6 text-center border-dashed border-2 border-border">
                        <div
                            className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center mx-auto mb-4">
                            <ImageIcon className="w-8 h-8 text-[hsl(var(--primary))]" strokeWidth={1.5}/>
                        </div>
                        <p className="font-sans text-sm text-muted-foreground mb-6">
                            Zgjidh si dëshiron ta shtosh foton
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => cameraRef.current?.click()}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors"
                            >
                                <Camera className="w-6 h-6 text-[hsl(var(--primary))]" strokeWidth={1.5}/>
                                <span className="font-sans text-xs font-medium">Kamera</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => galleryRef.current?.click()}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors"
                            >
                                <Upload className="w-6 h-6 text-[hsl(var(--primary))]" strokeWidth={1.5}/>
                                <span className="font-sans text-xs font-medium">Galeria</span>
                            </button>
                        </div>
                    </div>
                    {fileError && <p className="text-sm text-destructive text-center">{fileError}</p>}
                </div>
            ) : (
                <>
                    <div className="relative rounded-2xl overflow-hidden bg-muted aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview!}
                            alt="Preview"
                            className="w-full h-full object-cover transition-all duration-300"
                            style={{filter: selectedFilter, transform: isFlipped ? 'scaleX(-1)' : 'none'}}
                        />
                        {!isLoading && (
                            <>
                                <button
                                    type="button"
                                    onClick={clearFile}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleFlip}
                                    className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs px-3 h-8 rounded-full font-sans transition-colors"
                                >
                                    <ArrowLeftRight className="w-4 h-4"/>
                                    {isFlipped ? 'Ktheje normal' : 'Rrotullo'}
                                </button>
                            </>
                        )}
                        {selectedFile && (
                            <div
                                className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-sans">
                                {formatBytes(selectedFile.size)}
                            </div>
                        )}
                    </div>

                    <div className="mt-5 space-y-5">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-sans">
                                Filtrat
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-3 snap-x">
                                {filterOptions.map((filter) => (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        onClick={() => setSelectedFilter(filter.css)}
                                        className={cn(
                                            'flex-shrink-0 snap-start px-5 py-2 text-sm font-medium rounded-3xl border transition-all whitespace-nowrap',
                                            selectedFilter === filter.css
                                                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-inner'
                                                : 'border-border hover:border-[hsl(var(--primary))]/30'
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <input
                ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f)
                }}
            />
            <input
                ref={galleryRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f)
                }}
            />

            <div className="space-y-4">
                <div>
                    <label className="label-wedding">
                        <User className="w-3 h-3 inline mr-1"/>
                        Emri juaj (opsionale)
                    </label>
                    <input {...register('guestName')} type="text" placeholder="p.sh. Emma & Tom"
                           className="input-wedding" maxLength={100} disabled={isLoading}/>
                    {errors.guestName && <p className="mt-1 text-xs text-destructive">{errors.guestName.message}</p>}
                </div>

                <div>
                    <label className="label-wedding">
                        <MessageSquare className="w-3 h-3 inline mr-1"/>
                        Mesazhi (opsionale)
                    </label>
                    <textarea {...register('message')} placeholder="Ndaj një urim ose kujtim…"
                              className="input-wedding resize-none" rows={3} maxLength={500} disabled={isLoading}/>
                    {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>}
                </div>

                <div
                    className="flex items-start gap-3 p-4 rounded-2xl bg-[hsl(var(--accent))] border border-[hsl(var(--gold))]/20">
                    <input {...register('isPublic')} type="checkbox" id="isPublic"
                           className="mt-1 w-4 h-4 rounded border-[hsl(var(--gold))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                           disabled={isLoading}/>
                    <label htmlFor="isPublic"
                           className="text-xs font-sans text-muted-foreground leading-relaxed cursor-pointer select-none">
                        Fotot janë private dhe shihen vetëm nga çifti. Nëse e shënoni këtë kutizë, fotoja mund të
                        shfaqet edhe në galerinë publike.
                    </label>
                </div>
            </div>

            {isLoading && (
                <div className="space-y-2">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300"
                             style={{width: `${progress}%`}}/>
                    </div>
                    <p className="text-xs text-muted-foreground text-center font-sans">
                        {uploadState === 'compressing' ? 'Duke optimizuar foton tuaj…' : 'Duke u ngarkuar…'}
                    </p>
                </div>
            )}

            <button type="submit" disabled={isLoading || !selectedFile} className="btn-primary w-full justify-center">
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin"/>
                        {uploadState === 'compressing' ? 'Duke optimizuar…' : 'Duke u ngarkuar…'}
                    </>
                ) : (
                    <>
                        <Upload className="w-4 h-4"/>
                        Dërgo foton
                    </>
                )}
            </button>
        </form>
    )
}