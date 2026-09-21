'use server'

import {revalidatePath, revalidateTag, unstable_cache,} from 'next/cache'
import {redirect} from 'next/navigation'

import {createClient, createServiceClient,} from '@/lib/supabase/server'
import {generateSeatPositions} from '@/lib/seat-generator'
import {guestSchema, type SeatSides, tableSchema,} from '@/schemas'
import type {Table, VenueElement,} from '@/types/seating'

function generateInitials(
    firstName: string,
    lastName: string
) {
    const first =
        Array.from(
            firstName.trim()
        )[0] ?? ''

    const last =
        Array.from(
            lastName.trim()
        )[0] ?? ''

    return `${first}${last}`.toLocaleUpperCase()
}

async function requireActor() {
    const authClient =
        await createClient()

    const {
        data: {
            user,
        },
    } =
        await authClient.auth.getUser()

    if (!user) {
        redirect(
            '/admin/login'
        )
    }

    /*
     * Check global-admin status after authentication.
     * We use the service client here so this lookup
     * does not depend on RLS on the admins table.
     */
    const serviceClient =
        createServiceClient()

    const {
        data: admin,
        error: adminError,
    } =
        await serviceClient
            .from('admins')
            .select('id')
            .eq(
                'id',
                user.id
            )
            .maybeSingle()

    if (adminError) {
        console.error(
            'Admin check failed:',
            adminError
        )

        throw new Error(
            'Failed to verify access'
        )
    }

    return {
        user,
        role:
            admin
                ? 'admin' as const
                : 'owner' as const,
    }
}

/*
 * ============================================
 * WEDDING ACCESS
 * ============================================
 *
 * Admin:
 *   may access every wedding.
 *
 * Owner:
 *   may access only a wedding whose
 *   owner_user_id equals the current auth user.
 *
 * The service client is returned only after
 * the exact wedding has been authorized.
 */
async function requireWeddingAccess(
    weddingId: string,
    actor?: Awaited<
        ReturnType<
            typeof requireActor
        >
    >
) {
    const access =
        actor ??
        await requireActor()

    const {
        user,
        role,
    } =
        access

    const supabase =
        createServiceClient()

    let query =
        supabase
            .from('weddings')
            .select(
                'id, owner_user_id'
            )
            .eq(
                'id',
                weddingId
            )

    if (
        role ===
        'owner'
    ) {
        query =
            query.eq(
                'owner_user_id',
                user.id
            )
    }

    const {
        data: wedding,
        error,
    } =
        await query
            .maybeSingle()

    if (error) {
        throw new Error(
            error.message
        )
    }

    if (!wedding) {
        if (
            role ===
            'owner'
        ) {
            redirect(
                '/admin/unauthorized'
            )
        }

        throw new Error(
            'Wedding not found'
        )
    }

    return {
        user,
        role,
        supabase,
        weddingId:
        wedding.id,
    }
}

async function requireWeddingReadAccess(
    weddingId: string
) {
    const authClient =
        await createClient()

    const serviceClient =
        createServiceClient()

    const {
        data: {
            user,
        },
    } =
        await authClient.auth.getUser()

    /*
     * ============================================
     * PUBLIC FIND-SEAT ACCESS
     * ============================================
     *
     * The public wedding page is intentionally
     * accessible without authentication.
     *
     * Seating data may be read publicly ONLY when
     * enable_find_seat is enabled for this exact
     * wedding.
     */
    const {
        data: publicSettings,
        error: settingsError,
    } =
        await serviceClient
            .from(
                'wedding_settings'
            )
            .select(
                'enable_find_seat'
            )
            .eq(
                'wedding_id',
                weddingId
            )
            .maybeSingle()

    if (settingsError) {
        throw new Error(
            settingsError.message
        )
    }

    if (
        publicSettings
            ?.enable_find_seat
    ) {
        return {
            user,
            role:
                'public' as const,
        }
    }

    /*
     * From here on, the wedding is NOT publicly
     * readable.
     *
     * Therefore authentication is required.
     */
    if (!user) {
        throw new Error(
            'Unauthorized'
        )
    }

    /*
     * ============================================
     * COUPLE
     * ============================================
     */
    const appMetadata =
        user.app_metadata as {
            role?: string
            wedding_id?: string
        }

    if (
        appMetadata.role ===
        'couple' &&
        appMetadata.wedding_id ===
        weddingId
    ) {
        return {
            user,
            role:
                'couple' as const,
        }
    }

    /*
     * ============================================
     * GLOBAL ADMIN
     * ============================================
     */
    const {
        data: admin,
        error: adminError,
    } =
        await serviceClient
            .from('admins')
            .select('id')
            .eq(
                'id',
                user.id
            )
            .maybeSingle()

    if (adminError) {
        throw new Error(
            adminError.message
        )
    }

    if (admin) {
        return {
            user,
            role:
                'admin' as const,
        }
    }

    /*
     * ============================================
     * WEDDING OWNER
     * ============================================
     */
    const {
        data: ownedWedding,
        error: ownerError,
    } =
        await serviceClient
            .from('weddings')
            .select('id')
            .eq(
                'id',
                weddingId
            )
            .eq(
                'owner_user_id',
                user.id
            )
            .maybeSingle()

    if (ownerError) {
        throw new Error(
            ownerError.message
        )
    }

    if (!ownedWedding) {
        throw new Error(
            'Forbidden'
        )
    }

    return {
        user,
        role:
            'owner' as const,
    }
}

