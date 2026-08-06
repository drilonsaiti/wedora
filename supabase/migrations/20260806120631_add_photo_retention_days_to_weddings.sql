ALTER TABLE public.wedding_settings
    ADD COLUMN IF NOT EXISTS photo_retention_days integer DEFAULT 90;