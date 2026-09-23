import {
    getGuests,
    getRsvpTrend,
    getTables,
    getVenueElements,
} from "@/actions/seating";
import { SeatingManagement } from "@/components/admin/seating-management";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = {
    params: Promise<{
        locale: string;
        weddingId: string;
    }>;
};

export default async function WeddingDashboardPage({ params }: Props) {
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

    /*
     * Layout already protects the admin area,
     * but keep this additional check for safety.
     */
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

        return null;
    }

    /*
     * Load wedding context as well.
     * We use the names in the page heading.
     */
    const { data: wedding } = await supabase
        .from("weddings")
        .select(
            `
            id,
            groom_name,
            bride_name,
            slug
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

    const [guests, tables, venueElements, rsvpTrend] = await Promise.all([
        getGuests(wedding.id),
        getTables(wedding.id),
        getVenueElements(wedding.id),
        getRsvpTrend(wedding.id),
    ]);

    return (
        <SeatingManagement
            wedding={wedding}
            locale={locale}
            initialGuests={guests ?? []}
            initialTables={tables ?? []}
            initialVenueElements={venueElements ?? []}
            rsvpTrend={rsvpTrend}
        />
    );
}
