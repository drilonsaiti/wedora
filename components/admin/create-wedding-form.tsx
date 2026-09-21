"use client";

import {type CSSProperties, useState} from "react";

import {
    ArrowRight,
    CalendarDays,
    Check,
    Copy,
    ImageUp,
    Link as LinkIcon,
    Loader2,
    Mail,
    MapPin,
    Palette,
    Users,
} from "lucide-react";
import {useTranslations} from "next-intl";
import {useForm, useWatch} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";

import {createWedding} from "@/actions/wedding";
import {ColorPicker} from "@/components/ui/color-picker";
import {useRouter} from "@/lib/navigation";
import {type CreateWeddingInput, createWeddingSchema} from "@/schemas";
import {generateWeddingTheme} from "@/lib/theme";
import {cn} from "@/lib/utils";
import {toast} from "sonner";

interface CreateWeddingFormProps {
    adminEmail: string;
    onSuccess?: (weddingId: string) => void;
}

interface Credential {
    email: string;
    password: string;
    role: "groom" | "bride";
}

export function CreateWeddingForm({
                                      adminEmail,
                                      onSuccess,
                                  }: CreateWeddingFormProps) {
    const router = useRouter();

    const t = useTranslations("dashboard");

    const tw = useTranslations("weddings");

    const [serverError, setServerError] = useState<string | null>(null);

    const [slugTouched, setSlugTouched] = useState(false);

    const [credentials, setCredentials] = useState<Credential[] | null>(null);

    const [createdWeddingId, setCreatedWeddingId] = useState<string | null>(null);

    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const [failedEmails, setFailedEmails] = useState<string[] | undefined>(
        undefined,
    );

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: {errors, isSubmitting},
    } = useForm<CreateWeddingInput>({
        resolver: zodResolver(createWeddingSchema),
        defaultValues: {
            groom_name: "",
            bride_name: "",
            groom_email: "",
            bride_email: "",
            slug: "",
            theme_hue: 355,
            wedding_date: "",
            enable_find_seat: true,
            enable_photo_upload: true,
        },
    });
    const [
        themeHue,
        groomName,
        brideName,
        photoUploadEnabled,
    ] = useWatch({
        control,
        name: [
            "theme_hue",
            "groom_name",
            "bride_name",
            "enable_photo_upload",
        ],
    });

    const previewTheme = generateWeddingTheme(themeHue);


    const handleNameBlur = () => {
        if (slugTouched) {
            return;
        }

        if (groomName && brideName) {
            setValue("slug", slugify(`${brideName}-${groomName}`));
        }
    };

    const handleCopy = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);

        setCopiedIndex(index);

        window.setTimeout(() => setCopiedIndex(null), 2000);
    };

    const onSubmit = async (data: CreateWeddingInput) => {
        setServerError(null);

        const result = await createWedding(data);

        if (!result.success) {
            setServerError(result.error);

            return;
        }

        setCreatedWeddingId(result.weddingId);

        setCredentials(result.credentials);

        toast.success(tw("notifications.created"));
    };

    /*
     * SUCCESS
     */
    if (credentials) {
        return (
            <div className="mx-auto w-full max-w-lg">
                <div className="text-center">
                    <div
                        className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[hsl(var(--primary))]/15 bg-[hsl(var(--accent))]">
                        <Check
                            className="h-6 w-6 text-[hsl(var(--primary))]"
                            strokeWidth={1.7}
                        />
                    </div>

                    <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                        Wedora Admin
                    </p>

                    <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                        {t("weddingCreated")}
                    </h2>

                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                        {t("saveCredentials")}
                    </p>
                </div>

                {/* Credentials */}
                {credentials.length > 0 && (
                    <div className="mt-7 overflow-hidden rounded-[1.5rem] border border-border/70 bg-background">
                        <div className="divide-y divide-border/60">
                            {credentials.map((credential, index) => (
                                <div key={credential.email} className="p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                                {credential.role === "groom"
                                                    ? tw("groom")
                                                    : tw("bride")}
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-foreground">
                                                {credential.email}
                                            </p>
                                        </div>

                                        <Mail className="h-4 w-4 text-muted-foreground"/>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <code
                                            className="min-w-0 flex-1 truncate rounded-xl bg-secondary px-3 py-2.5 font-mono text-xs text-foreground">
                                            {credential.password}
                                        </code>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                void handleCopy(credential.password, index)
                                            }
                                            className={cn(
                                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 transition-colors",
                                                copiedIndex === index
                                                    ? "bg-foreground text-background"
                                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                                            )}
                                        >
                                            {copiedIndex === index ? (
                                                <Check className="h-4 w-4"/>
                                            ) : (
                                                <Copy className="h-4 w-4"/>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {credentials.length === 0 && (
                    <p className="mt-6 text-center text-xs text-muted-foreground">
                        {t("noAccountCreated")}
                    </p>
                )}

                {/* Account creation error */}
                {failedEmails && failedEmails.length > 0 && (
                    <div
                        role="alert"
                        className="mt-5 rounded-2xl border border-destructive/15 bg-destructive/[0.06] p-4"
                    >
                        <p className="text-xs leading-5 text-destructive">
                            {t("failedToCreateAccount", {
                                emails: failedEmails.join(", "),
                            })}
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => {
                        if (!createdWeddingId) {
                            return;
                        }

                        if (onSuccess) {
                            onSuccess(createdWeddingId);

                            return;
                        }

                        router.push(`/admin/weddings/${createdWeddingId}`);
                    }}
                    className="btn-primary mt-7 w-full justify-center"
                >
                    {t("continueToDashboard")}

                    <ArrowRight className="h-4 w-4"/>
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-xl">
            {/* Header */}
            <header className="mb-8 pr-12">
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                    Wedora Admin
                </p>

                <h1 className="font-serif text-3xl font-light tracking-tight text-foreground sm:text-4xl">
                    {t("createYourWedding")}
                </h1>

                <p className="mt-3 text-xs text-muted-foreground">{adminEmail}</p>
            </header>

            <div className="space-y-8">
                {/* Couple */}
                <FormSection icon={Users} title={`${tw("groom")} & ${tw("bride")}`}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            label={tw("groomName")}
                            error={errors.groom_name?.message}
                        >
                            <input
                                {...register("groom_name", {
                                    onBlur: handleNameBlur,
                                })}
                                type="text"
                                placeholder="Drilon"
                                className="input-wedding h-12"
                            />
                        </FormField>

                        <FormField
                            label={tw("brideName")}
                            error={errors.bride_name?.message}
                        >
                            <input
                                {...register("bride_name", {
                                    onBlur: handleNameBlur,
                                })}
                                type="text"
                                placeholder="Sara"
                                className="input-wedding h-12"
                            />
                        </FormField>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            label={`${tw("groomName")} Email`}
                            required
                            error={errors.groom_email?.message}
                        >
                            <input
                                {...register("groom_email")}
                                type="email"
                                placeholder="drilon@example.com"
                                autoComplete="off"
                                className="input-wedding h-12"
                            />
                        </FormField>

                        <FormField
                            label={`${tw("brideName")} Email`}
                            optional
                            error={errors.bride_email?.message}
                        >
                            <input
                                {...register("bride_email")}
                                type="email"
                                placeholder="sara@example.com"
                                autoComplete="off"
                                className="input-wedding h-12"
                            />
                        </FormField>
                    </div>

                    <div className="mt-4 rounded-xl bg-secondary/35 px-4 py-3">
                        <p className="text-[10px] leading-5 text-muted-foreground">
                            {t("accountsWillBeCreated")}
                        </p>
                    </div>
                </FormSection>

                {/* Wedding details */}
                <FormSection icon={CalendarDays} title={tw("date")}>
                    <FormField label={tw("date")} error={errors.wedding_date?.message}>
                        <input
                            {...register("wedding_date")}
                            type="date"
                            className="input-wedding h-12"
                        />
                    </FormField>

                    <div className="mt-4">
                        <FormField label={t("publicUrl")} error={errors.slug?.message}>
                            <div
                                className="flex h-12 items-center rounded-xl border border-input bg-background px-4 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                                <LinkIcon
                                    className="mr-3 h-4 w-4 shrink-0 text-muted-foreground"
                                    strokeWidth={1.6}
                                />

                                <span className="mr-0.5 text-sm text-muted-foreground">/</span>

                                <input
                                    {...register("slug", {
                                        onChange: () => setSlugTouched(true),
                                    })}
                                    type="text"
                                    placeholder="sara-drilon"
                                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </FormField>
                    </div>
                </FormSection>

                {/* Theme */}
                <FormSection icon={Palette} title={t("themeColor")}>
                    <ColorPicker
                        value={themeHue}
                        onChange={(hue) => setValue("theme_hue", hue)}
                    />

                    <div
                        className="mt-4 overflow-hidden rounded-[1.5rem] border border-border/70 bg-background p-5"
                        style={previewTheme as CSSProperties}
                    >
                        <p className="mb-4 text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {t("preview")}
                        </p>

                        <div className="flex items-center justify-between gap-4">
                            <p className="font-serif text-2xl font-light text-foreground">
                                {brideName || tw("bride")} & {groomName || tw("groom")}
                            </p>

                            <div
                                className="h-9 w-9 shrink-0 rounded-full shadow-sm"
                                style={{
                                    backgroundColor: `hsl(${previewTheme["--primary"]})`,
                                }}
                            />
                        </div>
                    </div>
                </FormSection>

                {/* Features */}
                <FormSection icon={MapPin} title={t("activeFunctions")}>
                    <div className="space-y-2">
                        <FeatureToggle
                            icon={MapPin}
                            title={tw("emri")}
                            description={t("findSeatDescription")}
                        >
                            <input
                                type="checkbox"
                                {...register("enable_find_seat")}
                                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                            />
                        </FeatureToggle>

                        <FeatureToggle
                            icon={ImageUp}
                            title={tw("create")}
                            description={t("photoUploadDescription")}
                        >
                            <input
                                type="checkbox"
                                {...register("enable_photo_upload")}
                                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                            />
                        </FeatureToggle>
                    </div>

                    {errors.enable_find_seat && (
                        <p className="mt-2 text-xs text-destructive">
                            {errors.enable_find_seat.message}
                        </p>
                    )}
                </FormSection>

                {/* Photo limits */}
                {photoUploadEnabled && (
                    <FormSection icon={ImageUp} title={t("totalPhotoLimit")}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label={t("totalPhotoLimit")}>
                                <input
                                    {...register("max_photos_total", {
                                        valueAsNumber: true,
                                    })}
                                    type="number"
                                    min={1}
                                    placeholder={t("noLimit")}
                                    className="input-wedding h-12"
                                />

                                <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
                                    {t("leaveEmptyForNoLimit")}
                                </p>
                            </FormField>

                            <FormField label={t("photoLimitPerGuest")}>
                                <input
                                    {...register("max_photos_per_guest", {
                                        valueAsNumber: true,
                                    })}
                                    type="number"
                                    min={1}
                                    placeholder={t("noLimit")}
                                    className="input-wedding h-12"
                                />

                                <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
                                    {t("howManyPhotosPerGuest")}
                                </p>
                            </FormField>
                        </div>
                    </FormSection>
                )}

                {/* Error */}
                {serverError && (
                    <div
                        role="alert"
                        className="rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3.5"
                    >
                        <p className="text-xs leading-5 text-destructive">{serverError}</p>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full justify-center py-3.5 disabled:opacity-60"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin"/>

                            {t("creating")}
                        </>
                    ) : (
                        <>
                            <PlusIcon/>

                            {tw("create")}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

function FormSection({
                         icon: Icon,
                         title,
                         children,
                     }: {
    icon: typeof Users;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section>
            <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
                    <Icon
                        className="h-3.5 w-3.5 text-[hsl(var(--primary))]"
                        strokeWidth={1.6}
                    />
                </div>

                <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {title}
                </h2>
            </div>

            {children}
        </section>
    );
}

function FormField({
                       label,
                       children,
                       error,
                       required,
                       optional,
                   }: {
    label: string;
    children: React.ReactNode;
    error?: string;
    required?: boolean;
    optional?: boolean;
}) {
    return (
        <div>
            <label className="label-wedding">
                {label}

                {required && <span className="ml-1 text-destructive">*</span>}

                {optional && (
                    <span className="ml-1 normal-case tracking-normal text-muted-foreground/60">
            optional
          </span>
                )}
            </label>

            {children}

            {error && (
                <p className="mt-1.5 text-xs leading-5 text-destructive">{error}</p>
            )}
        </div>
    );
}

function FeatureToggle({
                           icon: Icon,
                           title,
                           description,
                           children,
                       }: {
    icon: typeof MapPin;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <label
            className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:bg-secondary/30">
            <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <Icon
                        className="h-3.5 w-3.5 text-muted-foreground"
                        strokeWidth={1.6}
                    />
                </div>

                <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>

            {children}
        </label>
    );
}

function PlusIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
        >
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
        </svg>
    );
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}
