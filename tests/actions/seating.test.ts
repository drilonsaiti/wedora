import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
    createServiceClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    redirect: vi.fn(() => {
        throw new Error("REDIRECT");
    }),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_cache: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

import {
    bulkImportGuestsAction,
    deleteTable,
    getGuestByToken,
    updateTable,
} from "@/actions/seating";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/*
 * ============================================================
 * MOCK SUPABASE CLIENTS
 * ============================================================
 *
 * bulkImportGuestsAction() goes through requireWeddingAccess(), which:
 *   1. requireActor(): createClient().auth.getUser(), then
 *      createServiceClient().from('admins').select('id').eq('id', ...).maybeSingle()
 *   2. createServiceClient().from('weddings').select('id, owner_user_id')
 *      .eq('id', weddingId)[.eq('owner_user_id', user.id) if owner].maybeSingle()
 * before finally doing createServiceClient().from('guests').insert(rows).
 * This fakes exactly that surface.
 */
type MockResult<T> = { data: T | null; error: { message: string } | null };

function makeServiceClient(options: {
    admin?: MockResult<{ id: string }>;
    wedding?: MockResult<{ id: string; owner_user_id: string | null }>;
    insertError?: { message: string } | null;
    guestCount?: number;
}) {
    const adminResult = options.admin ?? { data: null, error: null };
    const weddingResult = options.wedding ?? {
        data: {
            id: "wedding-1",
            owner_user_id: null,
            // Basic plan's 150-guest limit comfortably covers these
            // tests -- getRemainingGuestCapacity() (actions/seating.ts)
            // resolves entitlements from these columns.
            plan: "basic",
            addons: [],
        },
        error: null,
    };
    const insertError = options.insertError ?? null;
    const guestCount = options.guestCount ?? 0;

    return {
        from: (table: string) => {
            if (table === "admins") {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => adminResult,
                        }),
                    }),
                };
            }

            if (table === "weddings") {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => weddingResult,
                            }),
                            maybeSingle: async () => weddingResult,
                        }),
                    }),
                };
            }

            if (table === "guests") {
                return {
                    insert: async (rows: unknown[]) => ({
                        data: insertError ? null : rows,
                        error: insertError,
                    }),
                    // getRemainingGuestCapacity()'s count query:
                    // .from('guests').select('id', {count:'exact', head:true}).eq(...)
                    select: () => ({
                        eq: async () => ({
                            count: guestCount,
                            error: null,
                        }),
                    }),
                };
            }

            throw new Error(`Unexpected table in mock: ${table}`);
        },
    };
}

function makeAuthClient(userId: string | null) {
    return {
        auth: {
            getUser: async () => ({
                data: {
                    user: userId ? { id: userId, app_metadata: {} } : null,
                },
            }),
        },
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("bulkImportGuestsAction", () => {
    it("imports valid rows, skips blank/invalid rows and reports both counts", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient("admin-1") as unknown as Awaited<
                ReturnType<typeof createClient>
            >,
        );
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                admin: { data: { id: "admin-1" }, error: null },
            }) as unknown as ReturnType<typeof createServiceClient>,
        );

        const result = await bulkImportGuestsAction("wedding-1", [
            { firstName: "Jane", lastName: "Doe" },
            { firstName: "  ", lastName: "  " },
            { firstName: "John", lastName: "Smith" },
        ]);

        expect(result.imported).toBe(2);
        expect(result.skipped).toBe(1);
        expect(result.errors).toEqual([]);
    });

    it("rejects a batch larger than the max allowed size", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient("admin-1") as unknown as Awaited<
                ReturnType<typeof createClient>
            >,
        );
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                admin: { data: { id: "admin-1" }, error: null },
            }) as unknown as ReturnType<typeof createServiceClient>,
        );

        const tooMany = Array.from({ length: 501 }, (_, i) => ({
            firstName: `Guest${i}`,
            lastName: "Test",
        }));

        await expect(bulkImportGuestsAction("wedding-1", tooMany)).rejects.toThrow(
            /500/,
        );
    });

    it("denies an owner importing into a wedding they do not own", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient("owner-1") as unknown as Awaited<
                ReturnType<typeof createClient>
            >,
        );
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                admin: { data: null, error: null },
                wedding: { data: null, error: null },
            }) as unknown as ReturnType<typeof createServiceClient>,
        );

        await expect(
            bulkImportGuestsAction("wedding-1", [
                { firstName: "Jane", lastName: "Doe" },
            ]),
        ).rejects.toThrow();
    });

    it("surfaces a database insert error rather than reporting a false success", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient("admin-1") as unknown as Awaited<
                ReturnType<typeof createClient>
            >,
        );
        vi.mocked(createServiceClient).mockReturnValue(
            makeServiceClient({
                admin: { data: { id: "admin-1" }, error: null },
                insertError: { message: "insert failed" },
            }) as unknown as ReturnType<typeof createServiceClient>,
        );

        await expect(
            bulkImportGuestsAction("wedding-1", [
                { firstName: "Jane", lastName: "Doe" },
            ]),
        ).rejects.toThrow("insert failed");
    });
});

