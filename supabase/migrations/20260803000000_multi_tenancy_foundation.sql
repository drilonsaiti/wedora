-- ============================================
-- MULTI-TENANCY FOUNDATION MIGRATION
-- ============================================

-- 1. Create weddings table
CREATE TABLE public.weddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  groom_name text,
  bride_name text,
  slug text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. Create wedding_settings table
CREATE TABLE public.wedding_settings (
  wedding_id uuid PRIMARY KEY REFERENCES public.weddings(id) ON DELETE CASCADE,
  enable_find_seat boolean NOT NULL DEFAULT false,
  enable_photo_upload boolean NOT NULL DEFAULT false,
  enable_couple_login boolean NOT NULL DEFAULT false,
  theme_color text
);

-- 3. Add nullable wedding_id to scoped tables
ALTER TABLE public.guests ADD COLUMN wedding_id uuid REFERENCES public.weddings(id) ON DELETE CASCADE;
ALTER TABLE public.tables ADD COLUMN wedding_id uuid REFERENCES public.weddings(id) ON DELETE CASCADE;
ALTER TABLE public.venue_elements ADD COLUMN wedding_id uuid REFERENCES public.weddings(id) ON DELETE CASCADE;
ALTER TABLE public.photos ADD COLUMN wedding_id uuid REFERENCES public.weddings(id) ON DELETE CASCADE;
ALTER TABLE public.gallery_tokens ADD COLUMN wedding_id uuid REFERENCES public.weddings(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD COLUMN wedding_id uuid REFERENCES public.weddings(id) ON DELETE CASCADE;

-- 4. Create the initial default wedding and backfill
DO $$
DECLARE
    v_admin_id uuid;
    v_wedding_id uuid;
BEGIN
    -- Try to find the first admin
    SELECT id INTO v_admin_id FROM public.admins LIMIT 1;
    
    -- If no admin exists yet, we'll need to handle it or wait for one.
    -- Assuming one exists for the current live wedding.
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO public.weddings (owner_user_id, groom_name, bride_name, slug)
        VALUES (v_admin_id, 'Sarah', 'Drilon', 'sara-drilon')
        RETURNING id INTO v_wedding_id;
        
        INSERT INTO public.wedding_settings (wedding_id) VALUES (v_wedding_id);

        -- Backfill existing rows
        UPDATE public.guests SET wedding_id = v_wedding_id;
        UPDATE public.tables SET wedding_id = v_wedding_id;
        UPDATE public.venue_elements SET wedding_id = v_wedding_id;
        UPDATE public.photos SET wedding_id = v_wedding_id;
        UPDATE public.gallery_tokens SET wedding_id = v_wedding_id;
        UPDATE public.events SET wedding_id = v_wedding_id;
    END IF;
END $$;

-- 5. Enforce NOT NULL
-- (Note: Only if we successfully backfilled. If this is a fresh DB, these might fail if rows exist without wedding_id)
ALTER TABLE public.guests ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.tables ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.venue_elements ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.photos ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.gallery_tokens ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE public.weddings
    ADD COLUMN IF NOT EXISTS groom_email text,
    ADD COLUMN IF NOT EXISTS bride_email text;

-- 6. Performance Indexes
CREATE INDEX guests_wedding_id_idx ON public.guests (wedding_id);
CREATE INDEX tables_wedding_id_idx ON public.tables (wedding_id);
CREATE INDEX venue_elements_wedding_id_idx ON public.venue_elements (wedding_id);
CREATE INDEX photos_wedding_id_idx ON public.photos (wedding_id);
CREATE INDEX gallery_tokens_wedding_id_idx ON public.gallery_tokens (wedding_id);
CREATE INDEX events_wedding_id_idx ON public.events (wedding_id);

-- 7. RLS Helper Function
CREATE OR REPLACE FUNCTION public.is_wedding_owner(target_wedding_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.weddings
    WHERE id = target_wedding_id AND owner_user_id = auth.uid()
  );
$$;

-- 7b. Platform admin helper (wrapper around existing public.is_admin())
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.is_admin();
$$;

-- 8. Apply RLS Policies
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_own_wedding" ON public.weddings
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (owner_user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "admins_manage_own_wedding_settings" ON public.wedding_settings
  FOR ALL TO authenticated
  USING (public.is_wedding_owner(wedding_id) OR public.is_platform_admin())
  WITH CHECK (public.is_wedding_owner(wedding_id) OR public.is_platform_admin());

-- Update existing policies to use wedding ownership
DROP POLICY IF EXISTS "Admins can manage tables" ON public.tables;
CREATE POLICY "admin_owns_wedding_tables" ON public.tables
  FOR ALL TO authenticated
  USING (public.is_wedding_owner(wedding_id) OR public.is_platform_admin())
  WITH CHECK (public.is_wedding_owner(wedding_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage guests" ON public.guests;
CREATE POLICY "admin_owns_wedding_guests" ON public.guests
  FOR ALL TO authenticated
  USING (public.is_wedding_owner(wedding_id) OR public.is_platform_admin())
  WITH CHECK (public.is_wedding_owner(wedding_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage venue elements" ON public.venue_elements;
CREATE POLICY "admin_owns_wedding_venue_elements" ON public.venue_elements
  FOR ALL TO authenticated
  USING (public.is_wedding_owner(wedding_id) OR public.is_platform_admin())
  WITH CHECK (public.is_wedding_owner(wedding_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "admin_owns_wedding_events" ON public.events
  FOR ALL TO authenticated
  USING (public.is_wedding_owner(wedding_id) OR public.is_platform_admin())
  WITH CHECK (public.is_wedding_owner(wedding_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can read all photos" ON public.photos;
DROP POLICY IF EXISTS "Admins can update photos" ON public.photos;
DROP POLICY IF EXISTS "Admins can delete photos" ON public.photos;
CREATE POLICY "admin_owns_wedding_photos" ON public.photos
  FOR ALL TO authenticated
  USING (public.is_wedding_owner(wedding_id) OR public.is_platform_admin())
  WITH CHECK (public.is_wedding_owner(wedding_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage gallery tokens" ON public.gallery_tokens;
CREATE POLICY "admin_owns_wedding_gallery_tokens" ON public.gallery_tokens
  FOR ALL TO authenticated
  USING (public.is_wedding_owner(wedding_id) OR public.is_platform_admin())
  WITH CHECK (public.is_wedding_owner(wedding_id) OR public.is_platform_admin());


ALTER TABLE public.weddings
    ADD COLUMN IF NOT EXISTS groom_email text,
    ADD COLUMN IF NOT EXISTS bride_email text,
    ADD COLUMN IF NOT EXISTS wedding_date date;

-- Funksion për RLS të couple-it, bazuar në app_metadata të JWT-së — jo tabelë
CREATE OR REPLACE FUNCTION public.is_couple_for_wedding(target_wedding_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
SELECT
    (auth.jwt() -> 'app_metadata' ->> 'wedding_id')::uuid = target_wedding_id
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'couple';
$$;

DROP POLICY IF EXISTS "couple_read_guests" ON public.guests;
CREATE POLICY "couple_read_guests" ON public.guests
  FOR SELECT TO authenticated
                      USING (
                      is_couple_for_wedding(wedding_id)
                      AND EXISTS (SELECT 1 FROM wedding_settings ws WHERE ws.wedding_id = guests.wedding_id AND ws.enable_couple_login = true)
                      );

DROP POLICY IF EXISTS "couple_read_tables" ON public.tables;
CREATE POLICY "couple_read_tables" ON public.tables
  FOR SELECT TO authenticated
                      USING (
                      is_couple_for_wedding(wedding_id)
                      AND EXISTS (SELECT 1 FROM wedding_settings ws WHERE ws.wedding_id = tables.wedding_id AND ws.enable_couple_login = true)
                      );

DROP POLICY IF EXISTS "couple_read_photos" ON public.photos;
CREATE POLICY "couple_read_photos" ON public.photos
  FOR SELECT TO authenticated
                      USING (
                      is_couple_for_wedding(wedding_id)
                      AND EXISTS (SELECT 1 FROM wedding_settings ws WHERE ws.wedding_id = photos.wedding_id AND ws.enable_couple_login = true)
                      );

DROP POLICY IF EXISTS "couple_delete_photos" ON public.photos;
CREATE POLICY "couple_delete_photos" ON public.photos
  FOR DELETE TO authenticated
  USING (
    is_couple_for_wedding(wedding_id)
    AND EXISTS (SELECT 1 FROM wedding_settings ws WHERE ws.wedding_id = photos.wedding_id AND ws.enable_couple_login = true)
  );