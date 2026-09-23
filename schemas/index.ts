import { z } from "zod";

import { ADDON_IDS, PLAN_IDS } from "@/lib/plans";

const ACCEPTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
];

const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_MB ?? 10);

export const uploadFormSchema = z.object({
    guestName: z
        .string()
        .max(100, "validation.nameLength")
        .optional()
        .transform((v) => v?.trim() || undefined),

    message: z
        .string()
        .max(500, "validation.messageLength")
        .optional()
        .transform((v) => v?.trim() || undefined),

    isPublic: z.boolean().default(false),
});

export type UploadFormValues = z.infer<typeof uploadFormSchema>;

export const fileSchema = z
    .instanceof(File)
    .refine((f) => f.size > 0, "validation.fileRequired")
    .refine((f) => f.size <= MAX_FILE_SIZE_BYTES, "validation.fileSize")
    .refine((f) => ACCEPTED_IMAGE_TYPES.includes(f.type), "validation.fileType");

export const photoUpdateSchema = z.object({
    id: z.string().uuid("validation.invalidId"),
    approved: z.boolean().optional(),
    hidden: z.boolean().optional(),
    favourite: z.boolean().optional(),
});

export type PhotoUpdateValues = z.infer<typeof photoUpdateSchema>;

export const adminLoginSchema = z.object({
    email: z.string().email("validation.email"),
    password: z.string().min(8, "auth.passwordMinLength"),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export const coupleLoginSchema = z.object({
    email: z.string().email("validation.email"),
    password: z.string().min(8, "auth.passwordMinLength"),
});

export type CoupleLoginValues = z.infer<typeof coupleLoginSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().email("validation.email"),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        password: z.string().min(8, "auth.passwordMinLength"),

        confirmPassword: z.string().min(1, "validation.required"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "auth.passwordsDoNotMatch",
        path: ["confirmPassword"],
    });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const serverUploadSchema = z.object({
    eventId: z.string().uuid("validation.invalidEventId"),

    guestName: z.string().max(100, "validation.nameLength").optional().nullable(),

    message: z
        .string()
        .max(500, "validation.messageLength")
        .optional()
        .nullable(),

    isPublic: z.boolean().default(true),

    sessionId: z
        .string()
        .min(1, "validation.required")
        .max(128, "validation.sessionIdLength"),

    mimeType: z.enum([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
    ] as const),

    fileSize: z
        .number()
        .int("validation.invalidNumber")
        .positive("validation.positiveNumber")
        .max(MAX_FILE_SIZE_BYTES, "validation.fileSize"),
});

export type ServerUploadValues = z.infer<typeof serverUploadSchema>;

export const guestSchema = z.object({
    first_name: z
        .string()
        .min(1, "validation.required")
        .max(50, "validation.maxFiftyChars"),

    last_name: z
        .string()
        .min(1, "validation.required")
        .max(50, "validation.maxFiftyChars"),

    table_id: z.string().uuid("validation.invalidId").nullable().optional(),
});

export type GuestFormValues = z.infer<typeof guestSchema>;

const seatSidesSchema = z.object({
    top: z.number().min(0, "validation.positiveOrZero"),
    right: z.number().min(0, "validation.positiveOrZero"),
    bottom: z.number().min(0, "validation.positiveOrZero"),
    left: z.number().min(0, "validation.positiveOrZero"),
});

export type SeatSides = z.infer<typeof seatSidesSchema>;

export const tableSchema = z
    .object({
        number: z.number().min(1, "validation.required"),

        seats: z.number().min(1, "validation.required"),

        label: z.string().optional(),

        shape: z.enum(["round", "rectangle", "square"]),

        seatSides: seatSidesSchema.optional(),
    })
    .refine(
        (data) => {
            if (data.shape === "round" || !data.seatSides) {
                return true;
            }

            const sum =
                data.seatSides.top +
                data.seatSides.right +
                data.seatSides.bottom +
                data.seatSides.left;

            return sum === data.seats;
        },
        {
            message: "validation.seatsMismatch",
            path: ["seatSides"],
        },
    );

export type TableFormValues = z.infer<typeof tableSchema>;

export const createWeddingSchema = z
    .object({
        groom_name: z
            .string()
            .trim()
            .min(2, "validation.minTwoChars")
            .max(50, "validation.maxFiftyChars"),

        bride_name: z
            .string()
            .trim()
            .min(2, "validation.minTwoChars")
            .max(50, "validation.maxFiftyChars"),

        groom_email: z.string().trim().email("validation.email"),

        bride_email: z
            .string()
            .trim()
            .email("validation.email")
            .optional()
            .or(z.literal("")),

        slug: z
            .string()
            .trim()
            .min(3, "validation.minThreeChars")
            .max(60, "validation.maxSixtyChars")
            .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "validation.invalidSlug"),

        wedding_date: z.string().min(1, "validation.required"),

        theme_hue: z
            .number()
            .min(0, "validation.themeHue")
            .max(360, "validation.themeHue")
            .default(355),

        enable_find_seat: z.boolean().default(true),
        enable_photo_upload: z.boolean().default(true),
        auto_approve_uploads: z.boolean().default(false),

        max_photos_total: z.preprocess(
            (val) =>
                val === "" || val === undefined || Number.isNaN(val) ? undefined : val,
            z
                .number()
                .int("validation.invalidNumber")
                .min(1, "validation.minimumOne")
                .max(10000, "validation.maxPhotosTotal")
                .optional(),
        ),

        max_photos_per_guest: z.preprocess(
            (val) =>
                val === "" || val === undefined || Number.isNaN(val) ? undefined : val,
            z
                .number()
                .int("validation.invalidNumber")
                .min(1, "validation.minimumOne")
                .max(100, "validation.maxPhotosPerGuest")
                .optional(),
        ),

        /*
         * No admin UI sets this today -- when omitted, the action layer
         * defaults it to the selected plan's `storageDays` entitlement
         * (see lib/plans.ts) rather than a fixed number here, so a Basic
         * wedding doesn't get handed more retention than it paid for and
         * an Unlimited one doesn't get handed less. Kept optional (not
         * defaulted here) so the schema can't quietly reintroduce a
         * plan-independent default; still capped at a hard outer bound.
         */
        photo_retention_days: z
            .number()
            .int("validation.invalidNumber")
            .min(1, "validation.minimumOne")
            .max(3650, "validation.maxRetentionDays")
            .optional(),

        // Which plan this wedding was actually sold on, and any a la
        // carte add-ons bought on top of it -- see lib/plans.ts, the
        // single source of truth for what each one unlocks.
        plan: z.enum(PLAN_IDS).default("basic"),
        addons: z.array(z.enum(ADDON_IDS)).default([]),
    })
    .refine((data) => data.enable_find_seat || data.enable_photo_upload, {
        message: "validation.atLeastOneFunction",
        path: ["enable_find_seat"],
    });

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;