/*
 * ============================================
 * ENTITY → WEDDING ACCESS
 * ============================================
 *
 * Entity actions only receive an entity id.
 * We first authenticate, resolve its wedding id,
 * then authorize that exact wedding.
 */
async function requireGuestAccess(
    guestId: string
) {
    const actor =
        await requireActor()

    const lookupClient =
        createServiceClient()

    const {
        data,
        error,
    } =
        await lookupClient
            .from('guests')
            .select(
                'wedding_id'
            )
            .eq(
                'id',
                guestId
            )
            .maybeSingle()

    if (
        error ||
        !data
    ) {
        throw new Error(
            'Guest not found'
        )
    }

    return requireWeddingAccess(
        data.wedding_id,
        actor
    )
}

async function requireTableAccess(
    tableId: string
) {
    const actor =
        await requireActor()

    const lookupClient =
        createServiceClient()

    const {
        data,
        error,
    } =
        await lookupClient
            .from('tables')
            .select(
                'wedding_id'
            )
            .eq(
                'id',
                tableId
            )
            .maybeSingle()

    if (
        error ||
        !data
    ) {
        throw new Error(
            'Table not found'
        )
    }

    return requireWeddingAccess(
        data.wedding_id,
        actor
    )
}

async function requireVenueElementAccess(
    elementId: string
) {
    const actor =
        await requireActor()

    const lookupClient =
        createServiceClient()

    const {
        data,
        error,
    } =
        await lookupClient
            .from(
                'venue_elements'
            )
            .select(
                'wedding_id'
            )
            .eq(
                'id',
                elementId
            )
            .maybeSingle()

    if (
        error ||
        !data
    ) {
        throw new Error(
            'Venue element not found'
        )
    }

    return requireWeddingAccess(
        data.wedding_id,
        actor
    )
}

/*
 * Destination validation helper.
 * Called only with an already-authorized
 * service client.
 */
async function getTableWeddingId(
    supabase: ReturnType<
        typeof createServiceClient
    >,
    tableId: string
) {
    const {
        data,
        error,
    } =
        await supabase
            .from('tables')
            .select(
                'wedding_id'
            )
            .eq(
                'id',
                tableId
            )
            .maybeSingle()

    if (
        error ||
        !data
    ) {
        throw new Error(
            'Table not found'
        )
    }

    return data.wedding_id
}

/*
 * ============================================
 * CACHE INVALIDATION
 * ============================================
 */
function revalidateSeating(
    weddingId: string
) {
    revalidateTag(
        `guests-${weddingId}`,
        'max'
    )

    revalidateTag(
        `tables-${weddingId}`,
        'max'
    )

    revalidateTag(
        `venue-elements-${weddingId}`,
        'max'
    )

    /*
     * Physical App Router pattern.
     * Route groups do not appear here.
     */
    revalidatePath(
        '/[locale]/admin/weddings/[weddingId]',
        'page'
    )
}

/*
 * ============================================
 * GUESTS
 * ============================================
 */

