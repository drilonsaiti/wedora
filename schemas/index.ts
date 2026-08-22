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
        .max(100, 'validation.nameLength')
        .optional()
        .transform((v) => v?.trim() || undefined),
    message: z
        .string()
        .max(500, 'validation.messageLength')
        .optional()
        .transform((v) => v?.trim() || undefined),
    isPublic: z.boolean().default(false),
})

export type UploadFormValues = z.infer<typeof uploadFormSchema>

export const fileSchema = z
    .instanceof(File)
    .refine((f) => f.size > 0, 'validation.fileRequired')
    .refine(
        (f) => f.size <= MAX_FILE_SIZE_BYTES,
        'validation.fileSize'
    )
    .refine(
        (f) => ACCEPTED_IMAGE_TYPES.includes(f.type),
        'validation.fileType'
    )

export const photoUpdateSchema = z.object({
    id: z.string().uuid(),
    approved: z.boolean().optional(),
    hidden: z.boolean().optional(),
    favourite: z.boolean().optional(),
})

export type PhotoUpdateValues = z.infer<typeof photoUpdateSchema>

export const adminLoginSchema = z.object({
    email: z.string().email('validation.email'),
    password: z.string().min(8, 'validation.minLength'),
})

export type AdminLoginValues = z.infer<typeof adminLoginSchema>

export const coupleLoginSchema = z.object({
    email: z.string().email('validation.email'),
    password: z.string().min(8, 'validation.minLength'),
})

export type CoupleLoginValues = z.infer<typeof coupleLoginSchema>

export const forgotPasswordSchema = z.object({
    email: z.string().email('validation.email'),
})

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
    password: z.string().min(8, 'validation.minLength'),
    confirmPassword: z.string().min(8, 'validation.minLength'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
})

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const serverUploadSchema = z.object({
    eventId: z.string().uuid('validation.invalidEventId'),
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
    first_name: z.string().min(1, 'validation.required').max(50),
    last_name: z.string().min(1, 'validation.required').max(50),
    table_id: z.string().uuid().nullable().optional(),
})

export type GuestFormValues = z.infer<typeof guestSchema>

const seatSidesSchema = z.object({
    top: z.number().min(0),
    right: z.number().min(0),
    bottom: z.number().min(0),
    left: z.number().min(0),
})

export type SeatSides = z.infer<typeof seatSidesSchema>

export const tableSchema = z.object({
    number: z.number().min(1, 'validation.required'),
    seats: z.number().min(1, 'validation.required'),
    label: z.string().optional(),
    shape: z.enum(['round', 'rectangle', 'square']),
    seatSides: seatSidesSchema.optional(),
}).refine((data) => {
    if (data.shape === 'round' || !data.seatSides) return true
    const sum = data.seatSides.top + data.seatSides.right + data.seatSides.bottom + data.seatSides.left
    return sum === data.seats
}, {
    message: 'validation.seatsMismatch',
    path: ['seatSides'],
})

export type TableFormValues = z.infer<typeof tableSchema>


export const createWeddingSchema = z.object({
    groom_name: z.string().trim().min(2, 'validation.minTwoChars').max(50),
    bride_name: z.string().trim().min(2, 'validation.minTwoChars').max(50),
    groom_email: z.string().trim().email('validation.email'),
    bride_email: z.string().trim().email('validation.email').optional().or(z.literal('')),
    slug: z.string().trim().min(3).max(60).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'validation.invalidSlug'),
    wedding_date: z.string().min(1, 'validation.required'),
    theme_hue: z.number().min(0).max(360).default(355),
    enable_find_seat: z.boolean().default(true),
    enable_photo_upload: z.boolean().default(true),
    max_photos_total: z.preprocess(
        (val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : val),
        z.number().int().min(1).max(10000).optional()
    ),
    max_photos_per_guest: z.preprocess(
        (val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : val),
        z.number().int().min(1).max(100).optional()
    ),
    photo_retention_days: z.number().int().min(1).max(3650).default(90),
}).refine((data) => data.enable_find_seat || data.enable_photo_upload, {
    message: 'validation.atLeastOneFunction',
    path: ['enable_find_seat'],
});

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;


export const editWeddingSchema = z.object({
    groom_name: z.string().trim().min(2).max(50),
    bride_name: z.string().trim().min(2).max(50),
    groom_email: z.string().trim().email(),
    bride_email: z.string().trim().email().optional().or(z.literal('')),
    wedding_date: z.string().min(1),
    theme_hue: z.number().min(0).max(360),
    enable_find_seat: z.boolean(),
    enable_photo_upload: z.boolean(),
}).refine((d) => d.enable_find_seat || d.enable_photo_upload, {
    message: 'validation.atLeastOneFunction',
    path: ['enable_find_seat'],
});

export type EditWeddingInput = z.infer<typeof editWeddingSchema>;