export const editWeddingSchema = z
    .object({
        groom_name: z
            .string()
            .trim()
            .min(2, "validation.minTwoChars")
            .max(50, "validation.maxFiftyChars"),

        bride_name: z
            .string()
            .trim()
            .min(2, "validation.minTwoChars")
            .max(50, "validation.maxFiftyChars"),

        groom_email: z.string().trim().email("validation.email"),

        bride_email: z
            .string()
            .trim()
            .email("validation.email")
            .optional()
            .or(z.literal("")),

        wedding_date: z.string().min(1, "validation.required"),

        theme_hue: z
            .number()
            .min(0, "validation.themeHue")
            .max(360, "validation.themeHue"),

        enable_find_seat: z.boolean(),
        enable_photo_upload: z.boolean(),
        auto_approve_uploads: z.boolean(),

        plan: z.enum(PLAN_IDS),
        addons: z.array(z.enum(ADDON_IDS)).default([]),
    })
    .refine((data) => data.enable_find_seat || data.enable_photo_upload, {
        message: "validation.atLeastOneFunction",
        path: ["enable_find_seat"],
    });

export type EditWeddingInput = z.infer<typeof editWeddingSchema>;

/*
 * ============================================
 * RSVP
 * ============================================
 */
export const rsvpStatusEnum = z.enum(["pending", "confirmed", "declined"]);

