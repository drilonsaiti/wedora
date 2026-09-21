"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {
    AlertCircle,
    ArrowLeftRight,
    Camera,
    Check,
    Clock3,
    Eye,
    FileWarning,
    ImageIcon,
    Images,
    Loader2,
    type LucideIcon,
    MessageSquare,
    Upload,
    User,
    X,
} from "lucide-react";
import {useTranslations} from "next-intl";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import imageCompression from "browser-image-compression";
import loadImage from "blueimp-load-image";

import {uploadPhotoAction, type UploadPhotoErrorCode} from "@/actions/upload";
import {fileSchema, uploadFormSchema, type UploadFormValues} from "@/schemas";
import {cn, formatBytes, getOrCreateSessionId} from "@/lib/utils";

interface UploadFormProps {
    eventId: string;
    maxPhotosPerGuest?: number | null;
    maxFileSizeMb: number;
}

type UploadState = "idle" | "compressing" | "uploading" | "done" | "error";

/*
 * ============================================
 * PIXEL FILTERS
 *
 * Canvas ctx.filter export can be unreliable
 * on iOS Safari. We therefore bake the chosen
 * filter directly into the pixel data.
 * ============================================
 */
function applyPixelFilter(imageData: ImageData, filterCss: string): void {
    const data = imageData.data;

    const len = data.length;

    switch (filterCss) {
        /*
         * GRAYSCALE
         */
        case "grayscale(100%)": {
            for (let i = 0; i < len; i += 4) {
                const gray =
                    data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

                data[i] = gray;

                data[i + 1] = gray;

                data[i + 2] = gray;
            }

            break;
        }

        /*
         * SEPIA
         */
        case "sepia(85%)": {
            for (let i = 0; i < len; i += 4) {
                const r = data[i];

                const g = data[i + 1];

                const b = data[i + 2];

                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);

                data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);

                data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }

            break;
        }

        /*
         * WARM
         */
        case "brightness(108%) contrast(108%) saturate(125%) hue-rotate(8deg)": {
            for (let i = 0; i < len; i += 4) {
                let r = data[i] * 1.08;

                let g = data[i + 1] * 1.08;

                let b = data[i + 2] * 1.08;

                r = r * 1.08 + g * 0.03;

                g = g * 1.01;

                b = b * 0.93;

                data[i] = Math.min(255, r);

                data[i + 1] = Math.min(255, g);

                data[i + 2] = Math.min(255, b);
            }

            break;
        }

        /*
         * COOL
         */
        case "brightness(105%) contrast(110%) saturate(115%) hue-rotate(-15deg)": {
            for (let i = 0; i < len; i += 4) {
                let r = data[i] * 1.02;

                let g = data[i + 1] * 1.06;

                let b = data[i + 2] * 1.13;

                r *= 0.96;
                g *= 1.01;
                b *= 1.04;

                data[i] = Math.min(255, r);

                data[i + 1] = Math.min(255, g);

                data[i + 2] = Math.min(255, b);
            }

            break;
        }

        /*
         * VINTAGE
         */
        case "sepia(45%) contrast(112%) brightness(92%)": {
            for (let i = 0; i < len; i += 4) {
                const r = data[i];

                const g = data[i + 1];

                const b = data[i + 2];

                const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;

                const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;

                const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;

                data[i] = Math.min(255, r * 0.55 + sepiaR * 0.45);

                data[i + 1] = Math.min(255, g * 0.55 + sepiaG * 0.45);

                data[i + 2] = Math.min(255, b * 0.55 + sepiaB * 0.45);
            }

            break;
        }

        /*
         * DRAMATIC
         */
        case "contrast(125%) brightness(88%) saturate(75%)": {
            for (let i = 0; i < len; i += 4) {
                data[i] = (data[i] - 128) * 1.25 + 128 * 0.88;

                data[i + 1] = (data[i + 1] - 128) * 1.25 + 128 * 0.88;

                data[i + 2] = (data[i + 2] - 128) * 1.25 + 128 * 0.88;
            }

            break;
        }

        /*
         * SOFT
         */
        case "brightness(110%) contrast(95%) saturate(90%)": {
            for (let i = 0; i < len; i += 4) {
                data[i] = Math.min(255, data[i] * 1.08);

                data[i + 1] = Math.min(255, data[i + 1] * 1.08);

                data[i + 2] = Math.min(255, data[i + 2] * 1.06);
            }

            break;
        }

        default:
            break;
    }
}

/*
 * ============================================
 * BAKE FINAL IMAGE
 *
 * Applies:
 * - horizontal flip
 * - selected filter
 *
 * Permanently before upload.
 * ============================================
 */