/*
 * ============================================================
 * updateTable / deleteTable -- table-arrangement entitlement
 * ============================================================
 *
 * addTable()/createVenueElement() were the only table-arrangement call
 * sites ever gated on entitlements.tableArrangement; a wedding downgraded
 * off a plan that includes it kept full access to redesign tables it
 * already had. updateTable() (and its siblings: updateTablePosition(),
 * updateVenueElementPosition(), assignGuestToTable()/assignGuestToSeat()
 * when actually assigning) now check it too -- deleteTable() and
 * deleteVenueElement() deliberately don't, matching how guest-limit
 * downgrades work elsewhere (shrinking down to fit stays allowed, only
 * growing/rearranging beyond the plan is not). This exercises the
 * representative pair (one blocked, one not) rather than all five sites,
 * since they all share the same getEntitlementsForWedding() check.
 */
describe("updateTable / deleteTable (table-arrangement entitlement)", () => {
    function makeTableServiceClient(options: {
        admin?: MockResult<{ id: string }>;
        wedding?: MockResult<{
            id: string;
            owner_user_id: string | null;
            plan: string;
            addons: string[];
        }>;
        table?: MockResult<{ wedding_id: string }>;
    }) {
        const adminResult = options.admin ?? {
            data: { id: "admin-1" },
            error: null,
        };
        const weddingResult = options.wedding ?? {
            data: {
                id: "wedding-1",
                owner_user_id: null,
                plan: "basic",
                addons: [],
            },
            error: null,
        };
        const tableResult = options.table ?? {
            data: { wedding_id: "wedding-1" },
            error: null,
        };

        return {
            from: (table: string) => {
                if (table === "admins") {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => adminResult,
                            }),
                        }),
                    };
                }

                if (table === "weddings") {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    maybeSingle: async () => weddingResult,
                                }),
                                maybeSingle: async () => weddingResult,
                            }),
                        }),
                    };
                }

                if (table === "tables") {
                    return {
                        // requireTableAccess()'s lookup:
                        // .select('wedding_id').eq('id', id).maybeSingle()
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => tableResult,
                            }),
                        }),
                        // deleteTable()'s mutation:
                        // .delete().eq('id', id).eq('wedding_id', weddingId)
                        delete: () => ({
                            eq: () => ({
                                eq: async () => ({ error: null }),
                            }),
                        }),
                    };
                }

                throw new Error(`Unexpected table in mock: ${table}`);
            },
        };
    }

    const validFormData = {
        number: 1,
        seats: 4,
        shape: "round" as const,
    };

    it("rejects redesigning an existing table when the wedding's current plan doesn't include table arrangement", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient("admin-1") as unknown as Awaited<
                ReturnType<typeof createClient>
            >,
        );
        vi.mocked(createServiceClient).mockReturnValue(
            makeTableServiceClient({}) as unknown as ReturnType<
                typeof createServiceClient
            >,
        );

        await expect(updateTable("table-1", validFormData)).rejects.toThrow(
            "Table arrangement is not included",
        );
    });

    it("still allows deleting an existing table on a plan without table arrangement (shrinking down to fit is always allowed)", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeAuthClient("admin-1") as unknown as Awaited<
                ReturnType<typeof createClient>
            >,
        );
        vi.mocked(createServiceClient).mockReturnValue(
            makeTableServiceClient({}) as unknown as ReturnType<
                typeof createServiceClient
            >,
        );

        await expect(deleteTable("table-1")).resolves.toBeUndefined();
    });
});

/*
 * ============================================================
 * getGuestByToken
 * ============================================================
 *
 * Unlike bulkImportGuestsAction, this is the PUBLIC personal-link path:
 * it never calls requireActor()/createClient() at all, and goes
 * straight through createServiceClient() after re-checking
 * wedding_settings.enable_find_seat for the resolved wedding. This
 * fakes just that surface:
 *   1. createServiceClient().from('weddings').select(...).eq('slug', ...).maybeSingle()
 *   2. createServiceClient().from('guests').select(...).eq('wedding_id', ...).eq('guest_token', ...).maybeSingle()
 */
