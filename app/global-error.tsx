"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface GlobalErrorProps {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}

type SupportedLocale = "en" | "de" | "fr" | "al";

const messages = {
    en: {
        eyebrow: "Something went wrong",
        title: "Wedora couldn’t load properly.",
        description:
            "An unexpected error occurred while loading the application. Try again or return to Wedora.",
        retry: "Try again",
        home: "Back to Wedora",
        reference: "Error reference",
    },

    de: {
        eyebrow: "Etwas ist schiefgelaufen",
        title: "Wedora konnte nicht richtig geladen werden.",
        description:
            "Beim Laden der Anwendung ist ein unerwarteter Fehler aufgetreten. Versuche es erneut oder kehre zu Wedora zurück.",
        retry: "Erneut versuchen",
        home: "Zurück zu Wedora",
        reference: "Fehlerreferenz",
    },

    fr: {
        eyebrow: "Une erreur est survenue",
        title: "Wedora n’a pas pu se charger correctement.",
        description:
            "Une erreur inattendue est survenue lors du chargement de l’application. Réessayez ou revenez à Wedora.",
        retry: "Réessayer",
        home: "Retour à Wedora",
        reference: "Référence de l’erreur",
    },

    al: {
        eyebrow: "Diçka shkoi keq",
        title: "Wedora nuk mundi të ngarkohej siç duhet.",
        description:
            "Ndodhi një gabim i papritur gjatë ngarkimit të aplikacionit. Provo përsëri ose kthehu te Wedora.",
        retry: "Provo përsëri",
        home: "Kthehu te Wedora",
        reference: "Referenca e gabimit",
    },
} satisfies Record<
    SupportedLocale,
    {
        eyebrow: string;
        title: string;
        description: string;
        retry: string;
        home: string;
        reference: string;
    }
>;

function getLocaleFromPath(pathname: string): SupportedLocale {
    const segment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();

    if (
        segment === "de" ||
        segment === "fr" ||
        segment === "en" ||
        segment === "al"
    ) {
        return segment;
    }

    if (segment === "sq") {
        return "al";
    }

    return "en";
}

export default function GlobalError({
                                        error,
                                        reset,
                                    }: GlobalErrorProps) {
    const pathname = usePathname()

    const locale =
        getLocaleFromPath(pathname)

    useEffect(() => {
        console.error(
            '[Global error boundary]',
            error
        )
    }, [error])

    const t = messages[locale]

    return (
        <html lang={locale === "al" ? "sq" : locale}>
        <body className="m-0 bg-[#faf8f5] text-[#231f1c] antialiased">
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
            {/* =====================================
                        AMBIENT BACKGROUND
                    ===================================== */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute left-1/2 top-[-260px] h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[#ead5dc]/50 blur-[150px]" />

                <div className="absolute bottom-[-220px] right-[-180px] h-[420px] w-[420px] rounded-full bg-[#d6bd82]/10 blur-[130px]" />
            </div>

            <div className="relative z-10 w-full max-w-xl">
                {/* =================================
                            BRAND
                        ================================= */}
                <div className="mb-7 flex justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5 text-[#231f1c] no-underline"
                    >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#9a4b62] text-white shadow-sm">
                  <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                  >
                    <path d="M12 21s-6.716-4.35-9.428-8.11C.163 9.55 1.41 5.24 5.15 4.25c2.15-.57 4.2.25 5.4 1.88L12 8.09l1.45-1.96c1.2-1.63 3.25-2.45 5.4-1.88 3.74.99 4.987 5.3 2.578 8.64C18.716 16.65 12 21 12 21Z" />
                  </svg>
                </span>

                        <span className="font-serif text-xl tracking-tight">
                  Wedora
                </span>
                    </Link>
                </div>

                {/* =================================
                            ERROR CARD
                        ================================= */}
                <section className="rounded-[2rem] border border-[#e7e0d9] bg-[#fffdfb]/95 px-6 py-10 text-center shadow-[0_20px_60px_rgba(35,31,28,0.08)] backdrop-blur sm:px-10 sm:py-12">
                    {/* Icon */}
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d84c4c]/15 bg-[#d84c4c]/[0.06] text-[#c53c3c]">
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6"
                        >
                            <circle cx="12" cy="12" r="9" />

                            <path d="M12 8v5" />

                            <path d="M12 16.5h.01" />
                        </svg>
                    </div>

                    <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-[#7d746e]">
                        {t.eyebrow}
                    </p>

                    <h1 className="mx-auto mt-2 max-w-md font-serif text-3xl font-light tracking-[-0.025em] text-[#231f1c] sm:text-4xl">
                        {t.title}
                    </h1>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#746c67]">
                        {t.description}
                    </p>

                    {/* =================================
                                ACTIONS
                            ================================= */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            type="button"
                            onClick={reset}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9a4b62] px-7 py-3 text-xs font-medium tracking-[0.06em] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#9a4b62]/25 focus:ring-offset-2"
                        >
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <path d="M20 6v5h-5" />
                                <path d="M4 18v-5h5" />

                                <path d="M6.1 9a7 7 0 0 1 11.4-2.4L20 11" />

                                <path d="M17.9 15a7 7 0 0 1-11.4 2.4L4 13" />
                            </svg>

                            {t.retry}
                        </button>

                        <Link
                            href="/"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#e1d9d2] bg-white px-7 py-3 text-xs font-medium tracking-[0.05em] text-[#231f1c] no-underline transition hover:-translate-y-0.5 hover:bg-[#f5f1ed] focus:outline-none focus:ring-2 focus:ring-[#9a4b62]/20 focus:ring-offset-2"
                        >
                            {t.home}
                        </Link>
                    </div>

                    {/* =================================
                                ERROR DIGEST
                            ================================= */}
                    {error.digest && (
                        <div className="mt-8 border-t border-[#e7e0d9] pt-5">
                            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#8d837c]">
                                {t.reference}
                            </p>

                            <code className="mt-1 block break-all font-mono text-[10px] text-[#8d837c]">
                                {error.digest}
                            </code>
                        </div>
                    )}
                </section>
            </div>
        </main>
        </body>
        </html>
    );
}