async function bakeFinalImage(
    originalFile: File,
    isFlipped: boolean,
    filterCss: string
): Promise<File> {
    /*
     * Nothing changed.
     */
    if (!isFlipped && filterCss === "none") {
        return originalFile;
    }

    return new Promise((resolve, reject) => {
        const image = new Image();

        const objectUrl = URL.createObjectURL(originalFile);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);

            try {
                const canvas = document.createElement("canvas");

                canvas.width = image.width;

                canvas.height = image.height;

                const context = canvas.getContext("2d");

                if (!context) {
                    resolve(originalFile);

                    return;
                }

                context.save();

                if (isFlipped) {
                    context.translate(image.width, 0);

                    context.scale(-1, 1);
                }

                context.drawImage(image, 0, 0);

                context.restore();

                if (filterCss !== "none") {
                    const imageData = context.getImageData(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    applyPixelFilter(imageData, filterCss);

                    context.putImageData(imageData, 0, 0);
                }

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(originalFile);

                            return;
                        }

                        resolve(
                            new File([blob], "photo.jpg", {
                                type: "image/jpeg",
                            })
                        );
                    },
                    "image/jpeg",
                    0.92
                );
            } catch (error) {
                console.error("Image processing error:", error);

                resolve(originalFile);
            }
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);

            reject(new Error("Unable to process image"));
        };

        image.src = objectUrl;
    });
}

type UploadFailure = {
    code: UploadPhotoErrorCode;
    retryAfterSeconds?: number;
};

