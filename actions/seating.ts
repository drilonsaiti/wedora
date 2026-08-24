'use server'

import {
    revalidatePath,
    revalidateTag,
    unstable_cache,
} from 'next/cache'
import { redirect } from 'next/navigation'

import {
    createClient,
    createServiceClient,
} from '@/lib/supabase/server'
import { generateSeatPositions } from '@/lib/seat-generator'
import {
    guestSchema,
    type SeatSides,
    tableSchema,
} from '@/schemas'
import type {
    Table,
    VenueElement,
} from '@/types/seating'

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

async function requireAdmin() {
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

    const {
        data: admin,
        error,
    } =
        await authClient
            .from('admins')
            .select('id')
            .eq(
                'id',
                user.id
            )
            .maybeSingle()

    if (
        error ||
        !admin
    ) {
        redirect(
            '/admin/login'
        )
    }

    /*
     * We intentionally use the service client
     * only AFTER verifying that this user is
     * actually an administrator.
     *
     * This allows admins to manage weddings
     * even when owner_user_id belongs to another
     * user and owner-based RLS would otherwise
     * prevent access.
     */
    const supabase =
        createServiceClient()

    return {
        user,
        supabase,
    }
}

/*
 * ============================================
 * WEDDING VALIDATION
 * ============================================
 */
async function requireWedding(
    weddingId: string
) {
    const {
        supabase,
        user,
    } =
        await requireAdmin()

    const {
        data: wedding,
        error,
    } =
        await supabase
            .from('weddings')
            .select('id')
            .eq(
                'id',
                weddingId
            )
            .maybeSingle()

    if (
        error ||
        !wedding
    ) {
        throw new Error(
            'Wedding not found'
        )
    }

    return {
        user,
        supabase,
        weddingId:
        wedding.id,
    }
}

/*
 * ============================================
 * ENTITY → WEDDING HELPERS
 *
 * These allow update/delete functions to find
 * the wedding from the entity itself.
 * ============================================
 */
async function getGuestWeddingId(
    supabase: ReturnType<
        typeof createServiceClient
    >,
    guestId: string
) {
    const {
        data,
        error,
    } =
        await supabase
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

    return data.wedding_id
}

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

async function getVenueElementWeddingId(
    supabase: ReturnType<
        typeof createServiceClient
    >,
    elementId: string
) {
    const {
        data,
        error,
    } =
        await supabase
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
     * Never allow an unauthenticated caller to
     * reach the service-role query.
     */
    await requireAdmin()

    return unstable_cache(
        async (
            wId: string
        ) => {
            const supabase =
                createServiceClient()

            /*
             * Confirm that this wedding exists.
             */
            const {
                data: wedding,
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
                    .select(
                        `
                        *,
                        tables(
                            id,
                            number,
                            shape
                        ),
                        table_seats(
                            seat_index
                        )
                        `
                    )
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
            'admin-guests',
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
        await requireWedding(
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
    } =
        await requireAdmin()

    const weddingId =
        await getGuestWeddingId(
            supabase,
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
    } =
        await requireAdmin()

    const weddingId =
        await getGuestWeddingId(
            supabase,
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
    } =
        await requireAdmin()

    const weddingId =
        await getGuestWeddingId(
            supabase,
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
    await requireAdmin()

    return unstable_cache(
        async (
            wId: string
        ) => {
            const supabase =
                createServiceClient()

            const {
                data: wedding,
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
            'admin-tables',
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
        await requireWedding(
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
    } =
        await requireAdmin()

    const weddingId =
        await getGuestWeddingId(
            supabase,
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
    } =
        await requireAdmin()

    const weddingId =
        await getTableWeddingId(
            supabase,
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
    } =
        await requireAdmin()

    const weddingId =
        await getTableWeddingId(
            supabase,
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
    } =
        await requireAdmin()

    const weddingId =
        await getTableWeddingId(
            supabase,
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
        await requireWedding(
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
    } =
        await requireAdmin()

    const weddingId =
        await getVenueElementWeddingId(
            supabase,
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
    } =
        await requireAdmin()

    const weddingId =
        await getVenueElementWeddingId(
            supabase,
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
    await requireAdmin()

    return unstable_cache(
        async (
            wId: string
        ) => {
            const supabase =
                createServiceClient()

            const {
                data: wedding,
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
                    .select(
                        `
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
                        `
                    )
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
            'admin-venue-elements',
            weddingId,
        ],
        {
            tags: [
                `venue-elements-${weddingId}`,
            ],
        }
    )(weddingId)
}