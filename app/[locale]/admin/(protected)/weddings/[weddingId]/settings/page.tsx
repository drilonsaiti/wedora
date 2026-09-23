import { EditWeddingForm } from "@/components/admin/edit-wedding-form";
import { QrCodeCard } from "@/components/admin/qr-code-card";
import { RsvpApiKeyManager } from "@/components/admin/rsvp-api-key-manager";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWeddingEntitlements } from "@/lib/plans";
import { notFound } from "next/navigation";

type Props = {
    params: Promise<{
        locale: string;
        weddingId: string;
    }>;
};

export default async function WeddingSettingsPage({ params }: Props) {
    const { locale, weddingId } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect({
            href: "/admin/login",
            locale,
        });

        return null;
    }

    const { data: admin } = await supabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!admin) {
        redirect({
            href: "/admin/unauthorized",
            locale,
        });
    }

    const { data: wedding, error } = await supabase
        .from("weddings")
        .select(
            `
            id,
            groom_name,
            bride_name,
            groom_email,
            bride_email,
            wedding_date,
            slug,
            plan,
            addons,
            wedding_settings (
                *
            )
        `,
        )
        .eq("id", weddingId)
        .maybeSingle();

    if (error || !wedding) {
        notFound();
    }

    // UI-level gating to match this wedding's plan -- the actual
    // enforcement lives server-side (createRsvpApiKeyAction /
    // lib/rsvp-auth.ts), this just avoids showing an admin a button for a
    // feature the wedding isn't entitled to.
    const entitlements = getWeddingEntitlements(wedding.plan, wedding.addons);

    return (
        <main className="relative z-10 mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
            <div className="space-y-6 print:hidden">
                <EditWeddingForm wedding={wedding} />

                {entitlements.rsvpApiAccess && (
                    <RsvpApiKeyManager weddingId={weddingId} weddingSlug={wedding.slug} />
                )}
            </div>

            {entitlements.qrCode && (
                <QrCodeCard
                    locale={locale}
                    slug={wedding.slug}
                    weddingName={`${wedding.groom_name} & ${wedding.bride_name}`}
                />
            )}
        </main>
    );
}
