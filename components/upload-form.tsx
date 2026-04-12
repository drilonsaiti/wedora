'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  Camera,
  Upload,
  X,
  User,
  MessageSquare,
  Loader2,
  ImageIcon,
  SwitchCamera,
  ZoomIn,
} from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { uploadFormSchema, type UploadFormValues, fileSchema } from '@/schemas'
import { uploadPhotoAction } from '@/actions/upload'
import { getOrCreateSessionId, formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UploadFormProps {
  eventId: string
}

type UploadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'
type CameraFacing = 'user' | 'environment'

export function UploadForm({ eventId }: UploadFormProps) {
  const router = useRouter()

  // File / preview state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false)
  const [facing, setFacing] = useState<CameraFacing>('user')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
  })

  // ── Check if multiple cameras exist (for flip button) ──
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const videoInputs = devices.filter((d) => d.kind === 'videoinput')
      setHasMultipleCameras(videoInputs.length > 1)
    }).catch(() => {})
  }, [])

  // ── Open camera stream ──
  const startCamera = useCallback(async (facingMode: CameraFacing) => {
    // Stop existing stream first
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }

    setCameraError(null)

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        await videoRef.current.play()
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError(
          'Could not access camera. Please allow camera permission and try again.'
      )
    }
  }, [stream])

  // ── Cleanup stream on unmount ──
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  // ── Attach stream to video element when it mounts ──
  useEffect(() => {
    if (cameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [cameraOpen, stream])

  const openCamera = async () => {
    setCameraOpen(true)
    await startCamera(facing)
  }

  const closeCamera = () => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setCameraOpen(false)
    setCameraError(null)
  }

  const flipCamera = async () => {
    const newFacing = facing === 'user' ? 'environment' : 'user'
    setFacing(newFacing)
    await startCamera(newFacing)
  }

  // ── Capture photo from video stream ──
  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const w = video.videoWidth
    const h = video.videoHeight
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')!

    if (facing === 'user') {
      // Mirror the canvas horizontally to un-mirror the selfie.
      // The live preview video is already CSS-mirrored (so it looks natural).
      // When we capture, we flip it back so the saved image is NOT mirrored.
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, w, h)

    canvas.toBlob(
        (blob) => {
          if (!blob) return
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
          setSelectedFile(file)
          setPreview(URL.createObjectURL(blob))
          closeCamera()
        },
        'image/jpeg',
        0.92
    )
  }, [facing])

  // ── Gallery file select ──
  const handleGallerySelect = useCallback(async (file: File) => {
    setFileError(null)

    const result = fileSchema.safeParse(file)
    if (!result.success) {
      setFileError(result.error.errors[0]?.message ?? 'Invalid file')
      return
    }

    // For gallery images, use browser-image-compression with exifOrientation
    // to handle any rotation that EXIF may encode.
    // We read the raw file to let the library handle EXIF before compression strips it.
    try {
      // Dynamically import blueimp to read EXIF orientation
      const loadImage = (await import('blueimp-load-image')).default
      const orientation = await new Promise<number>((resolve) => {
        loadImage.parseMetaData(file, (data: any) => {
          resolve((data.exif?.get('Orientation') as number) || 1)
        })
      })

      const compressed = await imageCompression(file, {
        maxSizeMB: 3,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.92,
        exifOrientation: orientation,
      })

      setSelectedFile(compressed)
      setPreview(URL.createObjectURL(compressed))
    } catch {
      // Fallback: no EXIF correction, just use the file
      setSelectedFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }, [])

  const clearFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setSelectedFile(null)
    setPreview(null)
    setFileError(null)
    if (galleryRef.current) galleryRef.current.value = ''
  }, [preview])

  // ── Submit ──
  const onSubmit = async (values: UploadFormValues) => {
    if (!selectedFile) {
      setFileError('Please select a photo first')
      return
    }

    setServerError(null)
    setUploadState('compressing')
    setProgress(10)

    try {
      // Camera captures are already correct pixels, just compress size if needed
      let finalFile = selectedFile
      if (selectedFile.size > 3 * 1024 * 1024) {
        finalFile = await imageCompression(selectedFile, {
          maxSizeMB: 3,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.85,
          exifOrientation: 1, // already corrected
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

  // ─────────────────────────────────────────────
  // CAMERA UI (fullscreen overlay)
  // ─────────────────────────────────────────────
  if (cameraOpen) {
    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Video preview — CSS mirror for front camera so it feels natural */}
          <div className="flex-1 relative overflow-hidden">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                    'w-full h-full object-cover',
                    facing === 'user' && '[transform:scaleX(-1)]'
                )}
            />

            {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="bg-black/80 rounded-2xl p-6 text-center">
                    <p className="text-white text-sm font-sans leading-relaxed mb-4">
                      {cameraError}
                    </p>
                    <button onClick={closeCamera} className="btn-ghost text-white border-white/30">
                      Go back
                    </button>
                  </div>
                </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-black px-6 py-8 flex items-center justify-between">
            {/* Close */}
            <button
                onClick={closeCamera}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Shutter */}
            <button
                onClick={capturePhoto}
                disabled={!stream || !!cameraError}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center
                       hover:bg-white/90 active:scale-95 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed
                       ring-4 ring-white/30"
            >
              <div className="w-16 h-16 rounded-full bg-white border-4 border-black" />
            </button>

            {/* Flip camera */}
            {hasMultipleCameras ? (
                <button
                    onClick={flipCamera}
                    className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
            ) : (
                <div className="w-12" />
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
    )
  }

  // ─────────────────────────────────────────────
  // MAIN FORM
  // ─────────────────────────────────────────────
  return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                      onClick={openCamera}
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

        {/* Gallery file input — no capture attribute, pure file picker */}
        <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleGallerySelect(f)
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