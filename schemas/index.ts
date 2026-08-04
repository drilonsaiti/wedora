import {z} from 'zod'

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
    isPublic: z.boolean().default(false),
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

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
})

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const serverUploadSchema = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    guestName: z.string().max(100).optional().nullable(),
    message: z.string().max(500).optional().nullable(),
    isPublic: z.boolean().default(true),
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

export const guestSchema = z.object({
    first_name: z.string().min(1, 'First name is required').max(50),
    last_name: z.string().min(1, 'Last name is required').max(50),
    table_id: z.string().uuid().nullable().optional(),
})

export type GuestFormValues = z.infer<typeof guestSchema>

export const tableSchema = z.object({
    number: z.number().int().positive('Table number must be positive'),
    seats: z.number().int().positive('Seats must be positive'),
    label: z.string().max(50, 'Label must be under 50 characters').optional().nullable(),
})

export type TableFormValues = z.infer<typeof tableSchema>

export const createWeddingSchema = z.object({
    groom_name: z.string().trim().min(2, 'Emri duhet të ketë të paktën 2 shkronja').max(50, 'Emri është shumë i gjatë'),
    bride_name: z.string().trim().min(2, 'Emri duhet të ketë të paktën 2 shkronja').max(50, 'Emri është shumë i gjatë'),
    slug: z.string().trim().min(3, 'URL-ja duhet të ketë të paktën 3 karaktere').max(60, 'URL-ja është shumë e gjatë').regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Vetëm shkronja të vogla, numra dhe vizë (-) lejohen'),
    theme_hue: z.number().min(0).max(360).default(355),
});

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;
