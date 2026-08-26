import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{
            weddingId: string;
        }>;
    }
) {
    const { weddingId } = await params;

    /*
     * Compatibility route only.
     *
     * All authorization and ZIP generation now live
     * in the canonical /api/admin/zip route.
     */
    const source = new URL(request.url);

    const target = new URL("/api/admin/zip", request.url);

    target.searchParams.set("weddingId", weddingId);

    const filter = source.searchParams.get("filter");

    if (filter) {
        target.searchParams.set("filter", filter);
    }

    return NextResponse.redirect(target, 307);
}
