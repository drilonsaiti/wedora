'use client'

import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, User, MessageSquare, Loader2, ImageIcon, ArrowLeftRight } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import loadImage from 'blueimp-load-image'
import { uploadFormSchema, type UploadFormValues, fileSchema } from '@/schemas'
import { uploadPhotoAction } from '@/actions/upload'
import { getOrCreateSessionId, formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UploadFormProps {
  eventId: string
}

type UploadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'

/** Filter presets (beautiful for wedding photos) */
const filterOptions = [
  { id: 'none', label: 'Normale', css: 'none' },
  { id: 'grayscale', label: 'Bardhë e zi', css: 'grayscale(100%)' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(85%)' },
  { id: 'warm', label: 'E ngrohtë', css: 'brightness(108%) contrast(108%) saturate(125%) hue-rotate(8deg)' },
  { id: 'cool', label: 'E ftohtë', css: 'brightness(105%) contrast(110%) saturate(115%) hue-rotate(-15deg)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(45%) contrast(112%) brightness(92%)' },
  { id: 'dramatic', label: 'Dramatike', css: 'contrast(125%) brightness(88%) saturate(75%)' },
  { id: 'soft', label: 'E butë', css: 'brightness(110%) contrast(95%) saturate(90%)' },
] as const

/** Bake final image with flip + filter + text overlay (using Canvas) */
async function bakeFinalImage(
    originalFile: File,
    isFlipped: boolean,
    filterCss: string,
    overlayText: string
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!

      ctx.save()

      // 1. Horizontal flip (if user tapped the mirror button)
      if (isFlipped) {
        ctx.translate(img.width, 0)
        ctx.scale(-1, 1)
      }

      // 2. Apply selected filter
      if (filterCss && filterCss !== 'none') {
        ctx.filter = filterCss
      }

      // 3. Draw the image (flipped + filtered)
      ctx.drawImage(img, 0, 0, img.width, img.height)

      // 4. Reset transformations & filter for text
      ctx.restore()
      ctx.filter = 'none'

      // 5. Draw elegant text overlay (if provided)
      if (overlayText.trim()) {
        const fontSize = Math.max(28, Math.min(52, img.width / 14))
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetY = 4
        ctx.fillStyle = '#ffffff'
        ctx.font = `700 ${fontSize}px Georgia, serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'

        const x = img.width / 2
        const y = img.height - 45
        ctx.fillText(overlayText.trim(), x, y)
      }

      // Export as JPEG
      canvas.toBlob(
          (blob) => {
            if (blob) {
              const finalFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
              resolve(finalFile)
            } else {
              resolve(originalFile)
            }
          },
          'image/jpeg',
          0.92
      )
    }
    img.src = URL.createObjectURL(originalFile)
  })
}

export function UploadForm({ eventId }: UploadFormProps) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('none')
  const [textOnImage, setTextOnImage] = useState('')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
  })

  const handleFileSelect = useCallback(async (file: File) => {
    setFileError(null)
    setIsFlipped(false)
    setSelectedFilter('none')
    setTextOnImage('')

    const result = fileSchema.safeParse(file)
    if (!result.success) {
      setFileError(result.error.errors[0]?.message ?? 'Invalid file')
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
              canvas.toBlob(
                  (blob) => (blob ? resolve(blob) : reject()),
                  'image/jpeg',
                  0.92
              )
            },
            {
              orientation: true,
              canvas: true,
              maxWidth: 2048,
              maxHeight: 2048,
            }
        )
      })

      const orientedFile = new File([orientedBlob], 'photo.jpg', { type: 'image/jpeg' })

      const corrected = await imageCompression(orientedFile, {
        maxSizeMB: 3,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.92,
        exifOrientation: 1,
      })

      setSelectedFile(corrected)
      const url = URL.createObjectURL(corrected)
      setPreview(url)
    } catch {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }, [])

  const clearFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setSelectedFile(null)
    setPreview(null)
    setIsFlipped(false)
    setSelectedFilter('none')
    setTextOnImage('')
    setFileError(null)
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }, [preview])

  const toggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const onSubmit = async (values: UploadFormValues) => {
    if (!selectedFile) {
      setFileError('Please select a photo first')
      return
    }

    setServerError(null)
    setUploadState('compressing')
    setProgress(10)

    try {
      let finalFile = selectedFile

      // Extra compression if needed
      if (finalFile.size > 3 * 1024 * 1024) {
        finalFile = await imageCompression(finalFile, {
          maxSizeMB: 3,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.85,
          exifOrientation: 1,
        })
      }

      // Bake everything: flip + filter + text overlay
      setProgress(35)
      finalFile = await bakeFinalImage(finalFile, isFlipped, selectedFilter, textOnImage)

      setProgress(40)
      setUploadState('uploading')

      const sessionId = getOrCreateSessionId()
      const fd = new FormData()
      fd.append('file', finalFile, 'photo.jpg')
      fd.append('eventId', eventId)
      fd.append('sessionId', sessionId)
      if (values.guestName) fd.append('guestName', values.guestName)
      if (values.message) fd.append('message', values.message)

      setProgress(60)

      const result = await uploadPhotoAction(fd)
      setProgress(100)

      if (!result.success) {
        setServerError(result.error ?? 'Upload failed')
        setUploadState('error')
        return
      }

      setUploadState('done')
      router.push('/success')
    } catch (err) {
      console.error(err)
      setServerError('Something went wrong. Please try again.')
      setUploadState('error')
    }
  }

  const isLoading = uploadState === 'compressing' || uploadState === 'uploading'

  return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo Selection */}
        {!selectedFile ? (
            <div className="space-y-4">
              <div className="card-wedding p-6 text-center border-dashed border-2 border-border">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-[hsl(var(--primary))]" strokeWidth={1.5} />
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
                    <Camera className="w-6 h-6 text-[hsl(var(--primary))]" strokeWidth={1.5} />
                    <span className="font-sans text-xs font-medium">Camera</span>
                  </button>

                  <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-[hsl(var(--primary))]" strokeWidth={1.5} />
                    <span className="font-sans text-xs font-medium">Gallery</span>
                  </button>
                </div>
              </div>

              {fileError && (
                  <p className="text-sm text-destructive text-center">{fileError}</p>
              )}
            </div>
        ) : (
            <>
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={preview!}
                    alt="Preview"
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{
                      filter: selectedFilter,
                      transform: isFlipped ? 'scaleX(-1)' : 'none',
                    }}
                />

                {/* Live text overlay on preview */}
                {textOnImage && (
                    <div
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 px-8 py-3 text-white text-2xl font-medium tracking-wide text-center drop-shadow-2xl pointer-events-none max-w-[85%]"
                        style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {textOnImage}
                    </div>
                )}

                {!isLoading && (
                    <>
                      {/* Clear button */}
                      <button
                          type="button"
                          onClick={clearFile}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Flip button */}
                      <button
                          type="button"
                          onClick={toggleFlip}
                          className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs px-3 h-8 rounded-full font-sans transition-colors"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        {isFlipped ? 'Ktheje normal' : 'Rrotullo'}

                      </button>
                    </>
                )}

                {selectedFile && (
                    <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-sans">
                      {formatBytes(selectedFile.size)}
                    </div>
                )}
              </div>

              {/* === EDIT SECTION: Filters + Text on Image === */}
              <div className="mt-5 space-y-5">
                {/* Filters */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-sans">
                    Filters
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

                {/* Text on image */}
                <div>
                  <label className="label-wedding flex items-center gap-1">
                    <span>Tekst mbi foton (opsionale)</span>
                  </label>
                  <input
                      type="text"
                      value={textOnImage}
                      onChange={(e) => setTextOnImage(e.target.value)}
                      placeholder="p.sh. Dashuri e përjetshme ❤️"
                      className="input-wedding"
                      maxLength={60}
                      disabled={isLoading}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 font-sans">
                    Teksti do të shtypet bukur në fund të fotos
                  </p>
                </div>
              </div>
            </>
        )}

        {/* Hidden file inputs */}
        <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileSelect(f)
            }}
        />
        <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileSelect(f)
            }}
        />

        {/* Optional fields (guest name + message) */}
        <div className="space-y-4">
          <div>
            <label className="label-wedding">
              <User className="w-3 h-3 inline mr-1" />
              Emri juaj (opsionale)
            </label>
            <input
                {...register('guestName')}
                type="text"
                placeholder="e.g. Emma & Tom"
                className="input-wedding"
                maxLength={100}
                disabled={isLoading}
            />
            {errors.guestName && (
                <p className="mt-1 text-xs text-destructive">{errors.guestName.message}</p>
            )}
          </div>

          <div>
            <label className="label-wedding">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Mesazhi (opsionale)
            </label>
            <textarea
                {...register('message')}
                placeholder="Ndaj një urim ose kujtim…"
                className="input-wedding resize-none"
                rows={3}
                maxLength={500}
                disabled={isLoading}
            />
            {errors.message && (
                <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isLoading && (
            <div className="space-y-2">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center font-sans">
                {uploadState === 'compressing' ? 'Optimising your photo…' : 'Uploading…'}
              </p>
            </div>
        )}

        {/* Server error */}
        {serverError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-sans">{serverError}</p>
            </div>
        )}

        {/* Submit */}
        <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="btn-primary w-full justify-center"
        >
          {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadState === 'compressing' ? 'Optimising…' : 'Uploading…'}
              </>
          ) : (
              <>
                <Upload className="w-4 h-4" />
                Dërgo foton
              </>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center font-sans">
          Fotot janë private dhe shihen vetëm nga çifti
        </p>
      </form>
  )
}