export function UploadForm({eventId, maxPhotosPerGuest, maxFileSizeMb,}: UploadFormProps) {
    const t = useTranslations("wedding.upload");

    const tv = useTranslations("validation");
    const maxFileBytes = maxFileSizeMb * 1024 * 1024;
    /*
     * ============================================
     * FILTERS
     * ============================================
     */
    const filterOptions = useMemo(
        () =>
            [
                {
                    id: "none",
                    label: t("normal"),
                    css: "none",
                },
                {
                    id: "grayscale",
                    label: t("grayscale"),
                    css: "grayscale(100%)",
                },
                {
                    id: "sepia",
                    label: t("sepia"),
                    css: "sepia(85%)",
                },
                {
                    id: "warm",
                    label: t("warm"),
                    css: "brightness(108%) contrast(108%) saturate(125%) hue-rotate(8deg)",
                },
                {
                    id: "cool",
                    label: t("cool"),
                    css: "brightness(105%) contrast(110%) saturate(115%) hue-rotate(-15deg)",
                },
                {
                    id: "vintage",
                    label: t("vintage"),
                    css: "sepia(45%) contrast(112%) brightness(92%)",
                },
                {
                    id: "dramatic",
                    label: t("dramatic"),
                    css: "contrast(125%) brightness(88%) saturate(75%)",
                },
                {
                    id: "soft",
                    label: t("soft"),
                    css: "brightness(110%) contrast(95%) saturate(90%)",
                },
            ] as const,
        [t]
    );

    /*
     * ============================================
     * STATE
     * ============================================
     */
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [preview, setPreview] = useState<string | null>(null);

    const [isFlipped, setIsFlipped] = useState(false);

    const [selectedFilter, setSelectedFilter] = useState<string>("none");

    const [uploadState, setUploadState] = useState<UploadState>("idle");

    const [progress, setProgress] = useState(0);

    const [fileError, setFileError] = useState<string | null>(null);

    const [uploadFailure, setUploadFailure] = useState<UploadFailure | null>(
        null
    );

    const cameraRef = useRef<HTMLInputElement>(null);

    const galleryRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<UploadFormValues>({
        resolver: zodResolver(uploadFormSchema),

        defaultValues: {
            isPublic: false,
        },
    });

    /*
     * Revoke browser preview URL whenever
     * it is replaced or component unmounts.
     */
    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    /*
     * ============================================
     * TRANSLATE ZOD MESSAGE
     * ============================================
     */
    const validationMessage = useCallback(
        (message?: string | null) => {
            if (!message) {
                return undefined;
            }

            if (!message.startsWith("validation.")) {
                return message;
            }

            const key = message.replace("validation.", "");

            try {
                return tv(key as never);
            } catch {
                return message;
            }
        },
        [tv]
    );

    /*
     * ============================================
     * FILE SELECTION
     * ============================================
     */

    const handleFileSelect = useCallback(
        async (file: File) => {
            setFileError(null);

            setUploadFailure(null);

            setUploadState("idle");

            setProgress(0);

            setIsFlipped(false);

            setSelectedFilter("none");

            if (file.size > maxFileBytes) {
                setSelectedFile(null);

                setPreview(null);

                setFileError(t("errors.fileTooLarge"));

                return;
            }

            const result = fileSchema.safeParse(file);

            if (!result.success) {
                setSelectedFile(null);

                setPreview(null);

                setFileError(t("errors.invalidFile"));

                return;
            }

            try {
                const orientedBlob = await new Promise<Blob>((resolve, reject) => {
                    loadImage(
                        file,
                        (canvas) => {
                            if (!(canvas instanceof HTMLCanvasElement)) {
                                reject(new Error("Failed to create oriented canvas"));

                                return;
                            }

                            canvas.toBlob(
                                (blob) => {
                                    if (blob) {
                                        resolve(blob);
                                    } else {
                                        reject(new Error("Failed to export oriented image"));
                                    }
                                },
                                "image/jpeg",
                                0.92
                            );
                        },
                        {
                            orientation: true,
                            canvas: true,
                            maxWidth: 2048,
                            maxHeight: 2048,
                        }
                    );
                });

                const orientedFile = new File([orientedBlob], "photo.jpg", {
                    type: "image/jpeg",
                });

                const corrected = await imageCompression(orientedFile, {
                    maxSizeMB: 3,
                    maxWidthOrHeight: 2048,
                    useWebWorker: true,
                    fileType: "image/jpeg",
                    initialQuality: 0.92,
                    exifOrientation: 1,
                });

                setSelectedFile(corrected);

                setPreview(URL.createObjectURL(corrected));
            } catch (error) {
                console.error("Photo optimisation failed:", error);

                setSelectedFile(file);

                setPreview(URL.createObjectURL(file));
            }
        },
        [t, maxFileBytes]
    );

    /*
     * ============================================
     * CLEAR PHOTO
     * ============================================
     */
    const clearFile = useCallback(() => {
        setSelectedFile(null);

        setPreview(null);

        setIsFlipped(false);

        setSelectedFilter("none");

        setFileError(null);

        setUploadFailure(null);

        setProgress(0);

        setUploadState("idle");

        if (cameraRef.current) {
            cameraRef.current.value = "";
        }

        if (galleryRef.current) {
            galleryRef.current.value = "";
        }
    }, []);

    /*
     * ============================================
     * FLIP
     * ============================================
     */
    const toggleFlip = useCallback(() => {
        setIsFlipped((current) => !current);
    }, []);

    /*
     * ============================================
     * SUBMIT
     * ============================================
     */
    const onSubmit = async (values: UploadFormValues) => {
        if (!selectedFile) {
            setFileError(t("selectPhotoFirst"));

            return;
        }

        setFileError(null);

        setUploadFailure(null);

        setUploadState("compressing");

        setProgress(10);

        try {
            let finalFile = selectedFile;

            /*
             * Safety compression.
             */
            if (finalFile.size > 3 * 1024 * 1024) {
                finalFile = await imageCompression(finalFile, {
                    maxSizeMB: 3,

                    maxWidthOrHeight: 2048,

                    useWebWorker: true,

                    fileType: "image/jpeg",

                    initialQuality: 0.85,

                    exifOrientation: 1,
                });
            }

            setProgress(35);

            /*
             * Permanently bake flip + filter.
             */
            finalFile = await bakeFinalImage(finalFile, isFlipped, selectedFilter);

            setProgress(45);

            setUploadState("uploading");

            const sessionId = getOrCreateSessionId();

            const formData = new FormData();

            formData.append("file", finalFile, "photo.jpg");

            formData.append("eventId", eventId);

            formData.append("sessionId", sessionId);

            formData.append("isPublic", values.isPublic.toString());

            if (values.guestName) {
                formData.append("guestName", values.guestName);
            }

            if (values.message) {
                formData.append("message", values.message);
            }

            setProgress(65);

            const result = await uploadPhotoAction(formData);

            if (!result.success) {
                setUploadFailure({
                    code: result.code,

                    retryAfterSeconds: result.retryAfterSeconds,
                });

                setUploadState("error");

                return;
            }

            setProgress(100);

            setUploadState("done");
        } catch (error) {
            console.error("Photo upload failed:", error);

            setUploadFailure({
                code: "UNKNOWN",
            });

            setUploadState("error");
        }
    };

    const isLoading =
        uploadState === "compressing" || uploadState === "uploading";

    const currentProgressLabel =
        uploadState === "compressing" ? t("optimizing") : t("uploading");

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* =====================================
                LIMIT
            ===================================== */}
            {maxPhotosPerGuest != null && (
                <div className="flex justify-center">
          <span
              className="rounded-full border border-border/60 bg-card/70 px-3.5 py-1.5 text-[10px] font-medium text-muted-foreground">
            {t("maxPhotos", {
                count: maxPhotosPerGuest,
            })}
          </span>
                </div>
            )}

            {/* =====================================
                PHOTO SELECTION
            ===================================== */}
            {!selectedFile ? (
                <div className="space-y-3">
                    <section
                        className="rounded-[2rem] border border-dashed border-border bg-card/70 p-5 shadow-sm sm:p-6">
                        <div
                            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent))]">
                            <ImageIcon
                                className="h-6 w-6 text-[hsl(var(--primary))]"
                                strokeWidth={1.5}
                            />
                        </div>

                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground">
                                {t("selectMethod")}
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            {/* Camera */}
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => cameraRef.current?.click()}
                                className="group flex min-h-[108px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-secondary/30 hover:shadow-sm disabled:pointer-events-none disabled:opacity-50"
                            >
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
                                    <Camera className="h-4.5 w-4.5" strokeWidth={1.6}/>
                                </div>

                                <span className="text-xs font-medium text-foreground">
                  {t("camera")}
                </span>
                            </button>

                            {/* Gallery */}
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => galleryRef.current?.click()}
                                className="group flex min-h-[108px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-secondary/30 hover:shadow-sm disabled:pointer-events-none disabled:opacity-50"
                            >
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
                                    <Upload className="h-4.5 w-4.5" strokeWidth={1.6}/>
                                </div>

                                <span className="text-xs font-medium text-foreground">
                  {t("gallery")}
                </span>
                            </button>
                        </div>
                    </section>

                    {fileError && (
                        <div
                            role="alert"
                            className="rounded-xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3"
                        >
                            <p className="text-center text-xs leading-5 text-destructive">
                                {fileError}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-5">
                    {/* =================================
                        PREVIEW
                    ================================= */}
                    <div
                        className="relative aspect-square overflow-hidden rounded-[2rem] border border-border/60 bg-muted shadow-sm">
                        {preview && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={preview}
                                alt={t("preview")}
                                className="h-full w-full object-cover transition-[filter,transform] duration-300"
                                style={{
                                    filter: selectedFilter,

                                    transform: isFlipped ? "scaleX(-1)" : "none",
                                }}
                            />
                        )}

                        {/* Top gradient */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent"
                        />

                        {!isLoading && (
                            <>
                                {/* Flip */}
                                <button
                                    type="button"
                                    onClick={toggleFlip}
                                    aria-label={t("flipPhoto")}
                                    className="absolute left-3 top-3 flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-[11px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/55"
                                >
                                    <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={1.7}/>

                                    {isFlipped ? t("flipNormal") : t("flipRotate")}
                                </button>

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={clearFile}
                                    aria-label={t("removePhoto")}
                                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55"
                                >
                                    <X className="h-4 w-4"/>
                                </button>
                            </>
                        )}

                        {/* File size */}
                        <div
                            className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-medium text-white backdrop-blur-md">
                            {formatBytes(selectedFile.size)}
                        </div>
                    </div>

                    {/* =================================
                        FILTERS
                    ================================= */}
                    <div>
                        <p className="label-wedding mb-3">{t("filters")}</p>

                        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
                            {filterOptions.map((filter) => {
                                const active = selectedFilter === filter.css;

                                return (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() => setSelectedFilter(filter.css)}
                                        className={cn(
                                            "shrink-0 snap-start rounded-full border px-4 py-2 text-[11px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
                                            active
                                                ? "border-foreground bg-foreground text-background shadow-sm"
                                                : "border-border/70 bg-card text-muted-foreground hover:border-foreground/15 hover:text-foreground"
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================
                HIDDEN INPUTS
            ===================================== */}
            <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                        void handleFileSelect(file);
                    }
                }}
            />

            <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                        void handleFileSelect(file);
                    }
                }}
            />

            {/* =====================================
                GUEST DETAILS
            ===================================== */}
            <div className="space-y-4">
                {/* Name */}
                <div>
                    <label htmlFor="guest-name" className="label-wedding">
                        <User className="mr-1 inline h-3 w-3"/>

                        {t("yourName")}
                    </label>

                    <input
                        {...register("guestName")}
                        id="guest-name"
                        type="text"
                        placeholder={t("yourNamePlaceholder")}
                        className="input-wedding h-12"
                        maxLength={100}
                        disabled={isLoading}
                    />

                    {errors.guestName?.message && (
                        <p className="mt-1.5 text-xs leading-5 text-destructive">
                            {validationMessage(errors.guestName.message)}
                        </p>
                    )}
                </div>

                {/* Message */}
                <div>
                    <label htmlFor="guest-message" className="label-wedding">
                        <MessageSquare className="mr-1 inline h-3 w-3"/>

                        {t("message")}
                    </label>

                    <textarea
                        {...register("message")}
                        id="guest-message"
                        placeholder={t("messagePlaceholder")}
                        className="input-wedding min-h-[110px] resize-none"
                        rows={4}
                        maxLength={500}
                        disabled={isLoading}
                    />

                    {errors.message?.message && (
                        <p className="mt-1.5 text-xs leading-5 text-destructive">
                            {validationMessage(errors.message.message)}
                        </p>
                    )}
                </div>

                {/* =================================
                    PUBLIC GALLERY CONSENT
                ================================= */}
                <label
                    htmlFor="isPublic"
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-secondary/25 p-4 transition-colors hover:bg-secondary/40"
                >
                    <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.6}/>
                    </div>

                    <span className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
            {t("isPublicLabel")}
          </span>

                    <input
                        {...register("isPublic")}
                        id="isPublic"
                        type="checkbox"
                        disabled={isLoading}
                        className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                    />
                </label>
            </div>

            {/* =====================================
                PROGRESS
            ===================================== */}
            {isLoading && (
                <div className="space-y-3" aria-live="polite">
                    <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    >
                        <div
                            className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-300 ease-out"
                            style={{
                                width: `${progress}%`,
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground"/>

                        <p className="text-xs text-muted-foreground">
                            {currentProgressLabel}
                        </p>
                    </div>
                </div>
            )}

            {/* =====================================
                SERVER ERROR
            ===================================== */}
            {uploadFailure && <UploadFailureMessage failure={uploadFailure}/>}

            {/* =====================================
                SUBMIT
            ===================================== */}
            <button
                type="submit"
                disabled={isLoading || !selectedFile}
                className="btn-primary w-full justify-center py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin"/>

                        {currentProgressLabel}
                    </>
                ) : uploadState === "done" ? (
                    <>
                        <Check className="h-4 w-4"/>

                        {t("success.title")}
                    </>
                ) : (
                    <>
                        <Upload className="h-4 w-4"/>

                        {t("sendPhoto")}
                    </>
                )}
            </button>
        </form>
    );
}

