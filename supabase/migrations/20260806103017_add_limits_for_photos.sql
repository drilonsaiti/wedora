ALTER TABLE public.wedding_settings
    ADD COLUMN IF NOT EXISTS max_photos_total integer,
    ADD COLUMN IF NOT EXISTS max_photos_per_guest integer;