export async function getGuests(
    weddingId: string
) {
    /*
     * Admin, owner and the couple assigned to this
     * exact wedding may read the guest list.
     */
    await requireWeddingReadAccess(
        weddingId
    )

    return unstable_cache(
        async (
            wId: string
        ) => {
            /*
             * Safe to use service role here because
             * access to THIS wedding was verified
             * before entering the cached query.
             */
            const supabase =
                createServiceClient()

            const {
                data: wedding,
                error:
                    weddingError,
            } =
                await supabase
                    .from(
                        'weddings'
                    )
                    .select(
                        'id'
                    )
                    .eq(
                        'id',
                        wId
                    )
                    .maybeSingle()

            if (
                weddingError ||
                !wedding
            ) {
                throw new Error(
                    'Wedding not found'
                )
            }

            const {
                data,
                error,
            } =
                await supabase
                    .from(
                        'guests'
                    )
                    .select(`
                        *,
                        tables (
                            id,
                            number,
                            shape,
                            label
                        ),
                        table_seats (
                            id,
                            seat_index
                        )
                    `)
                    .eq(
                        'wedding_id',
                        wId
                    )
                    .order(
                        'created_at',
                        {
                            ascending:
                                false,
                        }
                    )

            if (error) {
                throw new Error(
                    error.message
                )
            }

            return data
        },
        [
            'wedding-guests',
            weddingId,
        ],
        {
            tags: [
                `guests-${weddingId}`,
            ],
        }
    )(weddingId)
}

/*
 * IMPORTANT CHANGE:
 *
 * weddingId must be explicitly supplied when
 * creating a guest.
 *
 * We can no longer infer it from owner_user_id.
 */
export async function addGuest(
    weddingId: string,
    formData: {
        first_name: string
        last_name: string
        table_id?:
            | string
            | null
    }
) {
    const {
        supabase,
    } =
        await requireWeddingAccess(
            weddingId
        )

    const parsed =
        guestSchema.safeParse(
            formData
        )

    if (
        !parsed.success
    ) {
        throw new Error(
            `Invalid input: ${parsed.error.errors[0]?.message ?? ''}`
        )
    }

    /*
     * If a table was selected, make sure that
     * table actually belongs to this wedding.
     */
    if (
        parsed.data
            .table_id
    ) {
        const tableWeddingId =
            await getTableWeddingId(
                supabase,
                parsed.data
                    .table_id
            )

        if (
            tableWeddingId !==
            weddingId
        ) {
            throw new Error(
                'Table does not belong to this wedding'
            )
        }
    }

    const {
        error,
    } =
        await supabase
            .from('guests')
            .insert({
                first_name:
                parsed.data.first_name,

                last_name:
                parsed.data.last_name,

                initials:
                    generateInitials(
                        parsed.data.first_name,
                        parsed.data.last_name
                    ),

                table_id:
                    parsed.data.table_id ??
                    null,

                wedding_id:
                weddingId,
            })

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateSeating(
        weddingId
    )
}

export async function updateGuest(
    id: string,
    formData: {
        first_name: string
        last_name: string
        table_id?:
            | string
            | null
    }
) {
    const {
        supabase,
        weddingId,
    } =
        await requireGuestAccess(
            id
        )

    const parsed =
        guestSchema.safeParse(
            formData
        )

    if (
        !parsed.success
    ) {
        throw new Error(
            `Invalid input: ${parsed.error.errors[0]?.message ?? ''}`
        )
    }

    if (
        parsed.data
            .table_id
    ) {
        const tableWeddingId =
            await getTableWeddingId(
                supabase,
                parsed.data
                    .table_id
            )

        if (
            tableWeddingId !==
            weddingId
        ) {
            throw new Error(
                'Table does not belong to this wedding'
            )
        }
    }

    const {
        error,
    } =
        await supabase
            .from('guests')
            .update({
                first_name:
                parsed.data
                    .first_name,

                last_name:
                parsed.data
                    .last_name,

                table_id:
                    parsed.data
                        .table_id ??
                    null,
            })
            .eq(
                'id',
                id
            )
            .eq(
                'wedding_id',
                weddingId
            )

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateSeating(
        weddingId
    )
}

export async function deleteGuest(
    id: string
) {
    const {
        supabase,
        weddingId,
    } =
        await requireGuestAccess(
            id
        )

    const {
        error,
    } =
        await supabase
            .from('guests')
            .delete()
            .eq(
                'id',
                id
            )
            .eq(
                'wedding_id',
                weddingId
            )

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateSeating(
        weddingId
    )
}

