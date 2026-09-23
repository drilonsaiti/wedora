import { getPhotosAction } from "@/actions/admin";
import { AdminDashboard } from "@/components/admin/dashboard";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{
        locale: string;
        weddingId: string;
    }>;
    searchParams: Promise<{
        filter?: string;
    }>;
};

export default async function AdminWeddingPhotosPage({
                                                         params,
                                                         searchParams,
                                                     }: Props) {
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

    const { data: wedding } = await supabase
        .from("weddings")
        .select(
            `
                id,
                groom_name,
                bride_name,
                slug,
                plan,
                addons
            `,
        )
        .eq("id", weddingId)
        .single();

    if (!wedding) {
        redirect({
            href: "/admin/weddings",
            locale,
        });

        notFound();
    }

    const { filter } = await searchParams;

    const filters =
        filter === "favourites"
            ? {
                favourite: true,
            }
            : filter === "hidden"
                ? {
                    hidden: true,
                }
                : filter === "unapproved"
                    ? {
                        approved: false,
                    }
                    : undefined;

    const photoResult = await getPhotosAction(wedding.id, filters, 50, 0);

    const weddingName =
        [wedding.groom_name, wedding.bride_name].filter(Boolean).join(" & ") ||
        wedding.slug ||
        "";

    return (
        <AdminDashboard
            initialPhotos={photoResult.photos}
            initialTotal={photoResult.total ?? 0}
            adminEmail={user.email ?? ""}
            weddingId={wedding.id}
            weddingName={weddingName}
            error={photoResult.error}
            activeFilter={filter}
            role="admin"
            plan={wedding.plan}
            addons={wedding.addons}
        />
    );
}
