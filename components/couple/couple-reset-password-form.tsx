"use client";

import { useEffect, useMemo, useState } from "react";

import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { Link } from "@/lib/navigation";

export function CoupleResetPasswordForm() {
    const router = useRouter();
    const t = useTranslations("auth");

    const [error, setError] = useState<string | null>(null);

    const [success, setSuccess] = useState(false);

    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    /*
     * `null` while we check whether Supabase
     * established a valid recovery session from
     * the emailed link, `true`/`false` once known.
     */
    const [linkValid, setLinkValid] = useState<boolean | null>(null);

    /*
     * Verify the recovery session on mount.
     */
    useEffect(() => {
        let active = true;

        const checkSession = async () => {
            const supabase = await createClient();

            const { data } = await supabase.auth.getSession();

            if (active) {
                setLinkValid(!!data.session);
            }
        };

        checkSession();

        return () => {
            active = false;
        };
    }, []);

    /*
     * Schema depends on translations, therefore
     * memoise it instead of recreating it unnecessarily.
     */
    const resetPasswordSchema = useMemo(
        () =>
            z
                .object({
                    password: z.string().min(8, t("passwordMinLength")),
                    confirmPassword: z.string(),
                })
                .refine((data) => data.password === data.confirmPassword, {
                    message: t("passwordsDoNotMatch"),
                    path: ["confirmPassword"],
                }),
        [t],
    );

    type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
    });

    /*
     * Redirect after successful password change.
     */
    useEffect(() => {
        if (!success) return;

        const timeout = window.setTimeout(() => {
            router.push("/couple/login");
        }, 2000);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [success, router]);

    const onSubmit = async (values: ResetPasswordValues) => {
        if (loading) {
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const supabase = await createClient();

            const { error: updateError } = await supabase.auth.updateUser({
                password: values.password,
            });

            if (updateError) {
                setError(t("unexpectedError"));
                return;
            }

            setSuccess(true);
        } catch {
            setError(t("unexpectedError"));
        } finally {
            setLoading(false);
        }
    };

    /*
     * Still checking whether the recovery link
     * established a valid session.
     */
    if (linkValid === null) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    /*
     * EXPIRED / ALREADY USED LINK
     */
    if (!linkValid) {
        return (
            <div className="py-3 text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-destructive/15 bg-destructive/[0.06]">
                    <AlertCircle className="h-6 w-6 text-destructive" strokeWidth={1.7} />
                </div>

                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-destructive">
                    {t("resetLinkExpiredEyebrow")}
                </p>

                <h2 className="font-serif text-3xl font-light tracking-[-0.02em] text-foreground">
                    {t("resetLinkExpiredTitle")}
                </h2>

                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                    {t("resetLinkExpiredDescription")}
                </p>

                <Link
                    href="/couple/forgot-password"
                    className="btn-primary mt-7 w-full justify-center"
                >
                    {t("requestNewLink")}
                </Link>
            </div>
        );
    }

    /*
     * Success
     */
    if (success) {
        return (
            <div className="py-3 text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[hsl(var(--primary))]/15 bg-[hsl(var(--accent))]">
                    <Check
                        className="h-6 w-6 text-[hsl(var(--primary))]"
                        strokeWidth={1.7}
                    />
                </div>

                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                    {t("passwordChangedEyebrow")}
                </p>

                <h2 className="font-serif text-3xl font-light tracking-[-0.02em] text-foreground">
                    {t("passwordChanged")}
                </h2>

                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                    {t("redirectingToLogin")}
                </p>

                <Link
                    href="/couple/login"
                    className="btn-secondary mt-7 w-full justify-center"
                >
                    {t("signIn")}
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* New password */}
            <div>
                <label htmlFor="password" className="label-wedding">
                    {t("newPassword")}
                </label>

                <div className="relative">
                    <Lock
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={1.6}
                    />

                    <input
                        {...register("password")}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={loading}
                        className="input-wedding h-12 pl-11 pr-11"
                    />

                    <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={loading}
                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" strokeWidth={1.6} />
                        ) : (
                            <Eye className="h-4 w-4" strokeWidth={1.6} />
                        )}
                    </button>
                </div>

                {errors.password && (
                    <p className="mt-1.5 text-xs leading-5 text-destructive">
                        {errors.password.message}
                    </p>
                )}
            </div>

            {/* Confirm password */}
            <div>
                <label htmlFor="confirmPassword" className="label-wedding">
                    {t("confirmPassword")}
                </label>

                <div className="relative">
                    <Lock
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={1.6}
                    />

                    <input
                        {...register("confirmPassword")}
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={loading}
                        className="input-wedding h-12 pl-11 pr-11"
                    />

                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        disabled={loading}
                        aria-label={
                            showConfirmPassword ? t("hidePassword") : t("showPassword")
                        }
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                        {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" strokeWidth={1.6} />
                        ) : (
                            <Eye className="h-4 w-4" strokeWidth={1.6} />
                        )}
                    </button>
                </div>

                {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs leading-5 text-destructive">
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>

            {/* Error */}
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3.5"
                >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

                    <p className="text-xs leading-5 text-destructive">{error}</p>
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3.5"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />

                        {t("saving")}
                    </>
                ) : (
                    <>
                        <Lock className="h-4 w-4" />

                        {t("changePassword")}
                    </>
                )}
            </button>
        </form>
    );
}
