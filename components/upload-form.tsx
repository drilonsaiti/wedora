'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  Camera, Upload, X, User, MessageSquare,
  Loader2, ImageIcon, SwitchCamera,
} from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { uploadFormSchema, type UploadFormValues, fileSchema } from '@/schemas'
import { uploadPhotoAction } from '@/actions/upload'
import { getOrCreateSessionId, formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UploadFormProps { eventId: string }
type UploadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'
type CameraFacing = 'user' | 'environment'

export function UploadForm({ eventId }: UploadFormProps) {
  const router = useRouter()

  // Form / file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false)
  const [facing, setFacing] = useState<CameraFacing>('user')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [flipping, setFlipping] = useState(false)

  // Refs — stream and facing kept in refs so callbacks don't go stale
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const facingRef = useRef<CameraFacing>('user')
  const galleryRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
  })

  // ── Detect multiple cameras once ──
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
        .then(devices => setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1))
        .catch(() => {})
  }, [])

  // ── Apply mirror transform via ref — avoids remounting the video element ──
  const applyMirror = useCallback((isFront: boolean) => {
    if (videoRef.current) {
      videoRef.current.style.transform = isFront ? 'scaleX(-1)' : 'none'
    }
  }, [])

  // ── Start stream ──
  const startStream = useCallback(async (facingMode: CameraFacing) => {
    setCameraError(null)
    setCameraReady(false)

    // Stop existing tracks
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    // Clear old srcObject so iOS doesn't hold onto the dead stream
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    let stream: MediaStream | null = null

    // Three fallback constraint levels
    const constraintSets = [
      { video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: facingMode }, audio: false },
      { video: true, audio: false },
    ]

    for (const constraints of constraintSets) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        break
      } catch (err: any) {
        const name = err?.name ?? ''
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
              'Camera access denied. Open your browser settings, allow camera access for this site, then try again.'
          )
          return
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.')
          return
        }
        // OverconstrainedError or NotReadableError — try next fallback
      }
    }

    if (!stream) {
      setCameraError('Could not start camera. Try the Gallery option instead.')
      return
    }

    streamRef.current = stream

    const video = videoRef.current
    if (!video) {
      stream.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setCameraError('Internal error. Please reload the page and try again.')
      return
    }

    video.srcObject = stream

    // Apply mirror before play so first frame is already correct
    applyMirror(facingMode === 'user')

    // Wait for metadata so dimensions are known (required on iOS)
    await new Promise<void>(resolve => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve()
        return
      }
      const handler = () => { video.removeEventListener('loadedmetadata', handler); resolve() }
      video.addEventListener('loadedmetadata', handler)
    })

    try {
      await video.play()
    } catch {
      // Some browsers block autoplay — the stream still shows a frame
    }

    setCameraReady(true)
  }, [applyMirror])

  // ── Open camera — always opens front camera first ──
  const openCamera = useCallback(async () => {
    setCameraOpen(true)
    facingRef.current = 'user'
    setFacing('user')
    // Yield to React so the video element's display:block takes effect before we assign srcObject
    await new Promise(r => setTimeout(r, 80))
    await startStream('user')
  }, [startStream])

  // ── Close camera ──
  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.style.transform = 'none'
    }
    setCameraOpen(false)
    setCameraReady(false)
    setCameraError(null)
  }, [])

  // ── Flip camera ──
  const flipCamera = useCallback(async () => {
    if (flipping) return
    setFlipping(true)
    const next: CameraFacing = facingRef.current === 'user' ? 'environment' : 'user'
    facingRef.current = next
    setFacing(next)
    await startStream(next)
    setFlipping(false)
  }, [flipping, startStream])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // ── Capture photo ──
  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !cameraReady) return

    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    // Front camera live preview is CSS-mirrored (looks like a mirror to the user).
    // On capture, flip horizontally so the SAVED image is NOT mirrored.
    if (facingRef.current === 'user') {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, w, h)

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      if (preview) URL.revokeObjectURL(preview)
      setSelectedFile(file)
      setPreview(URL.createObjectURL(blob))
      closeCamera()
    }, 'image/jpeg', 0.92)
  }, [cameraReady, closeCamera, preview])

  // ── Gallery select ──
  const handleGallerySelect = useCallback(async (file: File) => {
    setFileError(null)
    const result = fileSchema.safeParse(file)
    if (!result.success) { setFileError(result.error.errors[0]?.message ?? 'Invalid file'); return }

    try {
      const loadImage = (await import('blueimp-load-image')).default
      const orientation = await new Promise<number>(resolve => {
        loadImage.parseMetaData(file, (data: any) => {
          resolve((data.exif?.get('Orientation') as number) || 1)
        })
      })
      const compressed = await imageCompression(file, {
        maxSizeMB: 3, maxWidthOrHeight: 2048, useWebWorker: true,
        fileType: 'image/jpeg', initialQuality: 0.92, exifOrientation: orientation,
      })
      if (preview) URL.revokeObjectURL(preview)
      setSelectedFile(compressed)
      setPreview(URL.createObjectURL(compressed))
    } catch {
      if (preview) URL.revokeObjectURL(preview)
      setSelectedFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }, [preview])

  const clearFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setSelectedFile(null); setPreview(null); setFileError(null)
    if (galleryRef.current) galleryRef.current.value = ''
  }, [preview])

  // ── Submit ──
  const onSubmit = async (values: UploadFormValues) => {
    if (!selectedFile) { setFileError('Please select a photo first'); return }
    setServerError(null); setUploadState('compressing'); setProgress(10)
    try {
      let finalFile = selectedFile
      if (selectedFile.size > 3 * 1024 * 1024) {
        finalFile = await imageCompression(selectedFile, {
          maxSizeMB: 3, maxWidthOrHeight: 2048, useWebWorker: true,
          fileType: 'image/jpeg', initialQuality: 0.85, exifOrientation: 1,
        })
      }
      setProgress(40); setUploadState('uploading')
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
      if (!result.success) { setServerError(result.error ?? 'Upload failed'); setUploadState('error'); return }
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
      <>
        {/*
        VIDEO IS ALWAYS IN THE DOM — never conditionally rendered.
        This is the key fix for iOS Safari: assigning video.srcObject to an
        element that isn't mounted yet silently fails and looks like a
        permissions error even when permission was granted.
        We show/hide it with CSS only.
      */}
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
                'fixed inset-0 w-full h-full object-cover bg-black z-50',
                cameraOpen ? 'block' : 'hidden'
            )}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera controls overlay — rendered separately so video stays mounted */}
        {cameraOpen && (
            <div className="fixed inset-0 z-[51] flex flex-col">
              {/* Error */}
              {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/90">
                    <div className="bg-card rounded-2xl p-6 text-center max-w-xs w-full">
                      <p className="text-sm font-sans text-foreground leading-relaxed mb-5">
                        {cameraError}
                      </p>
                      <button onClick={closeCamera} className="btn-primary w-full justify-center">
                        Go Back
                      </button>
                    </div>
                  </div>
              )}

              {/* Loading spinner */}
              {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
              )}

              {/* Bottom controls */}
              <div className="absolute bottom-0 inset-x-0 pb-safe">
                <div className="bg-gradient-to-t from-black/80 to-transparent px-6 pt-12 pb-10">
                  <div className="flex items-center justify-between max-w-sm mx-auto">
                    {/* Close */}
                    <button
                        onClick={closeCamera}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* Shutter */}
                    <button
                        onClick={capturePhoto}
                        disabled={!cameraReady}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center
                             active:scale-95 transition-transform disabled:opacity-40
                             ring-4 ring-white/40"
                    >
                      <div className="w-16 h-16 rounded-full border-4 border-black bg-white" />
                    </button>

                    {/* Flip */}
                    {hasMultipleCameras ? (
                        <button
                            onClick={flipCamera}
                            disabled={!cameraReady || flipping}
                            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-40"
                        >
                          {flipping
                              ? <Loader2 className="w-5 h-5 animate-spin" />
                              : <SwitchCamera className="w-5 h-5" />
                          }
                        </button>
                    ) : (
                        <div className="w-12" />
                    )}
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* ── Main form ── */}
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
                {fileError && <p className="text-sm text-destructive text-center">{fileError}</p>}
              </div>
          ) : (
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview!} alt="Preview" className="w-full h-full object-cover" />
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

          <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleGallerySelect(f) }}
          />

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
              {errors.guestName && <p className="mt-1 text-xs text-destructive">{errors.guestName.message}</p>}
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
              {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>}
            </div>
          </div>

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

          {serverError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive font-sans">{serverError}</p>
              </div>
          )}

          <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="btn-primary w-full justify-center"
          >
            {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{uploadState === 'compressing' ? 'Optimising…' : 'Uploading…'}</>
            ) : (
                <><Upload className="w-4 h-4" />Dërgo foton</>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center font-sans">
            Fotot janë private dhe shihen vetëm nga çifti
          </p>
        </form>
      </>
  )
}