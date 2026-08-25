'use server'

import {revalidatePath, revalidateTag} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient, createServiceClient} from '@/lib/supabase/server'
import {photoUpdateSchema} from '@/schemas'
import {PhotoUpdate} from '@/types/database'


async function requireAdmin() {
    const supabase = await createClient()
    const {
        data: {user},
    } = await supabase.auth.getUser()

    console.log("requiredAdmin")
    if (!user) redirect('/admin/login')

    const {data: admin} = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!admin) redirect('/admin/login')

    // Try to find an owned wedding; platform admins may not own any.
    const {data: wedding} = await supabase
        .from('weddings')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle()

    return {user, supabase: createServiceClient(), weddingId: wedding?.id ?? null}
}

async function requirePhotoReadAccess(
    path: string,
    bucket:
        | 'photos'
        | 'thumbnails'
) {
    const authClient =
        await createClient()

    const {
        data: {
            user,
        },
    } =
        await authClient.auth.getUser()

    if (!user) {
        throw new Error(
            'Unauthorized'
        )
    }

    const serviceClient =
        createServiceClient()

    /*
     * Resolve the supplied storage path back to
     * an actual photo record.
     *
     * This prevents somebody from requesting an
     * arbitrary private storage path.
     */
    const photoQuery =
        serviceClient
            .from('photos')
            .select(
                'id, wedding_id'
            )

    const {
        data: photo,
        error: photoError,
    } =
        bucket ===
        'thumbnails'
            ? await photoQuery
                .eq(
                    'thumbnail_path',
                    path
                )
                .maybeSingle()
            : await photoQuery
                .eq(
                    'original_path',
                    path
                )
                .maybeSingle()

    if (
        photoError ||
        !photo
    ) {
        throw new Error(
            'Photo not found'
        )
    }

    /*
     * ============================================
     * COUPLE
     * ============================================
     *
     * Couple may read photos belonging only to
     * the wedding assigned to the account.
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
        photo.wedding_id
    ) {
        return {
            user,
            supabase:
            serviceClient,
            weddingId:
            photo.wedding_id,
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
            supabase:
            serviceClient,
            weddingId:
            photo.wedding_id,
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
                photo.wedding_id
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
        supabase:
        serviceClient,
        weddingId:
        photo.wedding_id,
        role:
            'owner' as const,
    }
}

async function requireWeddingPhotoManager(
    weddingId: string
) {
    const authClient =
        await createClient()

    const {
        data: {
            user,
        },
    } =
        await authClient.auth.getUser()

    if (!user) {
        throw new Error(
            'Unauthorized'
        )
    }

    const supabase =
        createServiceClient()

    /*
     * ============================================
     * GLOBAL ADMIN
     * ============================================
     */
    const {
        data: admin,
        error: adminError,
    } =
        await supabase
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
        const {
            data: wedding,
            error: weddingError,
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
            weddingError ||
            !wedding
        ) {
            throw new Error(
                'Wedding not found'
            )
        }

        return {
            user,
            supabase,
            role:
                'admin' as const,
            weddingId,
        }
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
        /*
         * Verify that couple access is still enabled.
         */
        const {
            data: settings,
            error: settingsError,
        } =
            await supabase
                .from(
                    'wedding_settings'
                )
                .select(
                    'enable_couple_login'
                )
                .eq(
                    'wedding_id',
                    weddingId
                )
                .maybeSingle()

        if (
            settingsError ||
            !settings
                ?.enable_couple_login
        ) {
            throw new Error(
                'Couple access disabled'
            )
        }

        return {
            user,
            supabase,
            role:
                'couple' as const,
            weddingId,
        }
    }

    /*
     * ============================================
     * OWNER
     * ============================================
     */
    const {
        data: ownedWedding,
        error: ownerError,
    } =
        await supabase
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
        supabase,
        role:
            'owner' as const,
        weddingId,
    }
}

