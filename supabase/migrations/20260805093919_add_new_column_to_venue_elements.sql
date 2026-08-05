ALTER TABLE public.venue_elements DROP CONSTRAINT IF EXISTS venue_elements_type_check;

ALTER TABLE public.venue_elements
    ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'MapPin',
    ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'square'
    CHECK (shape IN ('circle', 'square', 'rectangle')),
    ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'gray';

ALTER TABLE public.venue_elements ALTER COLUMN label SET NOT NULL;