'use client'

import {
    type CSSProperties,
    type ReactNode,
    useEffect,
    useState,
} from 'react'

import {
    ArrowLeft,
    CalendarDays,
    Check,
    Copy,
    ImageUp,
    Loader2,
    Mail,
    MapPin,
    Palette,
    Save,
    Settings2,
    Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { updateWedding } from '@/actions/wedding'
import { ColorPicker } from '@/components/ui/color-picker'
import { Link } from '@/lib/navigation'
import { generateWeddingTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import {
    editWeddingSchema,
    type EditWeddingInput,
} from '@/schemas'

interface WeddingSettings {
    theme_color?: string | null
    enable_find_seat?: boolean | null
    enable_photo_upload?: boolean | null
}

export interface Wedding {
    id: string
    groom_name: string | null
    bride_name: string | null
    groom_email: string | null
    bride_email: string | null
    wedding_date: string | null
    slug: string | null

    wedding_settings:
        | WeddingSettings
        | WeddingSettings[]
        | null
}

interface Credential {
    email: string
    password: string
    role: 'groom' | 'bride'
}

interface EditWeddingFormProps {
    wedding: Wedding

    /*
     * When true, the form is being rendered
     * inside a Modal.
     */
    modal?: boolean

    /*
     * Called after a successful normal save.
     * We intentionally do not call it when
     * credentials/errors need to remain visible.
     */
    onSuccess?: () => void
}

export function EditWeddingForm({
                                    wedding,
                                    modal = false,
                                    onSuccess,
                                }: EditWeddingFormProps) {
    const t =
        useTranslations(
            'weddings.settingsPage'
        )

    const tw =
        useTranslations(
            'weddings'
        )

    const tc =
        useTranslations(
            'common'
        )

    const tv =
        useTranslations(
            'validation'
        )

    const [
        saved,
        setSaved,
    ] =
        useState(false)

    const [
        serverError,
        setServerError,
    ] =
        useState<string | null>(
            null
        )

    const [
        newCredentials,
        setNewCredentials,
    ] =
        useState<
            Credential[] | undefined
        >(undefined)

    const [
        failedEmails,
        setFailedEmails,
    ] =
        useState<
            string[] | undefined
        >(undefined)

    const [
        copiedIndex,
        setCopiedIndex,
    ] =
        useState<number | null>(
            null
        )

    /*
     * Supabase relation can return
     * either an object or an array.
     */
    const settings =
        Array.isArray(
            wedding.wedding_settings
        )
            ? wedding
                .wedding_settings[0] ??
            {}
            : wedding.wedding_settings ??
            {}

    /*
     * Read stored theme hue.
     */
    let initialHue = 355

    try {
        const theme =
            JSON.parse(
                settings.theme_color ??
                '{}'
            )

        const match =
            theme[
                '--primary'
                ]?.match(/^(\d+)/)

        if (match) {
            initialHue =
                Number.parseInt(
                    match[1],
                    10
                )
        }
    } catch {
        initialHue = 355
    }

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: {
            errors,
            isSubmitting,
        },
    } =
        useForm<EditWeddingInput>(
            {
                resolver:
                    zodResolver(
                        editWeddingSchema
                    ),

                defaultValues: {
                    groom_name:
                        wedding.groom_name ??
                        '',

                    bride_name:
                        wedding.bride_name ??
                        '',

                    groom_email:
                        wedding.groom_email ??
                        '',

                    bride_email:
                        wedding.bride_email ??
                        '',

                    wedding_date:
                        wedding.wedding_date ??
                        '',

                    theme_hue:
                    initialHue,

                    enable_find_seat:
                        settings.enable_find_seat ??
                        true,

                    enable_photo_upload:
                        settings.enable_photo_upload ??
                        true,
                },
            }
        )

    const themeHue =
        watch(
            'theme_hue'
        )

    const groomName =
        watch(
            'groom_name'
        )

    const brideName =
        watch(
            'bride_name'
        )

    const previewTheme =
        generateWeddingTheme(
            themeHue
        )

    /*
     * Reset visual "saved" status.
     */
    useEffect(() => {
        if (!saved) {
            return
        }

        const timeout =
            window.setTimeout(
                () => {
                    setSaved(
                        false
                    )
                },
                2500
            )

        return () =>
            window.clearTimeout(
                timeout
            )
    }, [saved])

    const onSubmit =
        async (
            data: EditWeddingInput
        ) => {
            setSaved(false)
            setServerError(null)
            setNewCredentials(
                undefined
            )
            setFailedEmails(
                undefined
            )

            try {
                const result =
                    await updateWedding(
                        wedding.id,
                        data
                    )

                if (
                    !result.success
                ) {
                    setServerError(
                        result.error ??
                        t(
                            'saveFailed'
                        )
                    )

                    return
                }

                const credentials =
                    result.credentials ??
                    []

                const failed =
                    result.failedEmails ??
                    []

                setSaved(
                    true
                )

                setNewCredentials(
                    credentials
                )

                setFailedEmails(
                    failed
                )

                /*
                 * Important:
                 *
                 * If passwords were generated,
                 * keep the modal open so the admin
                 * can copy them.
                 *
                 * Same when account creation failed.
                 */
                const needsAttention =
                    credentials.length >
                    0 ||
                    failed.length >
                    0

                if (
                    onSuccess &&
                    !needsAttention
                ) {
                    onSuccess()
                }
            } catch (
                error
                ) {
                console.error(
                    'Update wedding error:',
                    error
                )

                setServerError(
                    t(
                        'saveFailed'
                    )
                )
            }
        }

    const handleCopy =
        async (
            text: string,
            index: number
        ) => {
            try {
                await navigator.clipboard.writeText(
                    text
                )

                setCopiedIndex(
                    index
                )

                window.setTimeout(
                    () => {
                        setCopiedIndex(
                            null
                        )
                    },
                    2000
                )
            } catch (
                error
                ) {
                console.error(
                    'Clipboard error:',
                    error
                )
            }
        }

    const weddingName =
        [
            groomName,
            brideName,
        ]
            .filter(Boolean)
            .join(' & ') ||
        wedding.slug ||
        tw('title')

    return (
        <>
            {/* =====================================
                BACK
                Only on standalone settings page.
            ===================================== */}
            {!modal && (
                <Link
                    href={`/admin/weddings/${wedding.id}`}
                    className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft
                        className="h-3.5 w-3.5"
                        strokeWidth={
                            1.6
                        }
                    />

                    {t(
                        'backToWedding'
                    )}
                </Link>
            )}

            {/* =====================================
                HEADER
            ===================================== */}
            <header
                className={cn(
                    modal
                        ? 'mb-7 pr-10'
                        : 'mb-8'
                )}
            >
                <div className="mb-3 flex items-center gap-2">
                    <Settings2
                        className="h-3.5 w-3.5 text-[hsl(var(--primary))]"
                        strokeWidth={
                            1.6
                        }
                    />

                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                        {t(
                            'eyebrow'
                        )}
                    </p>
                </div>

                <h1
                    className={cn(
                        'font-serif font-light tracking-[-0.025em] text-foreground',
                        modal
                            ? 'text-3xl sm:text-4xl'
                            : 'text-4xl sm:text-5xl'
                    )}
                >
                    {t(
                        'title'
                    )}
                </h1>

                <p className="mt-3 text-sm font-medium text-foreground">
                    {
                        weddingName
                    }
                </p>

                <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
                    {t(
                        'description'
                    )}
                </p>
            </header>

            <form
                onSubmit={handleSubmit(
                    onSubmit
                )}
                className="space-y-5"
            >
                {/* =====================================
                    COUPLE
                ===================================== */}
                <SettingsSection
                    icon={Users}
                    title={t(
                        'coupleDetails'
                    )}
                    modal={
                        modal
                    }
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            label={tw(
                                'groomName'
                            )}
                            error={translateValidation(
                                errors
                                    .groom_name
                                    ?.message,
                                tv
                            )}
                        >
                            <input
                                {...register(
                                    'groom_name'
                                )}
                                type="text"
                                className="input-wedding h-12"
                            />
                        </FormField>

                        <FormField
                            label={tw(
                                'brideName'
                            )}
                            error={translateValidation(
                                errors
                                    .bride_name
                                    ?.message,
                                tv
                            )}
                        >
                            <input
                                {...register(
                                    'bride_name'
                                )}
                                type="text"
                                className="input-wedding h-12"
                            />
                        </FormField>
                    </div>
                </SettingsSection>

                {/* =====================================
                    ACCOUNTS
                ===================================== */}
                <SettingsSection
                    icon={Mail}
                    title={t(
                        'accounts'
                    )}
                    modal={
                        modal
                    }
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            label={t(
                                'groomEmail'
                            )}
                            error={translateValidation(
                                errors
                                    .groom_email
                                    ?.message,
                                tv
                            )}
                        >
                            <input
                                {...register(
                                    'groom_email'
                                )}
                                type="email"
                                autoComplete="off"
                                className="input-wedding h-12"
                            />
                        </FormField>

                        <FormField
                            label={t(
                                'brideEmail'
                            )}
                            optional
                            optionalLabel={tc(
                                'optional'
                            )}
                            error={translateValidation(
                                errors
                                    .bride_email
                                    ?.message,
                                tv
                            )}
                        >
                            <input
                                {...register(
                                    'bride_email'
                                )}
                                type="email"
                                autoComplete="off"
                                className="input-wedding h-12"
                            />
                        </FormField>
                    </div>

                    <div className="mt-4 rounded-xl bg-secondary/35 px-4 py-3">
                        <p className="text-[10px] leading-5 text-muted-foreground">
                            {t(
                                'emailNotice'
                            )}
                        </p>
                    </div>
                </SettingsSection>

                {/* =====================================
                    WEDDING DETAILS
                ===================================== */}
                <SettingsSection
                    icon={
                        CalendarDays
                    }
                    title={t(
                        'weddingDetails'
                    )}
                    modal={
                        modal
                    }
                >
                    <FormField
                        label={tw(
                            'date'
                        )}
                        error={translateValidation(
                            errors
                                .wedding_date
                                ?.message,
                            tv
                        )}
                    >
                        <input
                            {...register(
                                'wedding_date'
                            )}
                            type="date"
                            className="input-wedding h-12"
                        />
                    </FormField>

                    {wedding.slug && (
                        <div className="mt-4">
                            <p className="label-wedding">
                                {t(
                                    'publicUrl'
                                )}
                            </p>

                            <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3">
                                <p className="font-mono text-xs text-muted-foreground">
                                    /
                                    {
                                        wedding.slug
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </SettingsSection>

                {/* =====================================
                    THEME
                ===================================== */}
                <SettingsSection
                    icon={
                        Palette
                    }
                    title={t(
                        'theme'
                    )}
                    modal={
                        modal
                    }
                >
                    <ColorPicker
                        value={
                            themeHue
                        }
                        onChange={(
                            hue
                        ) => {
                            setValue(
                                'theme_hue',
                                hue,
                                {
                                    shouldDirty:
                                        true,
                                }
                            )
                        }}
                    />

                    {/* Preview */}
                    <div
                        className="mt-5 overflow-hidden rounded-[1.5rem] border border-border/70 bg-background p-5"
                        style={
                            previewTheme as CSSProperties
                        }
                    >
                        <p className="mb-4 text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {t(
                                'preview'
                            )}
                        </p>

                        <div className="flex items-center justify-between gap-5">
                            <div className="min-w-0">
                                <p className="truncate font-serif text-2xl font-light text-foreground">
                                    {brideName ||
                                        tw(
                                            'bride'
                                        )}{' '}
                                    &{' '}
                                    {groomName ||
                                        tw(
                                            'groom'
                                        )}
                                </p>

                                <p className="mt-1 text-[10px] text-muted-foreground">
                                    {t(
                                        'themePreviewDescription'
                                    )}
                                </p>
                            </div>

                            <div
                                className="h-10 w-10 shrink-0 rounded-full border border-black/5 shadow-sm"
                                style={{
                                    backgroundColor: `hsl(${previewTheme['--primary']})`,
                                }}
                            />
                        </div>
                    </div>
                </SettingsSection>

                {/* =====================================
                    FEATURES
                ===================================== */}
                <SettingsSection
                    icon={
                        MapPin
                    }
                    title={t(
                        'features'
                    )}
                    modal={
                        modal
                    }
                >
                    <div className="space-y-2">
                        <FeatureToggle
                            icon={
                                MapPin
                            }
                            title={t(
                                'findSeat'
                            )}
                            description={t(
                                'findSeatDescription'
                            )}
                        >
                            <input
                                type="checkbox"
                                {...register(
                                    'enable_find_seat'
                                )}
                                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                            />
                        </FeatureToggle>

                        <FeatureToggle
                            icon={
                                ImageUp
                            }
                            title={t(
                                'photoUpload'
                            )}
                            description={t(
                                'photoUploadDescription'
                            )}
                        >
                            <input
                                type="checkbox"
                                {...register(
                                    'enable_photo_upload'
                                )}
                                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                            />
                        </FeatureToggle>
                    </div>

                    {errors
                        .enable_find_seat
                        ?.message && (
                        <p className="mt-2 text-xs text-destructive">
                            {translateValidation(
                                errors
                                    .enable_find_seat
                                    .message,
                                tv
                            )}
                        </p>
                    )}
                </SettingsSection>

                {/* =====================================
                    NEW CREDENTIALS
                ===================================== */}
                {newCredentials &&
                    newCredentials.length >
                    0 && (
                        <section className="rounded-[1.5rem] border border-[hsl(var(--primary))]/15 bg-[hsl(var(--accent))]/45 p-5">
                            <div className="mb-5">
                                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-background">
                                    <Check className="h-4 w-4 text-[hsl(var(--primary))]" />
                                </div>

                                <h2 className="text-sm font-medium text-foreground">
                                    {t(
                                        'newCredentials'
                                    )}
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {t(
                                        'newCredentialsDescription'
                                    )}
                                </p>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                                <div className="divide-y divide-border/60">
                                    {newCredentials.map(
                                        (
                                            credential,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    credential.email
                                                }
                                                className="p-4"
                                            >
                                                <div className="mb-3">
                                                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                                        {credential.role ===
                                                        'groom'
                                                            ? tw(
                                                                'groom'
                                                            )
                                                            : tw(
                                                                'bride'
                                                            )}
                                                    </p>

                                                    <p className="mt-1 text-sm font-medium text-foreground">
                                                        {
                                                            credential.email
                                                        }
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <code className="min-w-0 flex-1 truncate rounded-xl bg-secondary px-3 py-2.5 font-mono text-xs">
                                                        {
                                                            credential.password
                                                        }
                                                    </code>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleCopy(
                                                                credential.password,
                                                                index
                                                            )
                                                        }
                                                        aria-label={t(
                                                            'copyPassword'
                                                        )}
                                                        className={cn(
                                                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 transition-colors',
                                                            copiedIndex ===
                                                            index
                                                                ? 'bg-foreground text-background'
                                                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                                        )}
                                                    >
                                                        {copiedIndex ===
                                                        index ? (
                                                            <Check className="h-4 w-4" />
                                                        ) : (
                                                            <Copy className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                {/* =====================================
                    FAILED ACCOUNTS
                ===================================== */}
                {failedEmails &&
                    failedEmails.length >
                    0 && (
                        <div
                            role="alert"
                            className="rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3.5"
                        >
                            <p className="text-xs leading-5 text-destructive">
                                {t(
                                    'failedAccounts',
                                    {
                                        emails:
                                            failedEmails.join(
                                                ', '
                                            ),
                                    }
                                )}
                            </p>
                        </div>
                    )}

                {/* =====================================
                    SERVER ERROR
                ===================================== */}
                {serverError && (
                    <div
                        role="alert"
                        className="rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3.5"
                    >
                        <p className="text-xs leading-5 text-destructive">
                            {
                                serverError
                            }
                        </p>
                    </div>
                )}

                {/* =====================================
                    SAVE
                ===================================== */}
                <div
                    className={cn(
                        'z-20 pt-2',
                        !modal &&
                        'sticky bottom-4'
                    )}
                >
                    <div
                        className={cn(
                            modal
                                ? ''
                                : 'rounded-[1.5rem] border border-border/70 bg-card/90 p-2 shadow-lg backdrop-blur-xl'
                        )}
                    >
                        <button
                            type="submit"
                            disabled={
                                isSubmitting
                            }
                            className={cn(
                                'btn-primary w-full justify-center py-3.5 disabled:cursor-not-allowed disabled:opacity-60',
                                saved &&
                                'bg-foreground text-background'
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />

                                    {t(
                                        'saving'
                                    )}
                                </>
                            ) : saved ? (
                                <>
                                    <Check className="h-4 w-4" />

                                    {t(
                                        'saved'
                                    )}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />

                                    {t(
                                        'saveChanges'
                                    )}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </>
    )
}

/*
 * ============================================
 * SETTINGS SECTION
 * ============================================
 */
function SettingsSection({
                             icon: Icon,
                             title,
                             children,
                             modal,
                         }: {
    icon: typeof Users
    title: string
    children: ReactNode
    modal?: boolean
}) {
    return (
        <section
            className={cn(
                'border border-border/70 bg-card/80 shadow-sm',
                modal
                    ? 'rounded-[1.5rem] p-5'
                    : 'rounded-[2rem] p-5 sm:p-6'
            )}
        >
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                    <Icon
                        className="h-4 w-4 text-[hsl(var(--primary))]"
                        strokeWidth={
                            1.6
                        }
                    />
                </div>

                <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {title}
                </h2>
            </div>

            {children}
        </section>
    )
}

/*
 * ============================================
 * FORM FIELD
 * ============================================
 */
function FormField({
                       label,
                       children,
                       error,
                       optional,
                       optionalLabel,
                   }: {
    label: string
    children: ReactNode
    error?: string
    optional?: boolean
    optionalLabel?: string
}) {
    return (
        <div>
            <label className="label-wedding">
                {label}

                {optional && (
                    <span className="ml-1 normal-case tracking-normal text-muted-foreground/60">
                        {optionalLabel ??
                            'optional'}
                    </span>
                )}
            </label>

            {children}

            {error && (
                <p className="mt-1.5 text-xs leading-5 text-destructive">
                    {
                        error
                    }
                </p>
            )}
        </div>
    )
}

/*
 * ============================================
 * FEATURE TOGGLE
 * ============================================
 */
function FeatureToggle({
                           icon: Icon,
                           title,
                           description,
                           children,
                       }: {
    icon: typeof MapPin
    title: string
    description: string
    children: ReactNode
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:bg-secondary/30">
            <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <Icon
                        className="h-3.5 w-3.5 text-muted-foreground"
                        strokeWidth={
                            1.6
                        }
                    />
                </div>

                <div>
                    <p className="text-sm font-medium text-foreground">
                        {
                            title
                        }
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {
                            description
                        }
                    </p>
                </div>
            </div>

            {children}
        </label>
    )
}


function translateValidation(
    message:
        | string
        | undefined,
    translate: (
        key: string
    ) => string
) {
    if (!message) {
        return undefined
    }

    return translate(
        message.replace(
            'validation.',
            ''
        )
    )
}