async function requireWeddingAdmin() {
    const context = await requireAdmin()

    const {data: wedding, error} = await context.supabase
        .from('weddings')
        .select('id')
        .eq('owner_user_id', context.user.id)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    if (!wedding) {
        throw new Error('No wedding configured')
    }

    return {
        ...context,
        weddingId: wedding.id,
    }
}

export async function updatePhotoAction(
    id: string,
    weddingId: string,
    update: Partial<PhotoUpdate>
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const parsed = photoUpdateSchema.safeParse({
            id,
            ...update,
        });

        if (!parsed.success) {
            return {
                success: false,
                error: "Invalid input",
            };
        }

        const { supabase } = await requireWeddingPhotoManager(weddingId);

        const { approved, hidden, favourite } = parsed.data;

        const payload: PhotoUpdate = {};

        if (approved !== undefined) {
            payload.approved = approved;
        }

        if (hidden !== undefined) {
            payload.hidden = hidden;
        }

        if (favourite !== undefined) {
            payload.favourite = favourite;
        }

        const { data: updatedPhoto, error } = await supabase
            .from("photos")
            .update(payload)
            .eq("id", id)
            .eq("wedding_id", weddingId)
            .select("id")
            .maybeSingle();

        if (error) {
            return {
                success: false,
                error: error.message,
            };
        }

        if (!updatedPhoto) {
            return {
                success: false,
                error: "Photo not found",
            };
        }

        /*
         * Public gallery caches currently use
         * the "gallery-photos" tag.
         */
        revalidateTag("gallery-photos", "max");

        revalidatePath(`/admin/weddings/${weddingId}/photos`);

        revalidatePath(`/couple/weddings/${weddingId}/photos`);

        return {
            success: true,
        };
    } catch (error) {
        console.error("Update photo error:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}


export async function deletePhotoAction(
    id: string,
    weddingId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()

        const result = await supabase
            .from('photos')
            .select('original_path, thumbnail_path')
            .eq('id', id)
            .eq('wedding_id', weddingId)
            .single()

        const photo = result.data as {
            original_path: string
            thumbnail_path: string
        } | null

        if (result.error || !photo) {
            return {success: false, error: 'Photo not found'}
        }

        const serviceSupabase = createServiceClient()
        await serviceSupabase.storage.from('photos').remove([photo.original_path])
        await serviceSupabase.storage.from('thumbnails').remove([photo.thumbnail_path])

        const {error: dbError} = await supabase
            .from('photos')
            .delete()
            .eq('id', id)

        if (dbError) return {success: false, error: dbError.message}

        revalidateTag(`gallery-photos-${weddingId}`, 'max')
        revalidatePath(`/admin/weddings/${weddingId}/photos`)
        revalidatePath(`/couple/weddings/${weddingId}/photos`)
        return {success: true}
    } catch {
        return {success: false, error: 'Unexpected error'}
    }
}

export async function getSignedUrlAction(
    path: string,
    bucket: "photos" | "thumbnails"
): Promise<{
    url?: string;
    error?: string;
}> {
    try {
        const { supabase } = await requirePhotoReadAccess(path, bucket);

        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600);

        if (error) {
            return {
                error: error.message,
            };
        }

        return {
            url: data.signedUrl,
        };
    } catch (error) {
        console.error("Signed URL error:", error);

        return {
            error: "Failed to generate URL",
        };
    }
}


