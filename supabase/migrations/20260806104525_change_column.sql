ALTER TABLE public.wedding_settings
    ADD COLUMN IF NOT EXISTS theme_hue integer DEFAULT 355;