'use server'

import {v4 as uuidv4} from 'uuid'
import {createServiceClient} from '@/lib/supabase/server'
import {processImage} from '@/lib/sharp'
import {serverUploadSchema} from '@/schemas'
import {revalidateTag} from 'next/cache'

export interface UploadResult {
    success: boolean
    photoId?: string
    error?: string
}

export async function uploadPhotoAction(
    formData: FormData
): Promise<UploadResult> {
    try {
        const file = formData.get('file') as File | null
        if (!file || file.size === 0) {
            return {success: false, error: 'No file provided'}
        }

        const parsed = serverUploadSchema.safeParse({
            eventId: formData.get('eventId'),
            guestName: formData.get('guestName') || null,
            message: formData.get('message') || null,
            isPublic: formData.get('isPublic') === 'true',
            sessionId: formData.get('sessionId'),
            mimeType: file.type,
            fileSize: file.size,
        })

        if (!parsed.success) {
            return {
                success: false,
                error: parsed.error.errors[0]?.message ?? 'Invalid input',
            }
        }

        const {eventId, guestName, message, isPublic, sessionId} = parsed.data

        const supabase = createServiceClient()

        // Get wedding_id from event_id
        const {data: eventData} = await supabase
            .from('events')
            .select('wedding_id')
            .eq('id', eventId)
            .single()

        if (!eventData?.wedding_id) {
            return {success: false, error: 'Invalid event'}
        }

        const weddingId = eventData.wedding_id

        const {count} = await supabase
            .from('photos')
            .select('*', {count: 'exact', head: true})
            .eq('uploaded_by_session', sessionId)
            .eq('wedding_id', weddingId)

        if ((count ?? 0) >= 20) {
            return {success: false, error: 'Upload limit reached for this session'}
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const {optimizedBuffer, thumbnailBuffer, width, height} =
            await processImage(buffer)

        const photoId = uuidv4()
        const originalPath = `${eventId}/${photoId}/original.webp`
        const thumbnailPath = `${eventId}/${photoId}/thumbnail.webp`

        const {error: originalError} = await supabase.storage
            .from('photos')
            .upload(originalPath, optimizedBuffer, {
                contentType: 'image/webp',
                upsert: false,
            })

        if (originalError) {
            console.error('Original upload error:', originalError)
            return {success: false, error: 'Failed to upload image'}
        }

        const {error: thumbError} = await supabase.storage
            .from('thumbnails')
            .upload(thumbnailPath, thumbnailBuffer, {
                contentType: 'image/webp',
                upsert: false,
            })

        if (thumbError) {
            await supabase.storage.from('photos').remove([originalPath])
            console.error('Thumbnail upload error:', thumbError)
            return {success: false, error: 'Failed to process image'}
        }

        const payload = {
            id: photoId,
            event_id: eventId,
            wedding_id: weddingId,
            uploaded_by_session: sessionId,
            guest_name: guestName ?? null,
            message: message ?? null,
            original_path: originalPath,
            thumbnail_path: thumbnailPath,
            mime_type: 'image/webp',
            file_size: optimizedBuffer.length,
            width,
            height,
            approved: false,
            hidden: false,
            favourite: false,
            is_public: isPublic,
        }

        const {error: dbError} = await supabase
            .from('photos')
            .insert(payload)

        if (dbError) {
            await supabase.storage.from('photos').remove([originalPath])
            await supabase.storage.from('thumbnails').remove([thumbnailPath])
            console.error('DB insert error:', dbError)
            return {success: false, error: 'Failed to save photo'}
        }

        revalidateTag(`gallery-photos-${weddingId}`, 'max')
        return {success: true, photoId}
    } catch (error) {
        console.error('Upload action error:', error)
        return {success: false, error: 'An unexpected error occurred'}
    }
}