// Returns signed URLs for all visible photos — used by gallery token creation
export async function getBatchSignedUrlsAction(
    photoIds: string[]
): Promise<{ urls: Record<string, { thumb: string; original: string }>; error?: string }> {
    try {
        await requireAdmin()
        const supabase = createServiceClient()

        const result = await supabase
            .from('photos')
            .select('id, original_path, thumbnail_path')
            .in('id', photoIds)

        const photos = result.data as Array<{
            id: string
            original_path: string
            thumbnail_path: string
        }> | null

        if (result.error || !photos) {
            return {urls: {}, error: result.error?.message}
        }

        const urls: Record<string, { thumb: string; original: string }> = {}

        await Promise.all(
            photos.map(async (p) => {
                const [thumbRes, origRes] = await Promise.all([
                    supabase.storage.from('thumbnails').createSignedUrl(p.thumbnail_path, 3600),
                    supabase.storage.from('photos').createSignedUrl(p.original_path, 3600),
                ])

                if (thumbRes.data && origRes.data) {
                    urls[p.id] = {
                        thumb: thumbRes.data.signedUrl,
                        original: origRes.data.signedUrl,
                    }
                }
            })
        )

        return {urls}
    } catch {
        return {urls: {}, error: 'Unexpected error'}
    }
}

export async function getPhotosAction(
    weddingId: string | null,
    filters?: {
        favourite?: boolean
        hidden?: boolean
        approved?: boolean
    },
    limit?: number,
    offset?: number
) {
    try {
        const supabase = await createClient() // jo requireWeddingAdmin() — page-t tashmë verifikuan identitetin

        if (!weddingId) {
            return {photos: [], total: 0, error: undefined}
        }

        let query = supabase
            .from('photos')
            .select('*', {count: 'exact'})
            .eq('wedding_id', weddingId)
            .order('created_at', {ascending: false})

        if (filters?.favourite !== undefined) query = query.eq('favourite', filters.favourite)
        if (filters?.hidden !== undefined) query = query.eq('hidden', filters.hidden)
        if (filters?.approved !== undefined) query = query.eq('approved', filters.approved)

        if (limit !== undefined) {
            const from = offset ?? 0
            const to = from + limit - 1
            query = query.range(from, to)
        }

        const {data, error, count} = await query

        if (error) {
            return {photos: [], total: 0, error: error.message}
        }

        return {photos: data ?? [], total: count ?? 0}
    } catch (error) {
        return {
            photos: [],
            total: 0,
            error: error instanceof Error ? error.message : 'Unexpected error',
        }
    }
}

// ============================================================
// GALLERY TOKEN
// ============================================================

export interface GalleryTokenOptions {
    weddingId: string
    eventId?: string
    label?: string
    showMessages?: boolean
    expiresInDays?: number
    photoFilter?:
        | 'all'
        | 'favourites'
}

export async function createGalleryTokenAction(
    opts: GalleryTokenOptions
): Promise<{
    token?: string
    url?: string
    error?: string
}> {
    try {
        const {
            user,
            supabase,
            weddingId,
        } =
            await requireWeddingPhotoManager(
                opts.weddingId
            )

        let eventId =
            opts.eventId

        /*
         * If an event was supplied, verify that it
         * actually belongs to this wedding.
         */
        if (eventId) {
            const {
                data: event,
                error: eventError,
            } =
                await supabase
                    .from('events')
                    .select('id')
                    .eq(
                        'id',
                        eventId
                    )
                    .eq(
                        'wedding_id',
                        weddingId
                    )
                    .maybeSingle()

            if (
                eventError ||
                !event
            ) {
                return {
                    error:
                        'Invalid event',
                }
            }
        } else {
            /*
             * No event explicitly supplied.
             * Find the wedding's event.
             */
            const {
                data: event,
                error: eventError,
            } =
                await supabase
                    .from('events')
                    .select('id')
                    .eq(
                        'wedding_id',
                        weddingId
                    )
                    .order(
                        'created_at',
                        {
                            ascending:
                                true,
                        }
                    )
                    .limit(1)
                    .maybeSingle()

            if (
                eventError ||
                !event
            ) {
                return {
                    error:
                        'No event found for this wedding',
                }
            }

            eventId =
                event.id
        }

        const expiresAt =
            opts.expiresInDays
                ? new Date(
                    Date.now() +
                    opts.expiresInDays *
                    86_400_000
                ).toISOString()
                : null

        const {
            data,
            error,
        } =
            await supabase
                .from(
                    'gallery_tokens'
                )
                .insert({
                    event_id:
                    eventId,

                    label:
                        opts.label ??
                        null,

                    show_messages:
                        opts.showMessages ??
                        true,

                    expires_at:
                    expiresAt,

                    created_by:
                    user.id,

                    photo_filter:
                        opts.photoFilter ??
                        'all',

                    wedding_id:
                    weddingId,
                })
                .select(
                    'token'
                )
                .single()

        if (
            error ||
            !data
        ) {
            return {
                error:
                    error?.message ??
                    'Failed to create token',
            }
        }

        const appUrl =
            process.env
                .NEXT_PUBLIC_APP_URL ??
            ''

        return {
            token:
            data.token,

            url:
                `${appUrl}/gallery/${data.token}`,
        }
    } catch (
        error
        ) {
        console.error(
            'Create gallery token error:',
            error
        )

        return {
            error:
                error instanceof
                Error
                    ? error.message
                    : 'Unexpected error',
        }
    }
}