function UploadFailureMessage({failure}: { failure: UploadFailure }) {
    const t = useTranslations("wedding.upload.errors");

    const config = {
        INVALID_FILE: {
            icon: FileWarning,
            title: t("invalidFileTitle"),
            description: t("invalidFile"),
        },

        FILE_TOO_LARGE: {
            icon: FileWarning,
            title: t("fileTooLargeTitle"),
            description: t("fileTooLarge"),
        },

        PHOTO_LIMIT_REACHED: {
            icon: Images,
            title: t("guestLimitTitle"),
            description: t("guestLimit"),
        },

        WEDDING_LIMIT_REACHED: {
            icon: Images,
            title: t("weddingLimitTitle"),
            description: t("weddingLimit"),
        },

        RATE_LIMITED: {
            icon: Clock3,
            title: t("rateLimitedTitle"),
            description: failure.retryAfterSeconds
                ? t("rateLimitedWithTime", {
                    seconds: failure.retryAfterSeconds,
                })
                : t("rateLimited"),
        },

        UPLOAD_DISABLED: {
            icon: AlertCircle,
            title: t("uploadDisabledTitle"),
            description: t("uploadDisabled"),
        },

        INVALID_EVENT: {
            icon: AlertCircle,
            title: t("unavailableTitle"),
            description: t("unavailable"),
        },

        STORAGE_ERROR: {
            icon: AlertCircle,
            title: t("uploadFailedTitle"),
            description: t("storageFailed"),
        },

        DATABASE_ERROR: {
            icon: AlertCircle,
            title: t("uploadFailedTitle"),
            description: t("temporaryFailure"),
        },

        UNKNOWN: {
            icon: AlertCircle,
            title: t("uploadFailedTitle"),
            description: t("temporaryFailure"),
        },
    } satisfies Record<
        UploadFailure["code"],
        {
            icon: LucideIcon;
            title: string;
            description: string;
        }
    >;

    const {icon: Icon, title, description} = config[failure.code];

    return (
        <div
            role="alert"
            className="rounded-2xl border border-destructive/15 bg-destructive/[0.055] p-4"
        >
            <div className="flex gap-3">
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <Icon className="h-4 w-4" strokeWidth={1.7}/>
                </div>

                <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-foreground">{title}</p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}
