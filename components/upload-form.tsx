'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  Camera, Upload, X, User, MessageSquare,
  Loader2, ImageIcon, SwitchCamera, ZoomIn, ZoomOut, Zap, ZapOff,
} from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { uploadFormSchema, type UploadFormValues, fileSchema } from '@/schemas'
import { uploadPhotoAction } from '@/actions/upload'
import { getOrCreateSessionId, formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UploadFormProps { eventId: string }
type UploadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'
type CameraFacing = 'user' | 'environment'

// Back-camera optical zoom steps shown as discrete buttons
const BACK_ZOOM_STEPS = [1, 2, 3]

export function UploadForm({ eventId }: UploadFormProps) {
  const router = useRouter()

  // ── Form / file state ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  // ── Camera state ──
  const [cameraOpen, setCameraOpen] = useState(false)
  const [facing, setFacing] = useState<CameraFacing>('user')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [flipping, setFlipping] = useState(false)

  // ── Flash state ──
  // flashEnabled: user has toggled flash ON (will fire at capture time, not now)
  // torchSupported: back camera hardware torch available
  // frontFlashing: white-screen overlay visible (front camera flash simulation)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [frontFlashing, setFrontFlashing] = useState(false)

  // ── Zoom state ──
  const [zoomSupported, setZoomSupported] = useState(false)
  const [zoomMin, setZoomMin] = useState(1)
  const [zoomMax, setZoomMax] = useState(1)
  const [currentZoom, setCurrentZoom] = useState(1)
  const [backZoomStep, setBackZoomStep] = useState(0)

  // ── Capture-confirm state ──
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)

  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const facingRef = useRef<CameraFacing>('user')
  const galleryRef = useRef<HTMLInputElement>(null)
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartZoomRef = useRef<number>(1)

  const { register, handleSubmit, formState: { errors } } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
  })

  // ── Apply mirror transform ──
  const applyMirror = useCallback((isFront: boolean) => {
    if (videoRef.current) {
      videoRef.current.style.transform = isFront ? 'scaleX(-1)' : 'none'
    }
  }, [])

  // ── Detect cameras (after permission so labels are visible) ──
  const detectCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1)
    } catch { /* ignore */ }
  }, [])

  // ── Probe track capabilities for torch + zoom ──
  const probeCapabilities = useCallback((stream: MediaStream) => {
    const track = stream.getVideoTracks()[0]
    if (!track) return
    const caps = track.getCapabilities?.() as any
    setTorchSupported(!!caps?.torch)
    setFlashEnabled(false)
    if (caps?.zoom) {
      setZoomSupported(true)
      setZoomMin(caps.zoom.min ?? 1)
      setZoomMax(caps.zoom.max ?? 1)
    } else {
      setZoomSupported(false)
    }
    setCurrentZoom(1)
    setBackZoomStep(0)
  }, [])

  // ── Apply zoom to current track ──
  const applyZoom = useCallback(async (zoom: number) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await (track.applyConstraints as any)({ advanced: [{ zoom }] })
      setCurrentZoom(zoom)
    } catch { /* zoom constraint unsupported */ }
  }, [])

  // ── Set torch on track directly ──
  const setTorch = useCallback(async (on: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await (track.applyConstraints as any)({ advanced: [{ torch: on }] })
    } catch { /* torch unavailable */ }
  }, [])

  // ── Start stream ──
  const startStream = useCallback(async (facingMode: CameraFacing) => {
    setCameraError(null)
    setCameraReady(false)
    setTorchSupported(false)
    setFlashEnabled(false)
    setZoomSupported(false)
    setCurrentZoom(1)
    setBackZoomStep(0)

    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null

    let stream: MediaStream | null = null
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
          setCameraError('Camera access denied. Open your browser settings, allow camera access for this site, then try again.')
          return
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.')
          return
        }
      }
    }

    if (!stream) {
      setCameraError('Could not start camera. Try the Gallery option instead.')
      return
    }

    streamRef.current = stream
    await detectCameras()
    probeCapabilities(stream)

    const video = videoRef.current
    if (!video) {
      stream.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setCameraError('Internal error. Please reload the page and try again.')
      return
    }

    video.srcObject = stream
    applyMirror(facingMode === 'user')

    await new Promise<void>(resolve => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) { resolve(); return }
      const handler = () => { video.removeEventListener('loadedmetadata', handler); resolve() }
      video.addEventListener('loadedmetadata', handler)
    })

    try { await video.play() } catch { /* autoplay blocked */ }
    setCameraReady(true)
  }, [applyMirror, detectCameras, probeCapabilities])

  // ── Open camera ──
  const openCamera = useCallback(async () => {
    setCapturedBlob(null)
    setCapturedPreview(null)
    setCameraOpen(true)
    facingRef.current = 'user'
    setFacing('user')
    await new Promise(r => setTimeout(r, 80))
    await startStream('user')
  }, [startStream])

  // ── Shared stream teardown ──
  const teardownStream = useCallback(async () => {
    // Always ensure torch is off before stopping
    await setTorch(false)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.style.transform = 'none' }
  }, [setTorch])

  // ── Close camera ──
  const closeCamera = useCallback(async () => {
    await teardownStream()
    setCameraOpen(false)
    setCameraReady(false)
    setCameraError(null)
    setFlashEnabled(false)
    setTorchSupported(false)
    setZoomSupported(false)
    setCapturedBlob(null)
    setCapturedPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [teardownStream])

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

  // ── Back-camera discrete zoom steps ──
  const handleBackZoomStep = useCallback(async (stepIndex: number) => {
    const level = BACK_ZOOM_STEPS[stepIndex]
    const clamped = Math.min(Math.max(level, zoomMin), zoomMax)
    await applyZoom(clamped)
    setBackZoomStep(stepIndex)
  }, [applyZoom, zoomMin, zoomMax])

  // ── Front-camera pinch-to-zoom ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    pinchStartDistRef.current = Math.hypot(dx, dy)
    pinchStartZoomRef.current = currentZoom
  }, [currentZoom])

  const handleTouchMove = useCallback(async (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchStartDistRef.current === null) return
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const scale = dist / pinchStartDistRef.current
    const newZoom = Math.min(Math.max(pinchStartZoomRef.current * scale, zoomMin), zoomMax)
    await applyZoom(newZoom)
  }, [applyZoom, zoomMin, zoomMax])

  const handleTouchEnd = useCallback(() => {
    pinchStartDistRef.current = null
  }, [])

  // ── Front-camera +/- zoom buttons ──
  const zoomFrontBy = useCallback(async (delta: number) => {
    const next = Math.min(Math.max(currentZoom + delta, zoomMin), zoomMax)
    await applyZoom(next)
  }, [applyZoom, currentZoom, zoomMin, zoomMax])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // ── Capture photo ──
  // Flash behavior:
  //   Back camera + flashEnabled:  torch on → wait one frame → capture → torch off
  //   Front camera + flashEnabled: show white overlay → wait one frame → capture → hide overlay
  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !cameraReady) return

    const isFrontCapture = facingRef.current === 'user'

    if (flashEnabled) {
      if (isFrontCapture) {
        // ── Front flash: white screen overlay ──
        setFrontFlashing(true)
        // Give the browser one paint cycle to render the white overlay
        // before we read the video frame, so the image picks up extra light.
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      } else {
        // ── Back flash: fire hardware torch ──
        await setTorch(true)
        // Let the torch stabilise for one frame
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      }
    }

    // ── Draw frame ──
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    // Flip canvas for front camera so saved image is not mirrored
    if (isFrontCapture) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, w, h)

    // ── Turn off flash ──
    if (flashEnabled) {
      if (isFrontCapture) {
        setFrontFlashing(false)
      } else {
        await setTorch(false)
      }
    }

    canvas.toBlob(blob => {
      if (!blob) return
      setCapturedBlob(blob)
      setCapturedPreview(URL.createObjectURL(blob))
    }, 'image/jpeg', 0.92)
  }, [cameraReady, flashEnabled, setTorch])

  // ── Confirm captured photo ──
  const confirmCapture = useCallback(async () => {
    if (!capturedBlob || !capturedPreview) return
    const file = new File([capturedBlob], 'photo.jpg', { type: 'image/jpeg' })
    if (preview) URL.revokeObjectURL(preview)
    setSelectedFile(file)
    setPreview(capturedPreview) // hand off — do NOT revoke
    setCapturedBlob(null)
    setCapturedPreview(null)
    await teardownStream()
    setCameraOpen(false)
    setCameraReady(false)
    setCameraError(null)
    setFlashEnabled(false)
    setTorchSupported(false)
    setZoomSupported(false)
  }, [capturedBlob, capturedPreview, preview, teardownStream])

  // ── Retake ──
  const retakePhoto = useCallback(() => {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview)
    setCapturedBlob(null)
    setCapturedPreview(null)
  }, [capturedPreview])

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
  const isFront = facing === 'user'
  // Flash button is always shown: front camera uses software flash, back camera uses torch (if supported)
  // For back camera without torch support we still show the button but it will use software flash as fallback
  const showFlashButton = true

  return (
      <>
        {/*
        VIDEO IS ALWAYS IN THE DOM — never conditionally rendered.
        iOS Safari silently fails when srcObject is assigned to an unmounted element.
        Show/hide with CSS only.
      */}
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onTouchStart={cameraOpen && !capturedPreview && zoomSupported ? handleTouchStart : undefined}
            onTouchMove={cameraOpen && !capturedPreview && zoomSupported ? handleTouchMove : undefined}
            onTouchEnd={cameraOpen && !capturedPreview && zoomSupported ? handleTouchEnd : undefined}
            className={cn(
                'fixed inset-0 w-full h-full object-cover bg-black z-50',
                cameraOpen ? 'block' : 'hidden'
            )}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* ── Camera UI overlay ── */}
        {cameraOpen && (
            <div className="fixed inset-0 z-[51] pointer-events-none">

              {/* ── Front-camera flash: white screen overlay ── */}
              {frontFlashing && (
                  <div className="absolute inset-0 bg-white z-[60] pointer-events-none" />
              )}

              {/* ── Error state ── */}
              {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/90 z-10 pointer-events-auto">
                    <div className="bg-card rounded-2xl p-6 text-center max-w-xs w-full">
                      <p className="text-sm font-sans text-foreground leading-relaxed mb-5">{cameraError}</p>
                      <button onClick={closeCamera} className="btn-primary w-full justify-center">Go Back</button>
                    </div>
                  </div>
              )}

              {/* ── Loading spinner ── */}
              {!cameraReady && !cameraError && !capturedPreview && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
              )}

              {/* ────────────────────────────────────────────────────
              CONFIRM SCREEN
              flex column fills the full viewport — action bar is
              always pinned at bottom, never scrolls out of view.
          ──────────────────────────────────────────────────── */}
              {capturedPreview && (
                  <div className="absolute inset-0 z-20 flex flex-col bg-black pointer-events-auto">
                    {/* Image fills all space above the action bar */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={capturedPreview}
                        alt="Captured photo preview"
                        className="flex-1 min-h-0 w-full object-contain"
                    />
                    {/* Action bar — solid black background, always visible */}
                    <div className="flex-shrink-0 bg-black px-6 pt-4 pb-8 safe-area-bottom">
                      <div className="flex items-center gap-3 max-w-sm mx-auto">
                        <button
                            onClick={retakePhoto}
                            className="flex-1 h-14 rounded-full bg-white/20 text-white text-sm font-medium
                               flex items-center justify-center gap-2
                               active:scale-95 transition-transform"
                        >
                          <X className="w-4 h-4" />
                          Retake
                        </button>
                        <button
                            onClick={confirmCapture}
                            className="flex-1 h-14 rounded-full bg-white text-black text-sm font-medium
                               flex items-center justify-center gap-2
                               active:scale-95 transition-transform"
                        >
                          <Upload className="w-4 h-4" />
                          Use photo
                        </button>
                      </div>
                    </div>
                  </div>
              )}

              {/* ────────────────────────────────────────────────────
              VIEWFINDER CONTROLS (hidden during confirm)
          ──────────────────────────────────────────────────── */}
              {!capturedPreview && (
                  <>
                    {/* ── Top bar: flash toggle (top-right) ── */}
                    {cameraOpen && (
                        <div className="absolute top-0 inset-x-0 flex justify-end px-5 pt-14 pointer-events-auto">
                          <button
                              onClick={() => setFlashEnabled(v => !v)}
                              disabled={!cameraReady}
                              aria-label={flashEnabled ? 'Flash on' : 'Flash off'}
                              className={cn(
                                  'w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-40',
                                  flashEnabled
                                      ? 'bg-yellow-400 text-black'
                                      : 'bg-black/40 backdrop-blur-sm text-white'
                              )}
                          >
                            {flashEnabled
                                ? <Zap className="w-5 h-5 fill-current" />
                                : <ZapOff className="w-5 h-5" />
                            }
                          </button>
                        </div>
                    )}

                    {/* ── Zoom strip (above shutter row) ── */}
                    {zoomSupported && (
                        <div className="absolute bottom-[148px] inset-x-0 flex justify-center pointer-events-auto">
                          {isFront ? (
                              /* Front camera: pinch-to-zoom + +/- buttons */
                              <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                                <button
                                    onClick={() => zoomFrontBy(-0.5)}
                                    disabled={!cameraReady || currentZoom <= zoomMin}
                                    aria-label="Zoom out"
                                    className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition-transform"
                                >
                                  <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-white text-sm font-semibold min-w-[40px] text-center tabular-nums">
                        {currentZoom.toFixed(1)}×
                      </span>
                                <button
                                    onClick={() => zoomFrontBy(0.5)}
                                    disabled={!cameraReady || currentZoom >= zoomMax}
                                    aria-label="Zoom in"
                                    className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition-transform"
                                >
                                  <ZoomIn className="w-4 h-4" />
                                </button>
                              </div>
                          ) : (
                              /* Back camera: discrete 1× 2× 3× steps */
                              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
                                {BACK_ZOOM_STEPS.map((step, i) => {
                                  if (step > zoomMax) return null
                                  const isActive = backZoomStep === i
                                  return (
                                      <button
                                          key={step}
                                          onClick={() => handleBackZoomStep(i)}
                                          disabled={!cameraReady}
                                          className={cn(
                                              'w-11 h-11 rounded-full text-sm font-semibold flex items-center justify-center transition-colors disabled:opacity-30 active:scale-95',
                                              isActive
                                                  ? 'bg-yellow-400 text-black'
                                                  : 'bg-white/20 text-white'
                                          )}
                                      >
                                        {step}×
                                      </button>
                                  )
                                })}
                              </div>
                          )}
                        </div>
                    )}

                    {/* ── Bottom row: close | shutter | flip ── */}
                    <div className="absolute bottom-0 inset-x-0 pointer-events-auto">
                      <div className="bg-gradient-to-t from-black/80 to-transparent px-6 pt-16 pb-10">
                        <div className="flex items-center justify-between max-w-sm mx-auto">

                          {/* Close */}
                          <button
                              onClick={closeCamera}
                              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
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
                                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-transform"
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
                  </>
              )}

            </div>
        )}

        {/* ── Main upload form ── */}
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