export type RsvpStatusValue = z.infer<typeof rsvpStatusEnum>;

const rsvpNameSchema = z.object({
    weddingSlug: z
        .string()
        .trim()
        .min(1, "validation.required")
        .max(60, "validation.maxSixtyChars"),

    firstName: z
        .string()
        .trim()
        .min(1, "validation.required")
        .max(50, "validation.maxFiftyChars"),

    lastName: z
        .string()
        .trim()
        .min(1, "validation.required")
        .max(50, "validation.maxFiftyChars"),
});

export const rsvpLookupSchema = rsvpNameSchema;

export type RsvpLookupInput = z.infer<typeof rsvpLookupSchema>;

export const rsvpUpdateSchema = rsvpNameSchema.extend({
    status: rsvpStatusEnum,

    partySize: z.preprocess(
        (val) =>
            val === "" || val === undefined || val === null || Number.isNaN(val)
                ? undefined
                : val,
        z
            .number()
            .int("validation.invalidNumber")
            .min(0, "validation.positiveOrZero")
            .max(50, "validation.maxPartySize")
            .optional(),
    ),

    note: z
        .string()
        .trim()
        .max(500, "validation.messageLength")
        .optional()
        .nullable(),
});

export type RsvpUpdateInput = z.infer<typeof rsvpUpdateSchema>;

export const rsvpManualUpdateSchema = z.object({
    guestId: z.string().uuid("validation.invalidId"),
    status: rsvpStatusEnum,

    partySize: z.preprocess(
        (val) =>
            val === "" || val === undefined || val === null || Number.isNaN(val)
                ? undefined
                : val,
        z
            .number()
            .int("validation.invalidNumber")
            .min(0, "validation.positiveOrZero")
            .max(50, "validation.maxPartySize")
            .optional()
            .nullable(),
    ),

    note: z
        .string()
        .trim()
        .max(500, "validation.messageLength")
        .optional()
        .nullable(),
});

export type RsvpManualUpdateInput = z.infer<typeof rsvpManualUpdateSchema>;

/*
 * Public personal-link RSVP submission (/{locale}/{slug}/g/{token}).
 * Same status/partySize/note shape as rsvpManualUpdateSchema, but the
 * guest is identified by their high-entropy guest_token instead of a
 * guestId an authenticated actor is trusted to supply -- see
 * getGuestByToken() / submitGuestRsvpByToken() in actions/seating.ts
 * and actions/rsvp.ts.
 */
export const rsvpTokenUpdateSchema = z.object({
    weddingSlug: z
        .string()
        .trim()
        .min(1, "validation.required")
        .max(60, "validation.maxSixtyChars"),

    token: z.string().uuid("validation.invalidId"),

    status: rsvpStatusEnum,

    partySize: z.preprocess(
        (val) =>
            val === "" || val === undefined || val === null || Number.isNaN(val)
                ? undefined
                : val,
        z
            .number()
            .int("validation.invalidNumber")
            .min(0, "validation.positiveOrZero")
            .max(50, "validation.maxPartySize")
            .optional()
            .nullable(),
    ),

    note: z
        .string()
        .trim()
        .max(500, "validation.messageLength")
        .optional()
        .nullable(),
});

export type RsvpTokenUpdateInput = z.infer<typeof rsvpTokenUpdateSchema>;

export const rsvpApiKeyLabelSchema = z.object({
    label: z
        .string()
        .trim()
        .max(60, "validation.maxSixtyChars")
        .optional()
        .or(z.literal("")),
});

export type RsvpApiKeyLabelInput = z.infer<typeof rsvpApiKeyLabelSchema>;