export async function assignGuestToTable(
    guestId: string,
    tableId: string | null
) {
    const {
        supabase,
        weddingId,
    } =
        await requireGuestAccess(
            guestId
        )

    if (tableId) {
        const tableWeddingId =
            await getTableWeddingId(
                supabase,
                tableId
            )

        if (
            tableWeddingId !==
            weddingId
        ) {
            throw new Error(
                'Table does not belong to this wedding'
            )
        }
    }

    const {
        error,
    } =
        await supabase
            .from('guests')
            .update({
                table_id:
                tableId,
                seat_id:
                    null,
            })
            .eq(
                'id',
                guestId
            )
            .eq(
                'wedding_id',
                weddingId
            )

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateSeating(
        weddingId
    )
}

/*
 * ============================================
 * TABLES
 * ============================================
 */

export async function getTables(
    weddingId: string
) {
    await requireWeddingReadAccess(
        weddingId
    )

    return unstable_cache(
        async (
            wId: string
        ) => {
            const supabase =
                createServiceClient()

            const {
                data: wedding,
                error:
                    weddingError,
            } =
                await supabase
                    .from(
                        'weddings'
                    )
                    .select(
                        'id'
                    )
                    .eq(
                        'id',
                        wId
                    )
                    .maybeSingle()

            if (
                weddingError ||
                !wedding
            ) {
                throw new Error(
                    'Wedding not found'
                )
            }

            const {
                data,
                error,
            } =
                await supabase
                    .from(
                        'tables'
                    )
                    .select(
                        '*, table_seats(*)'
                    )
                    .eq(
                        'wedding_id',
                        wId
                    )
                    .order(
                        'number',
                        {
                            ascending:
                                true,
                        }
                    )

            if (error) {
                throw new Error(
                    error.message
                )
            }

            return data as Table[]
        },
        [
            'wedding-tables',
            weddingId,
        ],
        {
            tags: [
                `tables-${weddingId}`,
            ],
        }
    )(weddingId)
}

export async function addTable(
    input: {
        weddingId: string
        number: number
        seats: number
        label?: string
        shape:
            | 'round'
            | 'rectangle'
            | 'square'
        seatSides?: SeatSides
    }
) {
    const {
        supabase,
    } =
        await requireWeddingAccess(
            input.weddingId
        )

    const parsed =
        tableSchema.safeParse({
            number:
            input.number,
            seats:
            input.seats,
            label:
            input.label,
            shape:
            input.shape,
            seatSides:
            input.seatSides,
        })

    if (
        !parsed.success
    ) {
        throw new Error(
            `Invalid input: ${parsed.error.errors[0]?.message ?? ''}`
        )
    }

    const dimensions =
        {
            round: {
                width: 128,
                height: 128,
            },

            square: {
                width: 140,
                height: 140,
            },

            rectangle: {
                width: 240,
                height: 100,
            },
        }[
            parsed.data
                .shape
            ]

    const {
        seatSides,
        ...tableData
    } =
        parsed.data

    const {
        data: table,
        error,
    } =
        await supabase
            .from('tables')
            .insert({
                wedding_id:
                input.weddingId,

                ...tableData,

                pos_x:
                    200,

                pos_y:
                    200,

                ...dimensions,
            })
            .select()
            .single()

    if (
        error ||
        !table
    ) {
        throw new Error(
            error?.message ??
            'Failed to create table'
        )
    }

    /*
     * Keep your existing behavior for now.
     *
     * See the note below regarding round-table
     * seat records.
     */
    if (
        tableData.shape !==
        'round'
    ) {
        const positions =
            generateSeatPositions(
                tableData.shape,
                tableData.seats,
                dimensions.width,
                dimensions.height,
                seatSides
            )

        const seatRows =
            positions.map(
                (
                    position
                ) => ({
                    table_id:
                    table.id,

                    seat_index:
                    position.seat_index,

                    relative_x:
                    position.relative_x,

                    relative_y:
                    position.relative_y,
                })
            )

        if (
            seatRows.length >
            0
        ) {
            const {
                error:
                    seatsError,
            } =
                await supabase
                    .from(
                        'table_seats'
                    )
                    .insert(
                        seatRows
                    )

            if (
                seatsError
            ) {
                throw new Error(
                    seatsError.message
                )
            }
        }
    }

    revalidateSeating(
        input.weddingId
    )

    return table
}

