'use server'

import { v4 as uuidv4 } from 'uuid'
import { createServiceClient } from '@/lib/supabase/server'
import { processImage } from '@/lib/sharp'
import { serverUploadSchema } from '@/schemas'

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
      return { success: false, error: 'No file provided' }
    }

    // Validate metadata
    const parsed = serverUploadSchema.safeParse({
      eventId: formData.get('eventId'),
      guestName: formData.get('guestName') || null,
      message: formData.get('message') || null,
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

    const { eventId, guestName, message, sessionId } = parsed.data

    // Basic rate limiting: max 20 photos per session
    const supabase = createServiceClient()
    const { count } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by_session', sessionId)

    if ((count ?? 0) >= 20) {
      return { success: false, error: 'Upload limit reached for this session' }
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process with Sharp
    const { optimizedBuffer, thumbnailBuffer, width, height } =
      await processImage(buffer)

    const photoId = uuidv4()
    const originalPath = `${eventId}/${photoId}/original.webp`
    const thumbnailPath = `${eventId}/${photoId}/thumbnail.webp`

    // Upload optimized original
    const { error: originalError } = await supabase.storage
      .from('photos')
      .upload(originalPath, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (originalError) {
      console.error('Original upload error:', originalError)
      return { success: false, error: 'Failed to upload image' }
    }

    // Upload thumbnail
    const { error: thumbError } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (thumbError) {
      // Cleanup original if thumb fails
      await supabase.storage.from('photos').remove([originalPath])
      console.error('Thumbnail upload error:', thumbError)
      return { success: false, error: 'Failed to process image' }
    }

    // Insert DB record
    const { error: dbError } = await supabase.from('photos').insert({
      id: photoId,
      event_id: eventId,
      uploaded_by_session: sessionId,
      guest_name: guestName ?? null,
      message: message ?? null,
      original_path: originalPath,
      thumbnail_path: thumbnailPath,
      mime_type: 'image/webp',
      file_size: optimizedBuffer.length,
      width,
      height,
      approved: true,
      hidden: false,
      favourite: false,
    })

    if (dbError) {
      // Cleanup storage
      await supabase.storage.from('photos').remove([originalPath])
      await supabase.storage.from('thumbnails').remove([thumbnailPath])
      console.error('DB insert error:', dbError)
      return { success: false, error: 'Failed to save photo' }
    }

    return { success: true, photoId }
  } catch (error) {
    console.error('Upload action error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
