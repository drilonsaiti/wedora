"use client";

import { useMemo, useRef } from "react";
import { Download, Printer, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeCanvas } from "qrcode.react";

import { Button } from "@/components/ui/button";

interface QrCodeCardProps {
    locale: string;
    slug: string | null;
    weddingName?: string;
}

/*
 * Lets an admin/couple grab a QR code that points straight at the wedding's
 * public invitation page (`/{locale}/{slug}`), download it as a PNG, or
 * print a clean, branding-free copy of it. Rendered fully client-side via
 * qrcode.react -- no server round-trip and no API key involved.
 */
export function QrCodeCard({ locale, slug, weddingName }: QrCodeCardProps) {
    const t = useTranslations("qrCodeCard");

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const shareUrl = useMemo(() => {
        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

        return `${appUrl}/${locale}/${slug ?? ""}`;
    }, [locale, slug]);

    const handleDownload = () => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const link = document.createElement("a");

        link.href = canvas.toDataURL("image/png");
        link.download = `${slug ?? "wedding"}-qr-code.png`;
        link.click();
    };

    const handlePrint = () => {
        window.print();
    };

    if (!slug) {
        return null;
    }

    return (
        <>
            {/* ======================================
            NORMAL VIEW
        ====================================== */}
            <section className="rounded-[1.5rem] border border-border/70 bg-card/85 p-5 shadow-sm sm:p-6 print:hidden">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                        <QrCode className="h-4 w-4" strokeWidth={1.7} />
                    </div>

                    <div>
                        <h2 className="font-serif text-lg font-light text-foreground">
                            {t("title")}
                        </h2>

                        <p className="text-xs text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex flex-col items-center gap-3 rounded-xl bg-secondary/40 p-5">
                    <div className="rounded-lg bg-white p-3">
                        <QRCodeCanvas
                            ref={canvasRef}
                            value={shareUrl}
                            size={192}
                            level="M"
                            marginSize={2}
                            bgColor="#FFFFFF"
                            fgColor="#000000"
                            title={weddingName ?? t("title")}
                        />
                    </div>

                    <p className="max-w-xs break-all text-center text-xs text-muted-foreground">
                        {shareUrl}
                    </p>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={handleDownload}>
                        <Download className="h-3.5 w-3.5" />
                        {t("downloadPng")}
                    </Button>

                    <Button type="button" variant="outline" onClick={handlePrint}>
                        <Printer className="h-3.5 w-3.5" />
                        {t("print")}
                    </Button>
                </div>
            </section>

            {/* ======================================
            PRINT VIEW
        ====================================== */}
            <div
                className="hidden print:flex print:w-full print:flex-col print:items-center print:justify-center print:gap-6 print:p-8"
                style={{
                    colorAdjust: "exact",
                    WebkitPrintColorAdjust: "exact",
                }}
            >
                {weddingName && (
                    <h1
                        className="text-center font-serif text-3xl"
                        style={{ color: "#000000" }}
                    >
                        {weddingName}
                    </h1>
                )}

                <QRCodeCanvas
                    value={shareUrl}
                    size={320}
                    level="M"
                    marginSize={2}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    title={weddingName ?? t("title")}
                />

                <p className="text-center text-sm" style={{ color: "#000000" }}>
                    {shareUrl}
                </p>
            </div>
        </>
    );
}