export async function assignGuestToSeat(
    guestId: string,
    seatId: string | null,
    tableId: string | null
) {
    const {
        supabase,
        weddingId,
    } =
        await requireGuestAccess(
            guestId
        )

    /*
     * Removing seat/table is allowed.
     */
    if (
        !seatId ||
        !tableId
    ) {
        const {
            error,
        } =
            await supabase
                .from('guests')
                .update({
                    table_id:
                    tableId,
                    seat_id:
                    seatId,
                })
                .eq(
                    'id',
                    guestId
                )
                .eq(
                    'wedding_id',
                    weddingId
                )

        if (error) {
            throw new Error(
                error.message
            )
        }

        revalidateSeating(
            weddingId
        )

        return
    }

    /*
     * Verify destination table belongs
     * to the same wedding.
     */
    const tableWeddingId =
        await getTableWeddingId(
            supabase,
            tableId
        )

    if (
        tableWeddingId !==
        weddingId
    ) {
        throw new Error(
            'Table does not belong to this wedding'
        )
    }

    /*
     * Verify that this seat actually belongs
     * to the supplied table.
     */
    const {
        data: seat,
        error:
            seatError,
    } =
        await supabase
            .from(
                'table_seats'
            )
            .select(
                'id, table_id'
            )
            .eq(
                'id',
                seatId
            )
            .eq(
                'table_id',
                tableId
            )
            .maybeSingle()

    if (
        seatError ||
        !seat
    ) {
        throw new Error(
            'Seat not found'
        )
    }

    const {
        error,
    } =
        await supabase
            .from('guests')
            .update({
                table_id:
                tableId,
                seat_id:
                seatId,
            })
            .eq(
                'id',
                guestId
            )
            .eq(
                'wedding_id',
                weddingId
            )

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateSeating(
        weddingId
    )
}

export async function updateTable(
    id: string,
    formData: {
        number: number
        seats: number
        label?: string | null
        shape:
            | 'round'
            | 'rectangle'
            | 'square'
        seatSides?: SeatSides
    }
) {
    const {
        supabase,
        weddingId,
    } =
        await requireTableAccess(
            id
        )

    const parsed =
        tableSchema.safeParse(
            formData
        )

    if (
        !parsed.success
    ) {
        throw new Error(
            `Invalid input: ${parsed.error.errors[0]?.message ?? ''}`
        )
    }

    const {
        seatSides,
        ...tableData
    } =
        parsed.data

    const dimensions =
        {
            round: {
                width: 128,
                height: 128,
            },

            square: {
                width: 140,
                height: 140,
            },

            rectangle: {
                width: 240,
                height: 100,
            },
        }[
            tableData.shape
            ]

    const {
        data: table,
        error,
    } =
        await supabase
            .from('tables')
            .update({
                ...tableData,
                ...dimensions,
            })
            .eq(
                'id',
                id
            )
            .eq(
                'wedding_id',
                weddingId
            )
            .select()
            .single()

    if (
        error ||
        !table
    ) {
        throw new Error(
            error?.message ??
            'Failed to update table'
        )
    }

    /*
     * Rebuild seat positions.
     */
    const {
        error:
            deleteSeatsError,
    } =
        await supabase
            .from(
                'table_seats'
            )
            .delete()
            .eq(
                'table_id',
                id
            )

    if (
        deleteSeatsError
    ) {
        throw new Error(
            deleteSeatsError.message
        )
    }

    if (
        tableData.shape !==
        'round'
    ) {
        const positions =
            generateSeatPositions(
                tableData.shape,
                tableData.seats,
                dimensions.width,
                dimensions.height,
                seatSides
            )

        const seatRows =
            positions.map(
                (
                    position
                ) => ({
                    table_id:
                    id,

                    seat_index:
                    position.seat_index,

                    relative_x:
                    position.relative_x,

                    relative_y:
                    position.relative_y,
                })
            )

        if (
            seatRows.length >
            0
        ) {
            const {
                error:
                    seatsError,
            } =
                await supabase
                    .from(
                        'table_seats'
                    )
                    .insert(
                        seatRows
                    )

            if (
                seatsError
            ) {
                throw new Error(
                    seatsError.message
                )
            }
        }
    }

    revalidateSeating(
        weddingId
    )

    return table
}

export async function deleteTable(
    id: string
) {
    const {
        supabase,
        weddingId,
    } =
        await requireTableAccess(
            id
        )

    const {
        error,
    } =
        await supabase
            .from('tables')
            .delete()
            .eq(
                'id',
                id
            )
            .eq(
                'wedding_id',
                weddingId
            )

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateSeating(
        weddingId
    )
}

