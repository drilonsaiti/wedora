import {notFound} from 'next/navigation'
import {getWeddingBySlug} from '@/actions/wedding'
import {createServiceClient} from '@/lib/supabase/server'
import {UploadForm} from '@/components/upload-form'
import {BottomNav} from '@/components/bottom-nav'

type Props = { params: Promise<{ locale: string; slug: string }> }

export default async function PublicUploadPage({params}: Props) {
    const {locale, slug} = await params
    const wedding = await getWeddingBySlug(slug)
    const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB ?? 10);
    if (!wedding) notFound()
    if (!wedding.wedding_settings?.enable_photo_upload) notFound()

    const supabase = createServiceClient()
    const {data: event} = await supabase
        .from('events')
        .select('id')
        .eq('wedding_id', wedding.id)
        .maybeSingle()

    if (!event) notFound()

    return (
        <>
            <div className="max-w-md mx-auto px-6 pt-10 pb-32">
                <UploadForm
                    eventId={event.id}
                    maxPhotosPerGuest={wedding.wedding_settings.max_photos_per_guest}
                    maxFileSizeMb={maxFileSizeMb}
                />
            </div>
            <BottomNav
                slug={slug}
                enableFindSeat={wedding.wedding_settings?.enable_find_seat}
                enablePhotoUpload={wedding.wedding_settings?.enable_photo_upload}
            />
        </>
    )
}