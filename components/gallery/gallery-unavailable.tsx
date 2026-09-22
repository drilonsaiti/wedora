import { AlertTriangle, Clock3, Heart, Link2Off } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/navigation";

type GalleryUnavailableReason = "invalid" | "expired" | "error";

interface GalleryUnavailableProps {
    reason: GalleryUnavailableReason;
}

export async function GalleryUnavailable({ reason }: GalleryUnavailableProps) {
    const t = await getTranslations("gallery.unavailable");

    const expired = reason === "expired";

    const errored = reason === "error";

    const Icon = expired ? Clock3 : errored ? AlertTriangle : Link2Off;

    return (
        <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
            {/* Ambient background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute left-1/2 top-[-260px] h-[600px] w-[820px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/30 blur-[150px]" />

                <div className="absolute bottom-[-240px] right-[-180px] h-[440px] w-[440px] rounded-full bg-[hsl(var(--gold))]/[0.07] blur-[130px]" />
            </div>

            <div className="relative z-10 w-full max-w-xl">
                {/* Brand */}
                <div className="mb-7 flex justify-center">
                    <Link href="/" className="inline-flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                            <Heart className="h-3.5 w-3.5" fill="currentColor" />
                        </div>

                        <span className="font-serif text-xl tracking-tight text-foreground">
              Wedora
            </span>
                    </Link>
                </div>

                {/* State */}
                <section className="card-wedding px-6 py-10 text-center sm:px-10 sm:py-12">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary/70 text-muted-foreground">
                        <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>

                    <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                        {t(
                            expired
                                ? "expired.eyebrow"
                                : errored
                                    ? "error.eyebrow"
                                    : "invalid.eyebrow",
                        )}
                    </p>

                    <h1 className="mx-auto mt-2 max-w-md font-serif text-3xl font-light tracking-[-0.025em] text-foreground sm:text-4xl">
                        {t(
                            expired
                                ? "expired.title"
                                : errored
                                    ? "error.title"
                                    : "invalid.title",
                        )}
                    </h1>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                        {t(
                            expired
                                ? "expired.description"
                                : errored
                                    ? "error.description"
                                    : "invalid.description",
                        )}
                    </p>

                    {!errored && (
                        <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-border/60 bg-secondary/30 px-5 py-4">
                            <p className="text-xs leading-5 text-muted-foreground">
                                {t("contact")}
                            </p>
                        </div>
                    )}
                </section>

                <p className="mt-6 text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
                    Wedora
                </p>
            </div>
        </main>
    );
}
