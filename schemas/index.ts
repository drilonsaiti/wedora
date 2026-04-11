import { z } from 'zod'

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export const uploadFormSchema = z.object({
  guestName: z
    .string()
    .max(100, 'Name must be under 100 characters')
    .optional()
    .transform((v) => v?.trim() || undefined),
  message: z
    .string()
    .max(500, 'Message must be under 500 characters')
    .optional()
    .transform((v) => v?.trim() || undefined),
})

export type UploadFormValues = z.infer<typeof uploadFormSchema>

export const fileSchema = z
  .instanceof(File)
  .refine((f) => f.size > 0, 'File is required')
  .refine(
    (f) => f.size <= MAX_FILE_SIZE_BYTES,
    `File must be smaller than 10MB`
  )
  .refine(
    (f) => ACCEPTED_IMAGE_TYPES.includes(f.type),
    'Only JPEG, PNG, WebP, and HEIC images are accepted'
  )

export const photoUpdateSchema = z.object({
  id: z.string().uuid(),
  approved: z.boolean().optional(),
  hidden: z.boolean().optional(),
  favourite: z.boolean().optional(),
})

export type PhotoUpdateValues = z.infer<typeof photoUpdateSchema>

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type AdminLoginValues = z.infer<typeof adminLoginSchema>

export const serverUploadSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  guestName: z.string().max(100).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
  sessionId: z.string().min(1).max(128),
  mimeType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ] as const),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
})

export type ServerUploadValues = z.infer<typeof serverUploadSchema>
