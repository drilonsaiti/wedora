ALTER TABLE public.tables
    ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'round'
    CHECK (shape IN ('round', 'rectangle', 'square')),
    ADD COLUMN IF NOT EXISTS width integer NOT NULL DEFAULT 128,
    ADD COLUMN IF NOT EXISTS height integer NOT NULL DEFAULT 128;

CREATE TABLE IF NOT EXISTS public.table_seats
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    table_id uuid NOT NULL REFERENCES public.tables
(
    id
) ON DELETE CASCADE,
    seat_index integer NOT NULL,
    relative_x integer NOT NULL,
    relative_y integer NOT NULL,
    UNIQUE
(
    table_id,
    seat_index
)
    );

ALTER TABLE public.guests
    ADD COLUMN IF NOT EXISTS seat_id uuid REFERENCES public.table_seats(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_table_seats_table_id ON public.table_seats(table_id);
CREATE INDEX IF NOT EXISTS idx_guests_seat_id ON public.guests(seat_id);

ALTER TABLE public.table_seats ENABLE ROW LEVEL SECURITY;

DROP
POLICY IF EXISTS "admin_owns_wedding_table_seats" ON public.table_seats;
CREATE
POLICY "admin_owns_wedding_table_seats" ON public.table_seats
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tables t WHERE t.id = table_seats.table_id AND (is_wedding_owner(t.wedding_id) OR is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tables t WHERE t.id = table_seats.table_id AND (is_wedding_owner(t.wedding_id) OR is_admin()))
  );

DROP
POLICY IF EXISTS "public_read_table_seats" ON public.table_seats;
CREATE
POLICY "public_read_table_seats" ON public.table_seats
  FOR
SELECT TO authenticated, anon
    USING (true);