const VALID_TOKEN = "11111111-1111-4111-8111-111111111111";
const OTHER_TOKEN = "22222222-2222-4222-8222-222222222222";

function makeTokenServiceClient(options: {
    wedding?: MockResult<{
        id: string;
        plan?: string;
        addons?: string[];
        wedding_settings: { enable_find_seat: boolean } | null;
    }>;
    guest?: MockResult<{
        id: string;
        first_name: string;
        last_name: string;
        guest_token: string;
    }>;
}) {
    const weddingResult = options.wedding ?? {
        data: {
            id: "wedding-1",
            // Personal guest links are Unlimited+/addon-only (see
            // lib/plans.ts) -- entitled here by default so these
            // tests exercise the enable_find_seat gate they're
            // actually about, not the plan gate.
            plan: "unlimited",
            addons: [],
            wedding_settings: { enable_find_seat: true },
        },
        error: null,
    };

    const guestResult = options.guest ?? { data: null, error: null };

    return {
        from: (table: string) => {
            if (table === "weddings") {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => weddingResult,
                        }),
                    }),
                };
            }

            if (table === "guests") {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => guestResult,
                            }),
                        }),
                    }),
                };
            }

            throw new Error(`Unexpected table in mock: ${table}`);
        },
    };
}

describe("getGuestByToken", () => {
    it("returns null for a wrong/unmatched token", async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeTokenServiceClient({
                guest: { data: null, error: null },
            }) as unknown as ReturnType<typeof createServiceClient>,
        );

        const result = await getGuestByToken("sara-drilon", OTHER_TOKEN);

        expect(result).toBeNull();
    });

    it("returns null when a malformed token is supplied, without querying the database", async () => {
        const serviceClient = makeTokenServiceClient({});

        vi.mocked(createServiceClient).mockReturnValue(
            serviceClient as unknown as ReturnType<typeof createServiceClient>,
        );

        const fromSpy = vi.spyOn(serviceClient, "from");

        const result = await getGuestByToken("sara-drilon", "not-a-uuid");

        expect(result).toBeNull();
        expect(fromSpy).not.toHaveBeenCalled();
    });

    it("returns null when enable_find_seat is false, even with a correct token", async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeTokenServiceClient({
                wedding: {
                    data: {
                        id: "wedding-1",
                        wedding_settings: { enable_find_seat: false },
                    },
                    error: null,
                },
                // A matching guest exists, but the gate must still block it.
                guest: {
                    data: {
                        id: "guest-1",
                        first_name: "Elira",
                        last_name: "Krasniqi",
                        guest_token: VALID_TOKEN,
                    },
                    error: null,
                },
            }) as unknown as ReturnType<typeof createServiceClient>,
        );

        const result = await getGuestByToken("sara-drilon", VALID_TOKEN);

        expect(result).toBeNull();
    });

    it("returns null when the wedding does not exist", async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeTokenServiceClient({
                wedding: { data: null, error: null },
            }) as unknown as ReturnType<typeof createServiceClient>,
        );

        const result = await getGuestByToken("no-such-wedding", VALID_TOKEN);

        expect(result).toBeNull();
    });

    it("returns exactly the one matching guest (and nothing about other guests) for a valid token + enabled wedding", async () => {
        vi.mocked(createServiceClient).mockReturnValue(
            makeTokenServiceClient({
                wedding: {
                    data: {
                        id: "wedding-1",
                        plan: "unlimited",
                        addons: [],
                        wedding_settings: { enable_find_seat: true },
                    },
                    error: null,
                },
                guest: {
                    data: {
                        id: "guest-1",
                        first_name: "Elira",
                        last_name: "Krasniqi",
                        guest_token: VALID_TOKEN,
                    },
                    error: null,
                },
            }) as unknown as ReturnType<typeof createServiceClient>,
        );

        const result = await getGuestByToken("sara-drilon", VALID_TOKEN);

        expect(result).not.toBeNull();
        expect(result?.weddingId).toBe("wedding-1");
        expect(result?.guest).toEqual({
            id: "guest-1",
            first_name: "Elira",
            last_name: "Krasniqi",
            guest_token: VALID_TOKEN,
        });

        // The single-guest shape carries no array/roster of other guests.
        expect(Array.isArray(result?.guest)).toBe(false);
    });
});
