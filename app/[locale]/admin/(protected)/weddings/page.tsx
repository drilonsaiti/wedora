import type {WeddingRow, WeddingSettings,} from '@/components/admin/weddings-page-client'
import {WeddingsPageClient} from '@/components/admin/weddings-page-client'
import {redirect} from '@/lib/navigation'
import {createClient} from '@/lib/supabase/server'

export const dynamic =
    'force-dynamic'

interface Props {
    params: Promise<{
        locale: string
    }>
}

type RawWeddingSettings = {
    theme_color?: string | null
    enable_find_seat?: boolean | null
    enable_photo_upload?: boolean | null
}

type RawWedding = {
    id: string
    groom_name: string | null
    bride_name: string | null
    groom_email?: string | null
    bride_email?: string | null
    slug: string | null
    wedding_date: string | null
    created_at: string | null
    wedding_settings?:
        | RawWeddingSettings
        | RawWeddingSettings[]
        | null
}

export default async function AdminWeddingsListPage({
                                                        params,
                                                    }: Props) {
    const {locale} =
        await params

    const supabase =
        await createClient()

    const {
        data: {user},
    } =
        await supabase.auth.getUser()

    if (!user) {
        redirect({
            href: '/admin/login',
            locale,
        })

        return null
    }

    const {data: admin} =
        await supabase
            .from('admins')
            .select('id')
            .eq(
                'id',
                user.id
            )
            .single()

    if (!admin) {
        redirect({
            href: '/admin/login',
            locale,
        })

        return null
    }

    const {
        data,
        error,
    } =
        await supabase
            .from('weddings')
            .select(`
                id,
                groom_name,
                bride_name,
                groom_email,
                bride_email,
                slug,
                wedding_date,
                created_at,
                wedding_settings (
                    theme_color,
                    enable_find_seat,
                    enable_photo_upload
                )
            `)
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

    /*
     * Supabase's generated TypeScript types
     * currently don't understand the nested
     * wedding_settings relationship correctly.
     *
     * Normalize the database result here so
     * the client gets one stable shape.
     */
    const rawWeddings =
        (data ??
            []) as unknown as RawWedding[]

    const weddings: WeddingRow[] =
        rawWeddings.map(
            (
                wedding
            ) => {
                const settings:
                    | WeddingSettings
                    | WeddingSettings[]
                    | null =
                    wedding.wedding_settings ??
                    null

                return {
                    id:
                    wedding.id,

                    groom_name:
                    wedding.groom_name,

                    bride_name:
                    wedding.bride_name,

                    groom_email:
                        wedding.groom_email ??
                        null,

                    bride_email:
                        wedding.bride_email ??
                        null,

                    slug:
                    wedding.slug,

                    wedding_date:
                    wedding.wedding_date,

                    created_at:
                    wedding.created_at,

                    wedding_settings:
                    settings,
                }
            }
        )

    return (
        <WeddingsPageClient
            weddings={
                weddings
            }
            adminEmail={
                user.email ??
                ''
            }
        />
    )
}