export async function listGalleryTokensAction(
    weddingId: string
): Promise<{
    tokens: Array<{
        id: string
        token: string
        label: string | null
        expires_at:
            | string
            | null
        created_at: string
        photo_filter: string
    }>
    error?: string
}> {
    try {
        const {
            supabase,
        } =
            await requireWeddingPhotoManager(
                weddingId
            )

        const {
            data,
            error,
        } =
            await supabase
                .from(
                    'gallery_tokens'
                )
                .select(`
                    id,
                    token,
                    label,
                    expires_at,
                    created_at,
                    photo_filter
                `)
                .eq(
                    'wedding_id',
                    weddingId
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false,
                    }
                )

        if (error) {
            return {
                tokens: [],
                error:
                error.message,
            }
        }

        return {
            tokens:
                data ?? [],
        }
    } catch (
        error
        ) {
        return {
            tokens: [],
            error:
                error instanceof
                Error
                    ? error.message
                    : 'Unexpected error',
        }
    }
}

export async function deleteGalleryTokenAction(
    id: string,
    weddingId: string
): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const {
            supabase,
        } =
            await requireWeddingPhotoManager(
                weddingId
            )

        const {
            error,
        } =
            await supabase
                .from(
                    'gallery_tokens'
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
            return {
                success:
                    false,
                error:
                error.message,
            }
        }

        revalidateTag(
            `gallery-photos-${weddingId}`,
            'max'
        )

        revalidatePath(
            `/admin/weddings/${weddingId}/photos`
        )

        revalidatePath(
            `/couple/weddings/${weddingId}/photos`
        )

        return {
            success:
                true,
        }
    } catch (
        error
        ) {
        return {
            success:
                false,
            error:
                error instanceof
                Error
                    ? error.message
                    : 'Unexpected error',
        }
    }
}

export async function signOutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/admin/login')
}

export async function getAdminDashboardStats() {
    const supabase = await createClient()
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return null

    const {data: weddings} = await supabase
        .from('weddings')
        .select('id, groom_name, bride_name, slug, created_at')

    if (!weddings || weddings.length === 0) {
        return {weddings: [], totalGuests: 0, totalPhotos: 0, pendingPhotos: 0}
    }

    const weddingIds = weddings.map((w) => w.id)

    const [{count: totalGuests}, {count: totalPhotos}, {count: pendingPhotos}] = await Promise.all([
        supabase.from('guests').select('id', {count: 'exact', head: true}).in('wedding_id', weddingIds),
        supabase.from('photos').select('id', {count: 'exact', head: true}).in('wedding_id', weddingIds),
        supabase.from('photos').select('id', {
            count: 'exact',
            head: true
        }).in('wedding_id', weddingIds).eq('approved', false),
    ])

    return {
        weddings,
        totalGuests: totalGuests ?? 0,
        totalPhotos: totalPhotos ?? 0,
        pendingPhotos: pendingPhotos ?? 0,
    }
}