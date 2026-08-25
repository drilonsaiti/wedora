import { Heart } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryLoading() {
    return (
        <main className="min-h-[100dvh] bg-background">
            <header className="relative overflow-hidden px-6 pb-10 pt-10 sm:pb-14 sm:pt-12">
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/2 top-[-220px] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[hsl(var(--blush))]/25 blur-[130px]" />
                </div>

                <div className="relative mx-auto max-w-6xl">
                    <div className="mb-14 flex items-center justify-center">
                        <div className="inline-flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                                <Heart className="h-3.5 w-3.5" fill="currentColor" />
                            </div>

                            <span className="font-serif text-xl tracking-tight text-foreground">
                Wedora
              </span>
                        </div>
                    </div>

                    <div className="mx-auto flex max-w-xl flex-col items-center">
                        <Skeleton className="h-3 w-28 rounded-full" />

                        <Skeleton className="mt-5 h-11 w-64 max-w-full rounded-2xl sm:w-80" />

                        <div className="mt-8 flex gap-2 rounded-full border border-border/60 bg-card/70 p-1">
                            <Skeleton className="h-9 w-24 rounded-full" />
                            <Skeleton className="h-9 w-28 rounded-full" />
                        </div>
                    </div>
                </div>
            </header>

            <section className="px-4 pb-20 sm:px-6">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                    {Array.from({
                        length: 8,
                    }).map((_, index) => {
                        const aspect =
                            index % 7 === 0
                                ? "aspect-[4/5]"
                                : index % 5 === 0
                                    ? "aspect-[5/4]"
                                    : "aspect-square";

                        return (
                            <Skeleton
                                key={index}
                                className={`rounded-[1.35rem] sm:rounded-[1.6rem] ${aspect}`}
                            />
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