export async function updateTablePosition(
    id: string,
    pos_x: number,
    pos_y: number
) {
    const {
        supabase,
        weddingId,
    } =
        await requireTableAccess(
            id
        )

    const {
        error,
    } =
        await supabase
            .from('tables')
            .update({
                pos_x,
                pos_y,
            })
            .eq(
                'id',
                id
            )
            .eq(
                'wedding_id',
                weddingId
            )

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateTag(
        `tables-${weddingId}`,
        'max'
    )
}

/*
 * ============================================
 * VENUE ELEMENTS
 * ============================================
 */

export async function createVenueElement(
    input: {
        weddingId: string
        type: string
        label: string
        icon: string
        shape:
            | 'circle'
            | 'square'
            | 'rectangle'
        color: string
        posX?: number
        posY?: number
    }
) {
    const {
        supabase,
    } =
        await requireWeddingAccess(
            input.weddingId
        )

    const dimensions: Record<
        string,
        {
            width: number
            height: number
        }
    > = {
        circle: {
            width: 90,
            height: 90,
        },

        square: {
            width: 100,
            height: 100,
        },

        rectangle: {
            width: 160,
            height: 90,
        },
    }

    const {
        width,
        height,
    } =
        dimensions[
            input.shape
            ]

    const {
        data,
        error,
    } =
        await supabase
            .from(
                'venue_elements'
            )
            .insert({
                wedding_id:
                input.weddingId,

                type:
                input.type,

                label:
                input.label,

                icon:
                input.icon,

                shape:
                input.shape,

                color:
                input.color,

                pos_x:
                    input.posX ??
                    200,

                pos_y:
                    input.posY ??
                    200,

                width,
                height,
            })
            .select()
            .single()

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateTag(
        `venue-elements-${input.weddingId}`,
        'max'
    )

    return data
}

export async function updateVenueElementPosition(
    id: string,
    posX: number,
    posY: number
) {
    const {
        supabase,
        weddingId,
    } =
        await requireVenueElementAccess(
            id
        )

    const {
        error,
    } =
        await supabase
            .from(
                'venue_elements'
            )
            .update({
                pos_x:
                posX,
                pos_y:
                posY,
            })
            .eq(
                'id',
                id
            )
            .eq(
                'wedding_id',
                weddingId
            )

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateTag(
        `venue-elements-${weddingId}`,
        'max'
    )
}

export async function deleteVenueElement(
    id: string
) {
    const {
        supabase,
        weddingId,
    } =
        await requireVenueElementAccess(
            id
        )

    const {
        error,
    } =
        await supabase
            .from(
                'venue_elements'
            )
            .delete()
            .eq(
                'id',
                id
            )
            .eq(
                'wedding_id',
                weddingId
            )

    if (error) {
        throw new Error(
            error.message
        )
    }

    revalidateTag(
        `venue-elements-${weddingId}`,
        'max'
    )
}

export async function getVenueElements(
    weddingId: string
) {
    await requireWeddingReadAccess(
        weddingId
    )

    return unstable_cache(
        async (
            wId: string
        ) => {
            const supabase =
                createServiceClient()

            const {
                data: wedding,
                error:
                    weddingError,
            } =
                await supabase
                    .from(
                        'weddings'
                    )
                    .select(
                        'id'
                    )
                    .eq(
                        'id',
                        wId
                    )
                    .maybeSingle()

            if (
                weddingError ||
                !wedding
            ) {
                throw new Error(
                    'Wedding not found'
                )
            }

            const {
                data,
                error,
            } =
                await supabase
                    .from(
                        'venue_elements'
                    )
                    .select(`
                        id,
                        type,
                        label,
                        icon,
                        shape,
                        color,
                        pos_x,
                        pos_y,
                        width,
                        height
                    `)
                    .eq(
                        'wedding_id',
                        wId
                    )
                    .order(
                        'created_at',
                        {
                            ascending:
                                true,
                        }
                    )

            if (error) {
                throw new Error(
                    error.message
                )
            }

            return data as VenueElement[]
        },
        [
            'wedding-venue-elements',
            weddingId,
        ],
        {
            tags: [
                `venue-elements-${weddingId}`,
            ],
        }
    )(weddingId)
}