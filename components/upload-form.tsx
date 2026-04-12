'use client'

import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, User, MessageSquare, Loader2, ImageIcon } from 'lucide-react'
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

/**
 * Reads the EXIF orientation from a file using blueimp-load-image,
 * which correctly parses all 8 EXIF orientation values including
 * mirrored ones (2, 4, 5, 7) that affect front-camera selfies.
 * Returns 1 (normal) if no EXIF data is found.
 */
async function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    loadImage.parseMetaData(file, (data) => {
      if (data.exif) {
        resolve(data.exif.get('Orientation') as number || 1)
      } else {
        resolve(1)
      }
    })
  })
}

export function UploadForm({ eventId }: UploadFormProps) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
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

    const result = fileSchema.safeParse(file)
    if (!result.success) {
      setFileError(result.error.errors[0]?.message ?? 'Invalid file')
      return
    }

    try {
      // 1. Use blueimp-load-image to apply EXIF orientation (including mirrors for front-camera selfies)
      const orientedBlob = await new Promise<Blob>((resolve, reject) => {
        loadImage(
            file,
            (canvas) => {
              if (!(canvas instanceof HTMLCanvasElement)) {
                reject(new Error('Failed to create oriented canvas'))
                return
              }
              canvas.toBlob(
                  (blob) => {
                    if (blob) resolve(blob)
                    else reject(new Error('Failed to create blob from canvas'))
                  },
                  'image/jpeg',
                  0.92 // initial quality
              )
            },
            {
              orientation: true,   // ← automatically reads EXIF and applies correct rotation + mirror
              canvas: true,        // forces canvas output so we can control the result
              maxWidth: 2048,
              maxHeight: 2048,
            }
        )
      })

      const orientedFile = new File([orientedBlob], 'photo.jpg', { type: 'image/jpeg' })

      // 2. Now compress the already-oriented file (no need to pass exifOrientation again)
      const corrected = await imageCompression(orientedFile, {
        maxSizeMB: 3,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.92,
        exifOrientation: 1, // already baked in by blueimp
      })

      setSelectedFile(corrected)
      const url = URL.createObjectURL(corrected)
      setPreview(url)
    } catch (err) {
      console.error('Orientation correction failed, using fallback', err)
      // Fallback: raw file
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }, [])

  const clearFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setSelectedFile(null)
    setPreview(null)
    setFileError(null)
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }, [preview])

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
      if (selectedFile.size > 3 * 1024 * 1024) {
        finalFile = await imageCompression(selectedFile, {
          maxSizeMB: 3,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.85,
          // orientation is already baked in — pass 1 (no-op)
          exifOrientation: 1,
        })
      }

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
            <div className="relative rounded-2xl overflow-hidden bg-muted aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                  src={preview!}
                  alt="Preview"
                  className="w-full h-full object-cover"
              />
              {!isLoading && (
                  <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
              )}
              {selectedFile && (
                  <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-sans">
                    {formatBytes(selectedFile.size)}
                  </div>
              )}
            </div>
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

        {/* Optional fields */}
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